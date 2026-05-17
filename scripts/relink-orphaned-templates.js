#!/usr/bin/env node

/**
 * Relink Orphaned Program Templates
 *
 * Repairs program templates left in an "orphaned" state by the
 * "Processing…" bug — status === "completed" with linkedWorkoutId
 * still null. For each orphan:
 *   - exactly 1 workout exists with the matching templateId → relink it.
 *   - 0 workouts exist → revert the template (status → "pending",
 *     completedAt → null, walk back program stats so adherence reflects
 *     reality).
 *   - >1 workouts exist → log and skip (operator must pick).
 *
 * Usage:
 *   node scripts/relink-orphaned-templates.js \
 *     --user-id=USER_ID --program-id=PROGRAM_ID \
 *     --table=NAME --bucket=NAME [--region=us-west-2] [--apply]
 *
 * Defaults to dry-run. Pass --apply to commit changes.
 */

import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const DEFAULT_REGION = "us-west-2";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    userId: null,
    programId: null,
    tableName: process.env.DYNAMODB_TABLE_NAME || null,
    bucketName: process.env.APPS_BUCKET_NAME || null,
    region: DEFAULT_REGION,
    apply: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--user-id=")) {
      options.userId = arg.split("=")[1];
    } else if (arg.startsWith("--program-id=")) {
      options.programId = arg.split("=")[1];
    } else if (arg.startsWith("--table=")) {
      options.tableName = arg.split("=")[1];
    } else if (arg.startsWith("--bucket=")) {
      options.bucketName = arg.split("=")[1];
    } else if (arg.startsWith("--region=")) {
      options.region = arg.split("=")[1];
    } else if (arg === "--apply") {
      options.apply = true;
    }
  }

  return options;
}

function requireArg(value, name) {
  if (!value) {
    console.error(`Error: --${name} is required`);
    process.exit(1);
  }
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

async function getProgram(docClient, tableName, userId, programId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `user#${userId}`,
        sk: `program#${programId}`,
      },
    }),
  );
  return result.Item || null;
}

async function getProgramDetails(s3Client, bucket, s3DetailKey) {
  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: s3DetailKey }),
  );
  const body = await streamToString(result.Body);
  return JSON.parse(body);
}

async function putProgramDetails(s3Client, bucket, s3DetailKey, details) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3DetailKey,
      Body: JSON.stringify(details),
      ContentType: "application/json",
    }),
  );
}

async function queryWorkoutsByTemplate(docClient, tableName, templateId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :gsi2pk",
      ExpressionAttributeValues: {
        ":gsi2pk": `template#${templateId}`,
      },
    }),
  );
  return result.Items || [];
}

// Mirrors `getPrimaryTemplateId` in
// amplify/functions/libs/program/template-linking.ts. Kept inline so the
// script doesn't import TS source. If the rule changes there, change it
// here too.
function getPrimaryTemplateId(dayTemplates) {
  if (dayTemplates.length === 0) return undefined;
  if (dayTemplates.length === 1) return dayTemplates[0].templateId;

  const hasExplicit = dayTemplates.some(
    (t) => t.sessionRole === "primary" || t.sessionRole === "optional",
  );
  if (hasExplicit) {
    const explicit = dayTemplates.find((t) => t.sessionRole === "primary");
    if (explicit) return explicit.templateId;
  }
  const sorted = [...dayTemplates].sort((a, b) =>
    a.templateId.localeCompare(b.templateId),
  );
  return sorted[0]?.templateId;
}

async function relinkTemplate(
  s3Client,
  bucket,
  s3DetailKey,
  programDetails,
  template,
  workoutId,
  apply,
) {
  if (!apply) {
    console.info(
      `   [DRY RUN] Would relink template ${template.templateId} → workout ${workoutId}`,
    );
    return;
  }
  const idx = programDetails.workoutTemplates.findIndex(
    (t) => t.templateId === template.templateId,
  );
  programDetails.workoutTemplates[idx].linkedWorkoutId = workoutId;
  await putProgramDetails(s3Client, bucket, s3DetailKey, programDetails);
  console.info(
    `   ✓ Relinked template ${template.templateId} → workout ${workoutId}`,
  );
}

