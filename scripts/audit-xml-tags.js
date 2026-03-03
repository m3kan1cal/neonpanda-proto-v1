#!/usr/bin/env node

/**
 * Audit XML Tags in DynamoDB Records
 *
 * Scans DynamoDB for records that contain any XML markup embedded in string
 * fields (e.g. "<item>tag-one</item>", "<li>value</li>", "<bullet>...").
 * By default scans all entity types; use --entity-types to restrict.
 *
 * This pattern occurs when an LLM ignores a plain-array instruction and returns
 * XML-wrapped strings instead of clean individual strings. Detection covers any
 * tag name, not just <item>, since models may use <li>, <bullet>, <point>, etc.
 *
 * Usage:
 *   node scripts/audit-xml-tags.js <userId> --table=<tableName>
 *   node scripts/audit-xml-tags.js --all-users --table=<tableName>
 *   node scripts/audit-xml-tags.js --all-users --entity-types=conversationSummary,coachConversation
 *
 * Options:
 *   --table=NAME              DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
 *   --region=REGION           AWS region (default: us-west-2)
 *   --all-users               Scan the entire table instead of a single user
 *   --entity-types=T1,T2,...  Restrict audit to these entity types (default: all)
 *   --verbose                 Show the full offending field values
 *   --json                    Output findings as JSON to stdout
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const DEFAULT_REGION = "us-west-2";

// Matches any XML opening tag, e.g. <item>, <li>, <bullet>, <point>, <entry>
// Intentionally broad — covers any tag name an LLM might substitute for plain strings.
const XML_TAG_PATTERN = /<[a-zA-Z][a-zA-Z0-9_-]*[\s>]/;

// Tag names that are intentional placeholder values in the application, not LLM contamination.
// e.g. programDesignerSession.todoList fields use "<UNKNOWN>" when a value hasn't been captured.
const KNOWN_SAFE_TAG_NAMES = new Set(["UNKNOWN"]);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.info(`
Audit XML Tags in DynamoDB Records

Usage:
  node scripts/audit-xml-tags.js <userId> [options]
  node scripts/audit-xml-tags.js --all-users [options]

Arguments:
  userId                    A single user ID to audit (required unless --all-users is set)

Options:
  --table=NAME              DynamoDB table name (required, or set DYNAMODB_TABLE_NAME env var)
  --region=REGION           AWS region (default: ${DEFAULT_REGION})
  --all-users               Scan the entire table (may be slow for large tables)
  --entity-types=T1,T2,...  Comma-separated list of entity types to audit (default: all)
  --verbose                 Print the full offending field value for each finding
  --json                    Output findings as JSON instead of human-readable text
  --help, -h                Show this help message

Examples:
  node scripts/audit-xml-tags.js 63gocaz-j-AYRsb0094ik
  node scripts/audit-xml-tags.js --all-users --verbose
  node scripts/audit-xml-tags.js --all-users --entity-types=conversationSummary,coachConversation
  node scripts/audit-xml-tags.js --all-users --json > audit-results.json
    `);
    process.exit(0);
  }

  const options = {
    userId: null,
    tableName: process.env.DYNAMODB_TABLE_NAME || null,
    region: DEFAULT_REGION,
    allUsers: false,
    entityTypes: null, // null = all entity types
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
    } else if (arg.startsWith("--entity-types=")) {
      options.entityTypes = new Set(
        arg
          .split("=")[1]
          .split(",")
          .map((t) => t.trim()),
      );
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
 * Query all records for a single user (all entity types).
 */
async function queryUserRecords(docClient, tableName, userId) {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `user#${userId}`,
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const result = await docClient.send(command);
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

/**
 * Full table scan — returns all items regardless of entity type.
 */
async function scanAllRecords(docClient, tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;
  let scanned = 0;

  process.stderr.write("Scanning table");

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await docClient.send(command);
    items.push(...(result.Items || []));
    scanned += result.ScannedCount || 0;
    lastEvaluatedKey = result.LastEvaluatedKey;
    process.stderr.write(".");
  } while (lastEvaluatedKey);

  process.stderr.write(`\nScanned ${scanned} total items\n\n`);

  return items;
}

// ---------------------------------------------------------------------------
// XML detection
// ---------------------------------------------------------------------------

/**
 * Extract all unique XML tag names found in a string.
 * e.g. "\n<item>foo</item>\n<item>bar</item>" → ["item"]
 */
