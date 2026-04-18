#!/usr/bin/env npx tsx

/**
 * Export User DynamoDB Records Script
 *
 * Queries every item for a member using the standard partition key pattern
 * pk = "user#${userId}" (same as delete-user-dynamodb.js) and writes a single
 * JSON file with metadata plus all raw records.
 *
 * Usage:
 *   npx tsx scripts/export-user-dynamodb.ts <userId> --table=<tableName> [options]
 *
 * Options:
 *   --table=NAME       DynamoDB table (required, or DYNAMODB_TABLE_NAME)
 *   --region=REGION    AWS region (default: us-west-2)
 *   --output=PATH      Output file (default: ./exports/dynamodb-user-<userId>-<iso>.json)
 *   --format=json      Output shape: json (default) or jsonl (one item per line)
 *   --verbose          Log pagination progress
 *   --help, -h         Show help
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const DEFAULT_REGION = "us-west-2";

interface ExportMeta {
  userId: string;
  pk: string;
  tableName: string;
  region: string;
  exportedAt: string;
  recordCount: number;
  countsByEntityType: Record<string, number>;
}

interface ExportDocument {
  meta: ExportMeta;
  records: Record<string, unknown>[];
}

interface Config {
  userId: string;
  tableName: string;
  region: string;
  outputPath: string;
  format: "json" | "jsonl";
  verbose: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.info(`
Export User DynamoDB Records

Usage:
  npx tsx scripts/export-user-dynamodb.ts <userId> --table=<tableName> [options]

Arguments:
  userId Member id (pk will be user#\${userId})

Options:
  --table=NAME       DynamoDB table (required, or DYNAMODB_TABLE_NAME)
  --region=REGION    AWS region (default: ${DEFAULT_REGION})
  --output=PATH      Output file (default: ./exports/dynamodb-user-<userId>-<timestamp>.json)
  --format=json|jsonl  json (wrapped document with meta) or jsonl (one item/line, no meta file)
  --verbose          Log each query page
  --help, -h         This message

Examples:
  npx tsx scripts/export-user-dynamodb.ts 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2
  npx tsx scripts/export-user-dynamodb.ts 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2 --format=jsonl --output=./user.jsonl
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const userId = args[0];
  if (!userId || userId.startsWith("--")) {
    console.error("Error: userId is required as the first argument");
    process.exit(1);
  }

  const cfg: Config = {
    userId,
    tableName: process.env.DYNAMODB_TABLE_NAME ?? "",
    region: DEFAULT_REGION,
    outputPath: "",
    format: "json",
    verbose: false,
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--table=")) {
      cfg.tableName = arg.slice("--table=".length);
    } else if (arg.startsWith("--region=")) {
      cfg.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--output=")) {
      cfg.outputPath = arg.slice("--output=".length);
    } else if (arg.startsWith("--format=")) {
      const f = arg.slice("--format=".length).toLowerCase();
      if (f !== "json" && f !== "jsonl") {
        console.error('Error: --format must be "json" or "jsonl"');
        process.exit(1);
      }
      cfg.format = f;
    } else if (arg === "--verbose") {
      cfg.verbose = true;
    }
  }

  if (!cfg.tableName) {
    console.error(
      "Error: table name required (--table= or DYNAMODB_TABLE_NAME)",
    );
    process.exit(1);
  }

  if (!cfg.outputPath) {
    const safeId = userId.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    cfg.outputPath = join(
      scriptDir,
      "..",
      "exports",
      `dynamodb-user-${safeId}-${stamp}.${cfg.format === "jsonl" ? "jsonl" : "json"}`,
    );
  }

  return cfg;
}

function getDocClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
}

function countsByEntityType(
  items: Record<string, unknown>[],
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const item of items) {
    const t =
      typeof item.entityType === "string"
        ? item.entityType
        : "MISSING_ENTITY_TYPE";
    m[t] = (m[t] ?? 0) + 1;
  }
  return m;
}

function sortRecords(
  items: Record<string, unknown>[],
): Record<string, unknown>[] {
  return [...items].sort((a, b) => {
    const ta =
      typeof a.entityType === "string" ? a.entityType : "MISSING_ENTITY_TYPE";
    const tb =
      typeof b.entityType === "string" ? b.entityType : "MISSING_ENTITY_TYPE";
    if (ta !== tb) return ta.localeCompare(tb);
    const ska = typeof a.sk === "string" ? a.sk : "";
    const skb = typeof b.sk === "string" ? b.sk : "";
    return ska.localeCompare(skb);
  });
}

async function queryAllForUser(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  verbose: boolean,
): Promise<Record<string, unknown>[]> {
  const pk = `user#${userId}`;
  const all: Record<string, unknown>[] = [];
  let lastKey: QueryCommandOutput["LastEvaluatedKey"] | undefined;
  let page = 0;

  do {
    page += 1;
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    );
    if (result.Items?.length) {
      all.push(...(result.Items as Record<string, unknown>[]));
    }
    if (verbose) {
      console.info(
        `Page ${page}: +${result.Items?.length ?? 0} items (total ${all.length})`,
      );
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return all;
}

function ensureDir(path: string) {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
}

async function main() {
  const cfg = parseArgs();

  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    console.warn(
      "Warning: No AWS_ACCESS_KEY_ID or AWS_PROFILE in env; ensure credentials are configured.",
    );
  }

  const docClient = getDocClient(cfg.region);
  const pk = `user#${cfg.userId}`;

  console.info(`Querying ${cfg.tableName} pk=${pk} (${cfg.region})...`);
  const raw = await queryAllForUser(
    docClient,
    cfg.tableName,
    cfg.userId,
    cfg.verbose,
  );
  const records = sortRecords(raw);
  const counts = countsByEntityType(records);

  ensureDir(cfg.outputPath);

  if (cfg.format === "jsonl") {
    const lines = records.map((r) => JSON.stringify(r));
    writeFileSync(cfg.outputPath, `${lines.join("\n")}\n`, "utf8");
  } else {
    const doc: ExportDocument = {
      meta: {
        userId: cfg.userId,
        pk,
        tableName: cfg.tableName,
        region: cfg.region,
        exportedAt: new Date().toISOString(),
        recordCount: records.length,
        countsByEntityType: counts,
      },
      records,
    };
    writeFileSync(cfg.outputPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  }

  console.info(`Wrote ${records.length} records to ${cfg.outputPath}`);
  if (cfg.format === "json") {
    console.info("Counts by entityType:", counts);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
