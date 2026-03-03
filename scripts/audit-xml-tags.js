#!/usr/bin/env node

/**
 * Audit XML Tags in Coach Conversation Records
 *
 * Scans DynamoDB for coachConversation and conversationSummary records that contain
 * XML <item> markup (e.g. "<item>tag-one</item>") embedded in string fields. This
 * happens when Claude ignores the plain-array instruction for conversation_tags and
 * returns XML-wrapped strings instead of clean individual strings.
 *
 * Checked fields:
 *   - conversationSummary: attributes.structuredData.conversation_tags
 *   - coachConversation:   attributes.metadata.tags
 *   - Any other string array field found to contain <item> patterns (deep scan)
 *
 * Usage:
 *   node scripts/audit-xml-tags.js <userId> --table=<tableName>
 *   node scripts/audit-xml-tags.js --all-users --table=<tableName>
 *   node scripts/audit-xml-tags.js 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2
 *
 * Options:
 *   --table=NAME      DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION   AWS region (default: us-west-2)
 *   --all-users       Scan the entire table instead of a single user (slow for large tables)
 *   --verbose         Show the full offending field values
 *   --json            Output findings as JSON to stdout
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const DEFAULT_REGION = "us-west-2";
const TARGET_ENTITY_TYPES = new Set([
  "coachConversation",
  "conversationSummary",
]);
const XML_ITEM_PATTERN = /<item>/;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Audit XML Tags in Coach Conversation Records

Usage:
  node scripts/audit-xml-tags.js <userId> [options]
  node scripts/audit-xml-tags.js --all-users [options]

Arguments:
  userId          A single user ID to audit (required unless --all-users is set)

Options:
  --table=NAME    DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
  --region=REGION AWS region (default: ${DEFAULT_REGION})
  --all-users     Scan the entire table (may be slow for large tables)
  --verbose       Print the full offending field value for each finding
  --json          Output findings as JSON instead of human-readable text
  --help, -h      Show this help message

Examples:
  node scripts/audit-xml-tags.js 63gocaz-j-AYRsb0094ik --table=NeonPanda-ProtoApi-AllItems-V2
  node scripts/audit-xml-tags.js --all-users --table=NeonPanda-ProtoApi-AllItems-V2 --verbose
  node scripts/audit-xml-tags.js --all-users --table=NeonPanda-ProtoApi-AllItems-V2 --json
    `);
    process.exit(0);
  }

  const options = {
    userId: null,
    tableName: process.env.DYNAMODB_TABLE_NAME || null,
    region: DEFAULT_REGION,
    allUsers: false,
    verbose: false,
    json: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--table=")) {
      options.tableName = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    } else if (arg === "--all-users") {
      options.allUsers = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (!arg.startsWith("--") && !options.userId) {
      options.userId = arg;
    }
  }

  return options;
}

// ---------------------------------------------------------------------------
// DynamoDB helpers
// ---------------------------------------------------------------------------

function getDynamoDBClient(region) {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
}

/**
 * Query all coachConversation + conversationSummary records for a single user.
 */
async function queryUserConversationRecords(docClient, tableName, userId) {
  const items = [];
  const skPrefixes = ["coachConversation#", "conversation#"];

  for (const prefix of skPrefixes) {
    let lastEvaluatedKey = undefined;
    do {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `user#${userId}`,
          ":skPrefix": prefix,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });
      const result = await docClient.send(command);
      items.push(...(result.Items || []));
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
  }

  return items;
}

/**
 * Scan the entire table and return only coachConversation + conversationSummary items.
 */
async function scanAllConversationRecords(docClient, tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;
  let scanned = 0;

  process.stderr.write("Scanning table");

  do {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: "entityType = :et1 OR entityType = :et2",
      ExpressionAttributeValues: {
        ":et1": "coachConversation",
        ":et2": "conversationSummary",
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await docClient.send(command);
    items.push(...(result.Items || []));
    scanned += result.ScannedCount || 0;
    lastEvaluatedKey = result.LastEvaluatedKey;
    process.stderr.write(".");
  } while (lastEvaluatedKey);

  process.stderr.write(
    `\nScanned ${scanned} total items, found ${items.length} conversation records\n\n`,
  );

  return items;
}

// ---------------------------------------------------------------------------
// XML detection
// ---------------------------------------------------------------------------

/**
 * Recursively walk an object/array and collect every string value that contains
 * an <item> tag. Returns an array of { path, value } findings.
 */
function findXmlTagsInValue(value, path = "") {
  const findings = [];

  if (typeof value === "string") {
    if (XML_ITEM_PATTERN.test(value)) {
      findings.push({ path, value });
    }
  } else if (Array.isArray(value)) {
    value.forEach((element, index) => {
      findings.push(...findXmlTagsInValue(element, `${path}[${index}]`));
    });
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      findings.push(
        ...findXmlTagsInValue(child, path ? `${path}.${key}` : key),
      );
    }
  }

  return findings;
}

/**
 * Inspect a single DynamoDB item and return a finding object if XML tags are present.
 */