async function revertTemplate(
  docClient,
  s3Client,
  tableName,
  bucket,
  s3DetailKey,
  userId,
  programId,
  programDetails,
  template,
  apply,
) {
  const dayNumber = template.dayNumber;
  const dayTemplates = programDetails.workoutTemplates.filter(
    (t) => t.dayNumber === dayNumber,
  );
  const primaryId = getPrimaryTemplateId(dayTemplates);
  const isPrimary = primaryId === template.templateId;

  if (!apply) {
    console.info(
      `   [DRY RUN] Would revert template ${template.templateId} (day ${dayNumber}, isPrimary=${isPrimary}) → status pending, walk back program stats`,
    );
    return;
  }

  const idx = programDetails.workoutTemplates.findIndex(
    (t) => t.templateId === template.templateId,
  );
  programDetails.workoutTemplates[idx].status = "pending";
  programDetails.workoutTemplates[idx].completedAt = null;
  programDetails.workoutTemplates[idx].linkedWorkoutId = null;
  await putProgramDetails(s3Client, bucket, s3DetailKey, programDetails);

  // Re-fetch the program from DynamoDB before computing stat deltas.
  // The orphan loop reuses the same in-memory programDetails, but the
  // DynamoDB writes here are absolute SETs — a prior iteration in this
  // run may have already decremented completedWorkouts (etc.), and a
  // stale snapshot would overwrite that correction instead of
  // compounding it (e.g. 2 orphans, starting at 10, both write 9
  // instead of finishing at 8).
  const refreshed = await getProgram(docClient, tableName, userId, programId);
  if (!refreshed) {
    console.warn(
      `   ⚠️ Program disappeared mid-run — skipping DDB revert for ${template.templateId}`,
    );
    return;
  }

  // Walk back DynamoDB program stats. Mirrors revertTemplateStatus in
  // amplify/functions/libs/program/template-linking.ts.
  const programAttrs = refreshed.attributes || {};
  const existingDayStatus = programAttrs.dayCompletionStatus?.[dayNumber];
  const updatedDayStatus = existingDayStatus
    ? {
        ...existingDayStatus,
        ...(isPrimary
          ? { primaryComplete: false }
          : {
              optionalCompleted: Math.max(
                0,
                (existingDayStatus.optionalCompleted ?? 0) - 1,
              ),
            }),
      }
    : undefined;

  const decrementedCompleted = Math.max(
    0,
    (programAttrs.completedWorkouts ?? 0) - 1,
  );
  const dayStillFullyComplete =
    updatedDayStatus !== undefined &&
    updatedDayStatus.primaryComplete &&
    updatedDayStatus.optionalCompleted >= updatedDayStatus.totalOptional;
  const shouldRollbackCurrentDay =
    (programAttrs.currentDay ?? 0) > dayNumber && !dayStillFullyComplete;
  const rolledBackCurrentDay = shouldRollbackCurrentDay
    ? dayNumber
    : programAttrs.currentDay;

  const setExpressions = [
    "attributes.completedWorkouts = :completed",
    "attributes.adherenceRate = :adherence",
    "updatedAt = :updatedAt",
  ];
  const exprValues = {
    ":completed": decrementedCompleted,
    ":adherence":
      programAttrs.totalWorkouts > 0
        ? (decrementedCompleted / programAttrs.totalWorkouts) * 100
        : 0,
    ":updatedAt": new Date().toISOString(),
  };

  if (updatedDayStatus) {
    setExpressions.push(
      `attributes.dayCompletionStatus.#day = :dayStatus`,
    );
    exprValues[":dayStatus"] = updatedDayStatus;
  }
  if (shouldRollbackCurrentDay) {
    setExpressions.push("attributes.currentDay = :currentDay");
    exprValues[":currentDay"] = rolledBackCurrentDay;
  }
  if (
    programAttrs.status === "completed" &&
    rolledBackCurrentDay <= programAttrs.totalDays
  ) {
    setExpressions.push("attributes.#status = :status");
    exprValues[":status"] = "active";
  }

  const exprNames = {};
  if (updatedDayStatus) exprNames["#day"] = String(dayNumber);
  if (
    programAttrs.status === "completed" &&
    rolledBackCurrentDay <= programAttrs.totalDays
  ) {
    exprNames["#status"] = "status";
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: refreshed.pk, sk: refreshed.sk },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeValues: exprValues,
      ...(Object.keys(exprNames).length > 0 && {
        ExpressionAttributeNames: exprNames,
      }),
      ConditionExpression: "attribute_exists(pk)",
    }),
  );
  console.info(
    `   ✓ Reverted template ${template.templateId} (day ${dayNumber})`,
  );
}

