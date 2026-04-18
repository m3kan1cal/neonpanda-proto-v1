#!/usr/bin/env npx tsx

/**
 * Export User DynamoDB Records (plain text)
 *
 * DynamoDB layout (see amplify/dynamodb/* and resource.ts):
 * - Base table PK/SK: pk + sk. Most per-user entities use pk = user#<userId>.
 * - Exception: shared programs use pk = sharedProgram#<sharedProgramId> with
 *   gsi1pk = user#<creatorUserId> (amplify/dynamodb/shared-program.ts).
 *
 * This script queries pk = user#<userId> by default. Pass --include-shared-programs
 * to also pull sharedProgram items the user created via GSI1.
 *
 * Usage:
 *   npx tsx scripts/export-user-dynamodb.ts <userId> --table=TABLE --profile=PROFILE [options]
 *
 * Options:
 *   --table=NAME     DynamoDB table (required, or DYNAMODB_TABLE_NAME)
 *   --profile=NAME   AWS profile (required unless AWS_PROFILE is already set)
 *   --region=REGION  AWS region (default: us-west-2)
 *   --output=PATH    Output .txt file (default: ./exports/dynamodb-user-<userId>-<iso>.txt)
 *   --include-shared-programs  Also query GSI1 for sharedProgram# rows for this user
 *   --verbose        Log each query page
 *   --help, -h
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

interface Config {
  userId: string;
  tableName: string;
  profile: string;
  region: string;
  outputPath: string;
  includeSharedPrograms: boolean;
  verbose: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.info(`
Export User DynamoDB Records (plain text)

Usage:
  npx tsx scripts/export-user-dynamodb.ts <userId> --table=<tableName> --profile=<profile> [options]

Arguments:
  userId   Member id (queries pk = user#\${userId} on the base table)

Options:
  --table=NAME       DynamoDB table (required, or DYNAMODB_TABLE_NAME)
  --profile=NAME     AWS profile (required unless AWS_PROFILE is set in the environment)
  --region=REGION    AWS region (default: ${DEFAULT_REGION})
  --output=PATH      Output file (default: ./exports/dynamodb-user-<userId>-<timestamp>.txt)
  --include-shared-programs   Also load sharedProgram items this user created (GSI1)
  --verbose          Log each query page
  --help, -h         This message

Examples:
  npx tsx scripts/export-user-dynamodb.ts 63gocaz-j-AYRsb0094ik \\
    --table=NeonPanda-ProtoApi-AllItems-V2 --profile=midgard-sandbox
  npx tsx scripts/export-user-dynamodb.ts 63gocaz-j-AYRsb0094ik \\
    --table=NeonPanda-ProtoApi-AllItems-V2 --profile=midgard-sandbox --include-shared-programs
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
    profile: "",
    region: DEFAULT_REGION,
    outputPath: "",
    includeSharedPrograms: false,
    verbose: false,
  };

  for (const arg of args.slice(1)) {
    if (arg.startsWith("--table=")) {
      cfg.tableName = arg.slice("--table=".length);
    } else if (arg.startsWith("--profile=")) {
      cfg.profile = arg.slice("--profile=".length);
    } else if (arg.startsWith("--region=")) {
      cfg.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--output=")) {
      cfg.outputPath = arg.slice("--output=".length);
    } else if (arg === "--include-shared-programs") {
      cfg.includeSharedPrograms = true;
    } else if (arg === "--verbose") {
      cfg.verbose = true;
    }
  }

  const profile = cfg.profile || process.env.AWS_PROFILE || "";
  if (!profile) {
    console.error(
      "Error: AWS profile required (--profile=NAME or set AWS_PROFILE)",
    );
    process.exit(1);
  }
  cfg.profile = profile;

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
      `dynamodb-user-${safeId}-${stamp}.txt`,
    );
  }

  return cfg;
}

function getDocClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
}

function itemKey(item: Record<string, unknown>): string {
  const pk = typeof item.pk === "string" ? item.pk : "";
  const sk = typeof item.sk === "string" ? item.sk : "";
  return `${pk}\0${sk}`;
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
    const pa = typeof a.pk === "string" ? a.pk : "";
    const pb = typeof b.pk === "string" ? b.pk : "";
    if (pa !== pb) return pa.localeCompare(pb);
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

async function queryPkUser(
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
        `[base table pk=${pk}] page ${page}: +${result.Items?.length ?? 0} (total ${all.length})`,
      );
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return all;
}

/** Shared programs: pk is sharedProgram#id; creators are indexed on GSI1. */
async function querySharedProgramsForCreator(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  verbose: boolean,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let lastKey: QueryCommandOutput["LastEvaluatedKey"] | undefined;
  let page = 0;

  do {
    page += 1;
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "gsi1",
        KeyConditionExpression:
          "gsi1pk = :gsi1pk AND begins_with(gsi1sk, :gsi1skPrefix)",
        FilterExpression: "#entityType = :entityType",
        ExpressionAttributeNames: { "#entityType": "entityType" },
        ExpressionAttributeValues: {
          ":gsi1pk": `user#${userId}`,
          ":gsi1skPrefix": "sharedProgram#",
          ":entityType": "sharedProgram",
        },
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    );
    if (result.Items?.length) {
      all.push(...(result.Items as Record<string, unknown>[]));
    }
    if (verbose) {
      console.info(
        `[gsi1 sharedProgram] page ${page}: +${result.Items?.length ?? 0} (total ${all.length})`,
      );
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return all;
}

function mergeDeduped(
  primary: Record<string, unknown>[],
  extra: Record<string, unknown>[],
): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const item of [...primary, ...extra]) {
    const k = itemKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function buildTextFile(
  cfg: Config,
  records: Record<string, unknown>[],
  counts: Record<string, number>,
): string {
  const lines: string[] = [
    "NeonPanda DynamoDB export",
    `userId: ${cfg.userId}`,
    `baseTablePk: user#${cfg.userId}`,
    `table: ${cfg.tableName}`,
    `region: ${cfg.region}`,
    `profile: ${cfg.profile}`,
    `exportedAt: ${new Date().toISOString()}`,
    `recordCount: ${records.length}`,
    `includeSharedPrograms: ${cfg.includeSharedPrograms}`,
    "",
    "countsByEntityType:",
    ...Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, n]) => `  ${type}: ${n}`),
    "",
    "Notes:",
    "  Most items for this member use pk=user#<userId> on the base table.",
    "  Shared programs live under pk=sharedProgram#<id>; with --include-shared-programs,",
    "  creator-owned copies are also loaded via GSI1 (same pattern as queryUserSharedPrograms).",
    "",
  ];

  let i = 0;
  for (const rec of records) {
    i += 1;
    const et =
      typeof rec.entityType === "string"
        ? rec.entityType
        : "MISSING_ENTITY_TYPE";
    const pk = typeof rec.pk === "string" ? rec.pk : "";
    const sk = typeof rec.sk === "string" ? rec.sk : "";
    lines.push(
      "================================================================================",
    );
    lines.push(`Record ${i} / ${records.length}`);
    lines.push(`entityType: ${et}`);
    lines.push(`pk: ${pk}`);
    lines.push(`sk: ${sk}`);
    lines.push(
      "--------------------------------------------------------------------------------",
    );
    lines.push(JSON.stringify(rec, null, 2));
    lines.push("");
  }

  return lines.join("\n");
}

function ensureDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

async function main() {
  const cfg = parseArgs();
  process.env.AWS_PROFILE = cfg.profile;

  const docClient = getDocClient(cfg.region);

  console.info(
    `Querying ${cfg.tableName} (profile=${cfg.profile}, region=${cfg.region})...`,
  );

  const fromUserPk = await queryPkUser(
    docClient,
    cfg.tableName,
    cfg.userId,
    cfg.verbose,
  );

  let combined = fromUserPk;
  if (cfg.includeSharedPrograms) {
    const shared = await querySharedProgramsForCreator(
      docClient,
      cfg.tableName,
      cfg.userId,
      cfg.verbose,
    );
    combined = mergeDeduped(fromUserPk, shared);
    if (cfg.verbose) {
      console.info(
        `Merged: ${fromUserPk.length} from user pk + ${shared.length} from GSI1 sharedProgram => ${combined.length} unique`,
      );
    }
  }

  const records = sortRecords(combined);
  const counts = countsByEntityType(records);
  const body = buildTextFile(cfg, records, counts);

  ensureDir(cfg.outputPath);
  writeFileSync(cfg.outputPath, body, "utf8");

  console.info(`Wrote ${records.length} records to ${cfg.outputPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