function extractXmlTagNames(str) {
  const matches = str.match(/<([a-zA-Z][a-zA-Z0-9_-]*)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

/**
 * Recursively walk an object/array and collect every string value that contains
 * any XML tag. Returns an array of { path, value, tagNames } findings.
 */
function findXmlTagsInValue(value, path = "") {
  const findings = [];

  if (typeof value === "string") {
    if (XML_TAG_PATTERN.test(value)) {
      findings.push({ path, value, tagNames: extractXmlTagNames(value) });
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
function inspectItem(item, entityTypeFilter) {
  const entityType = item.entityType || "unknown";

  if (entityTypeFilter && !entityTypeFilter.has(entityType)) {
    return null;
  }

  const userId = (item.pk || "").replace("user#", "");
  const sk = item.sk || "";
  const attributes = item.attributes || {};

  const rawFindings = findXmlTagsInValue(attributes, "attributes");

  // Drop findings whose tag names are all known-safe placeholders (e.g. <UNKNOWN>)
  const xmlFindings = rawFindings.filter((f) =>
    f.tagNames.some((tag) => !KNOWN_SAFE_TAG_NAMES.has(tag)),
  );

  if (xmlFindings.length === 0) {
    return null;
  }

  const allTagNames = [...new Set(xmlFindings.flatMap((f) => f.tagNames))];

  return {
    userId,
    pk: item.pk,
    sk,
    entityType,
    findingsCount: xmlFindings.length,
    tagNamesFound: allTagNames,
    fields: xmlFindings.map(({ path, value, tagNames }) => ({
      path,
      tagNames,
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
  console.info(`  Tag names:    ${finding.tagNamesFound.join(", ")}`);

  finding.fields.forEach(({ path, tagNames, preview, fullValue }) => {
    console.info(`\n    Field:    ${path}`);
    console.info(`    Tags:     <${tagNames.join(">, <")}>`);
    const display = verbose ? fullValue : preview;
    console.info(`    Value:    ${display}`);
  });
}

function printReport(findings, options, entityTypeCounts) {
  const totalRecordsAudited = options._totalAudited || 0;
  const totalRecordsScanned = options._totalScanned || 0;

  if (options.json) {
    console.info(
      JSON.stringify(
        {
          totalRecordsScanned,
          totalRecordsAudited,
          totalAffectedRecords: findings.length,
          entityTypeBreakdown: entityTypeCounts,
          findings: findings.map((f) => ({
            userId: f.userId,
            pk: f.pk,
            sk: f.sk,
            entityType: f.entityType,
            findingsCount: f.findingsCount,
            tagNamesFound: f.tagNamesFound,
            fields: f.fields.map(({ path, tagNames, preview }) => ({
              path,
              tagNames,
              preview,
            })),
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

  console.info(`Records scanned:        ${totalRecordsScanned}`);
  console.info(`Records audited:        ${totalRecordsAudited}`);
  console.info(`Records with XML tags:  ${findings.length}`);

  // Always show entity type breakdown so we know what was covered
  if (Object.keys(entityTypeCounts).length > 0) {
    console.info("\nEntity types audited:");
    const sorted = Object.entries(entityTypeCounts).sort(
      ([, a], [, b]) => b - a,
    );
    for (const [type, count] of sorted) {
      const affectedCount = findings.filter(
        (f) => f.entityType === type,
      ).length;
      const marker =
        affectedCount > 0 ? ` ⚠️  (${affectedCount} affected)` : " ✅";
      console.info(`  ${type}: ${count} record(s)${marker}`);
    }
  }

  if (findings.length === 0) {
    console.info("\n✅ No XML-tagged fields found. All records are clean.\n");
    return;
  }

  // Show which XML tag names were found across all records
  const tagFrequency = findings
    .flatMap((f) => f.tagNamesFound)
    .reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

  console.info("\nXML tag names found:");
  Object.entries(tagFrequency)
    .sort(([, a], [, b]) => b - a)
    .forEach(([tag, count]) => {
      console.info(`  <${tag}>: ${count} record(s)`);
    });

  // Show which fields are most commonly affected
  const fieldFrequency = findings
    .flatMap((f) => f.fields.map(({ path }) => path))
    .reduce((acc, path) => {
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {});

  console.info("\nMost affected fields:");
  Object.entries(fieldFrequency)
    .sort(([, a], [, b]) => b - a)
    .forEach(([path, count]) => {
      console.info(`  ${path}: ${count} occurrence(s)`);
    });

  console.info("\n----------------------------------------");
  console.info("  AFFECTED RECORDS");
  console.info("----------------------------------------");

  findings.forEach((finding) => printFinding(finding, options.verbose));

  console.info("\n========================================");
  console.info("  NEXT STEPS");
  console.info("========================================\n");

  console.info("Re-run with --verbose to see the full field values.");
  console.info(
    "Re-run with --json to get machine-readable output for further analysis.\n",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();

  if (!options.userId && !options.allUsers) {
    console.error("❌ Error: provide a userId or --all-users");
    console.error("   Usage: node scripts/audit-xml-tags.js <userId>");
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
    console.info("  XML TAG AUDIT");
    console.info("========================================\n");

    console.info("Configuration:");
    console.info(`  Table:         ${options.tableName}`);
    console.info(`  Region:        ${options.region}`);
    console.info(
      `  Scope:         ${options.allUsers ? "all users (full table scan)" : `user ${options.userId}`}`,
    );
    console.info(
      `  Entity types:  ${options.entityTypes ? [...options.entityTypes].join(", ") : "all"}`,
    );
    console.info(`  Verbose:       ${options.verbose}`);
    console.info("");
  }

  const docClient = getDynamoDBClient(options.region);

  let items;
  if (options.allUsers) {
    items = await scanAllRecords(docClient, options.tableName);
  } else {
    if (!options.json) {
      console.info(`Querying all records for user: ${options.userId}...`);
    }
    items = await queryUserRecords(
      docClient,
      options.tableName,
      options.userId,
    );
    if (!options.json) {
      console.info(`Found ${items.length} records\n`);
    }
  }

  options._totalScanned = items.length;

  // Count records per entity type (before filtering) for the breakdown
  const entityTypeCounts = items.reduce((acc, item) => {
    const et = item.entityType || "unknown";
    if (!options.entityTypes || options.entityTypes.has(et)) {
      acc[et] = (acc[et] || 0) + 1;
    }
    return acc;
  }, {});

  // Apply entity type filter if specified
  const targeted = options.entityTypes
    ? items.filter((item) =>
        options.entityTypes.has(item.entityType || "unknown"),
      )
    : items;

  options._totalAudited = targeted.length;

  const findings = targeted.reduce((acc, item) => {
    const finding = inspectItem(item, options.entityTypes);
    if (finding) acc.push(finding);
    return acc;
  }, []);

  printReport(findings, options, entityTypeCounts);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error.message);
  process.exit(1);
});