async function main() {
  const opts = parseArgs();
  requireArg(opts.userId, "user-id");
  requireArg(opts.programId, "program-id");
  requireArg(opts.tableName, "table");
  requireArg(opts.bucketName, "bucket");

  console.info(
    `\n${opts.apply ? "APPLY MODE" : "DRY RUN"} — userId=${opts.userId} programId=${opts.programId}\n`,
  );

  const docClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: opts.region }),
  );
  const s3Client = new S3Client({ region: opts.region });

  const program = await getProgram(
    docClient,
    opts.tableName,
    opts.userId,
    opts.programId,
  );
  if (!program) {
    console.error("Program not found");
    process.exit(1);
  }
  const s3DetailKey = program.attributes?.s3DetailKey;
  if (!s3DetailKey) {
    console.error("Program has no s3DetailKey");
    process.exit(1);
  }

  const programDetails = await getProgramDetails(
    s3Client,
    opts.bucketName,
    s3DetailKey,
  );

  const orphans = (programDetails.workoutTemplates || []).filter(
    (t) => t.status === "completed" && !t.linkedWorkoutId,
  );

  if (orphans.length === 0) {
    console.info("No orphaned templates found.");
    return;
  }
  console.info(`Found ${orphans.length} orphaned template(s):\n`);

  for (const template of orphans) {
    console.info(
      ` - Template ${template.templateId} (day ${template.dayNumber}, "${template.name}")`,
    );
    const workouts = await queryWorkoutsByTemplate(
      docClient,
      opts.tableName,
      template.templateId,
    );
    const workoutsForUser = workouts.filter(
      (w) => w.attributes?.userId === opts.userId,
    );

    if (workoutsForUser.length === 1) {
      const workoutId = workoutsForUser[0].attributes.workoutId;
      console.info(`   Found exactly 1 matching workout: ${workoutId}`);
      await relinkTemplate(
        s3Client,
        opts.bucketName,
        s3DetailKey,
        programDetails,
        template,
        workoutId,
        opts.apply,
      );
    } else if (workoutsForUser.length === 0) {
      console.info("   No matching workouts found — reverting template");
      await revertTemplate(
        docClient,
        s3Client,
        opts.tableName,
        opts.bucketName,
        s3DetailKey,
        opts.userId,
        opts.programId,
        programDetails,
        template,
        opts.apply,
      );
    } else {
      console.info(
        `   ${workoutsForUser.length} matching workouts — operator must pick. Skipping.`,
      );
      workoutsForUser.forEach((w) =>
        console.info(
          `     · workoutId=${w.attributes.workoutId} completedAt=${w.attributes.completedAt}`,
        ),
      );
    }
  }

  console.info(
    `\nDone. ${opts.apply ? "Applied" : "Dry run — pass --apply to commit"}.`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
