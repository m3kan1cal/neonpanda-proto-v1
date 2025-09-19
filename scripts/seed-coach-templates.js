#!/usr/bin/env node

/**
 * Coach Templates Seeding Script
 *
 * This script reads all coach template JSON files from docs/templates/
 * and inserts them into the DynamoDB table.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEMPLATES_DIR = path.join(__dirname, '../docs/templates');
const TABLE_NAME = process.env.TABLE_NAME || 'CoachForge-Dev'; // Update with your actual table name
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Read and parse a JSON template file
 */
function readTemplateFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const template = JSON.parse(fileContent);

    console.info(`✅ Successfully read template: ${template.attributes.template_name} (${template.attributes.template_id})`);
    return template;
  } catch (error) {
    console.error(`❌ Error reading template file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Insert a template into DynamoDB (overwrites existing records)
 */
async function insertTemplate(template) {
  try {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: template
      // No ConditionExpression - this will overwrite existing templates
    });

    await docClient.send(command);
    console.info(`✅ Successfully upserted template: ${template.attributes.template_name}`);
    return true;
  } catch (error) {
    console.error(`❌ Error upserting template ${template.attributes.template_name}:`, error.message);
    throw error;
  }
}

/**
 * Get all template files from the templates directory
 */
function getTemplateFiles() {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR);
    const templateFiles = files
      .filter(file => file.endsWith('-template.json'))
      .map(file => path.join(TEMPLATES_DIR, file));

    console.info(`📁 Found ${templateFiles.length} template files:`);
    templateFiles.forEach(file => {
      console.info(`   - ${path.basename(file)}`);
    });

    return templateFiles;
  } catch (error) {
    console.error(`❌ Error reading templates directory:`, error.message);
    process.exit(1);
  }
}

/**
 * Validate template structure
 */
function validateTemplate(template, fileName) {
  const requiredFields = ['pk', 'sk', 'entityType', 'attributes', 'createdAt', 'updatedAt'];
  const requiredAttributes = ['template_id', 'template_name', 'persona_category', 'description', 'target_audience', 'base_config', 'metadata'];

  // Check root level fields
  for (const field of requiredFields) {
    if (!template.hasOwnProperty(field)) {
      console.error(`❌ Template ${fileName} missing required field: ${field}`);
      return false;
    }
  }

  // Check attributes fields
  for (const field of requiredAttributes) {
    if (!template.attributes.hasOwnProperty(field)) {
      console.error(`❌ Template ${fileName} missing required attribute: ${field}`);
      return false;
    }
  }

  // Validate entityType
  if (template.entityType !== 'coachTemplate') {
    console.error(`❌ Template ${fileName} has invalid entityType: ${template.entityType}`);
    return false;
  }

  // Validate pk format
  if (!template.pk.startsWith('template#')) {
    console.error(`❌ Template ${fileName} has invalid pk format: ${template.pk}`);
    return false;
  }

  // Validate sk format
  if (!template.sk.startsWith('coachTemplate#')) {
    console.error(`❌ Template ${fileName} has invalid sk format: ${template.sk}`);
    return false;
  }

  console.info(`✅ Template ${fileName} passed validation`);
  return true;
}

/**
 * Main seeding function
 */
async function seedCoachTemplates() {
  console.info('🚀 Starting Coach Templates Seeding Process...\n');

  // Validate environment
  if (!TABLE_NAME) {
    console.error('❌ TABLE_NAME environment variable is required');
    process.exit(1);
  }

  console.info(`📋 Configuration:`);
  console.info(`   - Table Name: ${TABLE_NAME}`);
  console.info(`   - AWS Region: ${AWS_REGION}`);
  console.info(`   - Templates Directory: ${TEMPLATES_DIR}\n`);

  // Get all template files
  const templateFiles = getTemplateFiles();

  if (templateFiles.length === 0) {
    console.info('⚠️  No template files found. Exiting.');
    return;
  }

  console.info('\n📖 Reading and validating templates...\n');

  // Read and validate all templates
  const templates = [];
  for (const filePath of templateFiles) {
    const fileName = path.basename(filePath);
    const template = readTemplateFile(filePath);

    if (template && validateTemplate(template, fileName)) {
      templates.push(template);
    } else {
      console.error(`❌ Skipping invalid template: ${fileName}`);
    }
  }

  if (templates.length === 0) {
    console.error('❌ No valid templates found. Exiting.');
    process.exit(1);
  }

  console.info(`\n💾 Upserting ${templates.length} templates into DynamoDB...\n`);

  // Insert templates into DynamoDB
  let successCount = 0;
  let errorCount = 0;

  for (const template of templates) {
    try {
      const inserted = await insertTemplate(template);
      if (inserted) {
        successCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to upsert template: ${template.attributes.template_name}`);
    }
  }

  // Summary
  console.info('\n📊 Seeding Summary:');
  console.info(`   ✅ Successfully upserted: ${successCount} templates`);
  console.info(`   ❌ Failed: ${errorCount} templates`);
  console.info(`   📁 Total processed: ${templates.length} templates\n`);

  if (errorCount > 0) {
    console.info('⚠️  Some templates failed to upsert. Check the errors above.');
    process.exit(1);
  } else {
    console.info('🎉 Coach templates seeding completed successfully!');
  }
}

/**
 * Handle script execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.info(`
Coach Templates Seeding Script

Usage: node scripts/seed-coach-templates.js [options]

Environment Variables:
  TABLE_NAME    DynamoDB table name (required)
  AWS_REGION    AWS region (default: us-east-1)

Options:
  --help, -h    Show this help message
  --dry-run     Validate templates without inserting (not implemented)

Examples:
  TABLE_NAME=CoachForge-Dev node scripts/seed-coach-templates.js
  AWS_REGION=us-west-2 TABLE_NAME=CoachForge-Prod node scripts/seed-coach-templates.js
`);
    process.exit(0);
  }

  // Run the seeding process
  seedCoachTemplates().catch(error => {
    console.error('\n💥 Fatal error during seeding:', error);
    process.exit(1);
  });
}

export { seedCoachTemplates, readTemplateFile, validateTemplate };