function inspectItem(item) {
  const entityType = item.entityType || "unknown";

  // Only audit targeted entity types
  if (!TARGET_ENTITY_TYPES.has(entityType)) {
    return null;
  }

  const userId = (item.pk || "").replace("user#", "");
  const sk = item.sk || "";
  const attributes = item.attributes || {};

  const xmlFindings = findXmlTagsInValue(attributes, "attributes");

  if (xmlFindings.length === 0) {
    return null;
  }

  return {
    userId,
    pk: item.pk,
    sk,
    entityType,
    findingsCount: xmlFindings.length,
    fields: xmlFindings.map(({ path, value }) => ({
      path,
      preview: value.length > 120 ? value.substring(0, 120) + "..." : value,
      fullValue: value,
    })),
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printFinding(finding, verbose) {
  console.info(`\n  ─── ${finding.entityType} ───────────────────────────`);
  console.info(`  User:  ${finding.userId}`);
  console.info(`  SK:    ${finding.sk}`);
  console.info(`  Issues found: ${finding.findingsCount}`);

  finding.fields.forEach(({ path, preview, fullValue }) => {
    console.info(`\n    Field: ${path}`);
    const display = verbose ? fullValue : preview;
    console.info(`    Value: ${display}`);
  });
}

function printReport(findings, options) {
  const totalRecordsAudited = options._totalAudited || 0;

  if (options.json) {
    console.info(
      JSON.stringify(
        {
          totalRecordsAudited,
          totalAffectedRecords: findings.length,
          findings: findings.map((f) => ({
            userId: f.userId,
            pk: f.pk,
            sk: f.sk,
            entityType: f.entityType,
            findingsCount: f.findingsCount,
            fields: f.fields.map(({ path, preview }) => ({ path, preview })),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.info("\n========================================");
  console.info("  XML TAG AUDIT RESULTS");
  console.info("========================================\n");

  console.info(`Records audited:        ${totalRecordsAudited}`);
  console.info(`Records with XML tags:  ${findings.length}`);

  if (findings.length === 0) {
    console.info("\n✅ No XML-tagged fields found. All records are clean.\n");
    return;
  }

  // Group by entityType for summary
  const byType = findings.reduce((acc, f) => {
    acc[f.entityType] = (acc[f.entityType] || 0) + 1;
    return acc;
  }, {});

  console.info("\nBreakdown by entity type:");
  for (const [type, count] of Object.entries(byType)) {
    console.info(`  ${type}: ${count} record(s)`);
  }

  console.info("\n----------------------------------------");
  console.info("  AFFECTED RECORDS");
  console.info("----------------------------------------");

  findings.forEach((finding) => printFinding(finding, options.verbose));

  console.info("\n========================================");
  console.info("  NEXT STEPS");
  console.info("========================================\n");

  console.info("The fix has already been deployed to new records via the");
  console.info(
    "parseConversationTags() call now wired into the v2 parse path.",
  );
  console.info("");
  console.info(
    "For the affected records above, the structuredData.conversation_tags",
  );
  console.info("field needs to be re-parsed and re-saved. Options:");
  console.info(
    "  1. Re-run the build-conversation-summary Lambda for each conversation",
  );
  console.info("     to regenerate the summary with clean tags.");
  console.info(
    "  2. Write a targeted repair script that reads each affected record,",
  );
  console.info("     strips the <item> markup inline, and writes it back.");
  console.info("");
  console.info(
    "Re-run with --verbose to see the full field values for each record.\n",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();

  if (!options.userId && !options.allUsers) {
    console.error("❌ Error: provide a userId or --all-users");
    console.error(
      "   Usage: node scripts/audit-xml-tags.js <userId> --table=<tableName>",
    );
    process.exit(1);
  }

  if (!options.tableName) {
    console.error("❌ Error: table name is required");
    console.error(
      "   Provide --table=<tableName> or set DYNAMODB_TABLE_NAME env var",
    );
    process.exit(1);
  }

  if (!options.json) {
    console.info("\n========================================");
    console.info("  XML TAG AUDIT — COACH CONVERSATIONS");
    console.info("========================================\n");

    console.info("Configuration:");
    console.info(`  Table:   ${options.tableName}`);
    console.info(`  Region:  ${options.region}`);
    console.info(
      `  Scope:   ${options.allUsers ? "all users (full table scan)" : `user ${options.userId}`}`,
    );
    console.info(`  Verbose: ${options.verbose}`);
    console.info("");
  }

  const docClient = getDynamoDBClient(options.region);

  let items;
  if (options.allUsers) {
    items = await scanAllConversationRecords(docClient, options.tableName);
  } else {
    if (!options.json) {
      console.info(`Querying records for user: ${options.userId}...`);
    }
    items = await queryUserConversationRecords(
      docClient,
      options.tableName,
      options.userId,
    );
    if (!options.json) {
      console.info(`Found ${items.length} conversation records\n`);
    }
  }

  // Filter to targeted entity types and inspect each
  const targeted = items.filter((item) =>
    TARGET_ENTITY_TYPES.has(item.entityType),
  );

  const findings = targeted.reduce((acc, item) => {
    const finding = inspectItem(item);
    if (finding) acc.push(finding);
    return acc;
  }, []);

  options._totalAudited = targeted.length;

  printReport(findings, options);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
