# CoachForge Scripts

This directory contains utility scripts for the CoachForge application.

## Coach Templates Seeding Script

### Overview
The `seed-coach-templates.js` script reads all coach template JSON files from the `docs/templates/` directory and inserts them into your DynamoDB table.

### Prerequisites
- AWS credentials configured (via AWS CLI, environment variables, or IAM roles)
- DynamoDB table created and accessible
- Node.js and npm installed

### Usage

#### Basic Usage
```bash
# Set your table name and run the script
TABLE_NAME=YourTableName npm run seed-coach-templates
```

#### With Custom AWS Region
```bash
# Specify both table name and region
AWS_REGION=us-west-2 TABLE_NAME=CoachForge-Prod npm run seed-coach-templates
```

#### Direct Node Execution
```bash
# Run directly with node
TABLE_NAME=CoachForge-Dev node scripts/seed-coach-templates.js
```

#### Help
```bash
# Show help information
node scripts/seed-coach-templates.js --help
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TABLE_NAME` | DynamoDB table name | `CoachForge-Dev` | Yes |
| `AWS_REGION` | AWS region | `us-east-1` | No |

### Features

- **Automatic Discovery**: Finds all `*-template.json` files in `docs/templates/`
- **Validation**: Validates template structure before insertion
- **Duplicate Prevention**: Won't overwrite existing templates (uses conditional writes)
- **Detailed Logging**: Shows progress and results for each template
- **Error Handling**: Graceful error handling with detailed error messages
- **Summary Report**: Provides insertion summary at the end

### Template Validation

The script validates each template for:
- Required root fields: `pk`, `sk`, `entityType`, `attributes`, `createdAt`, `updatedAt`
- Required attributes: `template_id`, `template_name`, `persona_category`, `description`, `target_audience`, `base_config`, `metadata`
- Correct `entityType`: Must be `"coachTemplate"`
- Correct `pk` format: Must start with `"template#"`
- Correct `sk` format: Must start with `"coachTemplate#"`

### Expected Output

```
🚀 Starting Coach Templates Seeding Process...

📋 Configuration:
   - Table Name: CoachForge-Dev
   - AWS Region: us-east-1
   - Templates Directory: /path/to/docs/templates

📁 Found 7 template files:
   - beginner-strength-builder-template.json
   - weight-loss-fitness-template.json
   - functional-fitness-competitor-template.json
   - busy-professional-optimizer-template.json
   - masters-comeback-athlete-template.json
   - fun-fitness-competitor-template.json
   - competitive-masters-athlete-template.json

📖 Reading and validating templates...

✅ Successfully read template: Beginner Strength Builder (tmpl_bsb_2025_08_23)
✅ Template beginner-strength-builder-template.json passed validation
...

💾 Inserting 7 templates into DynamoDB...

✅ Successfully inserted template: Beginner Strength Builder
✅ Successfully inserted template: Weight Loss + Fitness
...

📊 Seeding Summary:
   ✅ Successfully inserted: 7 templates
   ⚠️  Skipped (already exist): 0 templates
   ❌ Failed: 0 templates
   📁 Total processed: 7 templates

🎉 Coach templates seeding completed successfully!
```

### Troubleshooting

#### Common Issues

1. **Missing TABLE_NAME**: Set the `TABLE_NAME` environment variable
2. **AWS Credentials**: Ensure AWS credentials are properly configured
3. **Table Permissions**: Ensure your AWS credentials have `dynamodb:PutItem` permissions
4. **Invalid Templates**: Check the validation errors for specific issues

#### Error Messages

- `❌ TABLE_NAME environment variable is required`: Set the TABLE_NAME
- `❌ Template already exists`: Template with same pk/sk already in table (this is normal)
- `❌ Error reading template file`: Check file permissions and JSON syntax
- `❌ Template validation failed`: Check template structure against requirements

### Development

The script exports functions for testing:
- `seedCoachTemplates()`: Main seeding function
- `readTemplateFile(filePath)`: Read and parse a template file
- `validateTemplate(template, fileName)`: Validate template structure
