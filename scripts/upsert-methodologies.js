#!/usr/bin/env node


import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PINECONE_INDEX_NAME = 'coach-creator-proto-v1-dev';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'pcsk_replace_me';

export const getPineconeClient = async () => {
  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY
  });

  return {
    client: pc,
    index: pc.index(PINECONE_INDEX_NAME)
  };
};

// Configuration
const METHODOLOGY_DIR = path.join(__dirname, '../docs/methodologies');
const NAMESPACE = 'methodology';

/**
 * Extract metadata from markdown content and filename
 */
function extractMetadata(content, filename) {
  // Extract title from first line (if it's a heading)
  const lines = content.split('\n');
  let title = filename.replace('.md', '').replace(/-/g, ' ');
  if (lines[0].startsWith('#')) {
    title = lines[0].replace(/^#+\s*/, '');
  }

  // Lowercase for easier matching
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();

  // Expanded discipline detection
  const disciplineKeywords = [
    'crossfit', 'bodybuilding', 'powerlifting', 'weightlifting', 'olympic lifting', 'strongman',
    'endurance', 'hybrid', 'calisthenics', 'athletic performance', 'functional fitness',
    'mobility', 'rehab', 'nutrition', 'conditioning', 'hiit', 'yoga', 'pilates',
    'sports performance', 'olympic', 'olympic weightlifting'
  ];
  let discipline = 'crossfit'; // default
  for (const d of disciplineKeywords) {
    if (contentLower.includes(d) || filenameLower.includes(d.replace(' ', ''))) {
      discipline = d;
      break;
    }
  }

  // Expanded level detection
  const levelMap = [
    { level: 'beginner', keywords: ['beginner', 'novice', 'intro', 'foundation', 'entry level', 'rookie', 'starting'] },
    { level: 'intermediate', keywords: ['intermediate', 'intermed', 'progressing', 'some experience', 'mid-level'] },
    { level: 'advanced', keywords: ['advanced', 'elite', 'professional', 'expert', 'high level', 'competitive', 'seasoned', 'veteran'] }
  ];
  let level = 'intermediate'; // default
  for (const { level: lvl, keywords } of levelMap) {
    for (const k of keywords) {
      if (contentLower.includes(k) || filenameLower.includes(k.replace(' ', ''))) {
        level = lvl;
        break;
      }
    }
  }

  // Expanded topic keywords
  const topicKeywords = [
    'progressive overload', 'periodization', 'volume', 'intensity', 'frequency', 'recovery', 'deload',
    'peaking', 'tapering', 'block training', 'linear', 'undulating', 'conjugate', 'westside', 'comptrain',
    'crossfit', 'strength', 'conditioning', 'mobility', 'technique', 'form', 'injury prevention', 'nutrition',
    'supplementation', 'sleep', 'stress management', 'goal setting', 'testing', 'max effort', 'accessory work',
    'warm up', 'cool down', 'functional movement', 'hypertrophy', 'power', 'speed', 'agility', 'endurance',
    'aerobic', 'anaerobic', 'metcon', 'emom', 'amrap', 'wod', 'rest', 'tempo', 'eccentric', 'isometric',
    'concentric', 'range of motion', 'stability', 'balance', 'core', 'grip', 'mental toughness', 'competition',
    'injury rehab', 'prehab', 'lifestyle', 'habit', 'motivation', 'coaching', 'programming', 'assessment',
    'progression', 'regression', 'bands and chains', 'dynamic effort', 'max effort', 'volume accumulation',
    'russian squat routine', 'kettlebell', 'strength principles', 'block periodization', 'open workouts',
    'benchmark workouts', 'personal record', 'pr', 'testing', 'linear progression', 'cube method', 'german volume training',
    'functional movement screen', 'hard work pays off', 'injury', 'injury prevention', 'injury rehab', 'prehab',
    'habit', 'lifestyle', 'assessment', 'testing', 'progression', 'regression', 'coaching', 'motivation', 'habit',
    'goal', 'goals', 'training plan', 'training program', 'template', 'cycle', 'mesocycle', 'microcycle', 'macrocycle'
  ];
  const topics = [];
  for (const keyword of topicKeywords) {
    if (contentLower.includes(keyword) || filenameLower.includes(keyword.replace(' ', ''))) {
      topics.push(keyword.replace(/\s+/g, '_'));
    }
  }

  // Expanded source-specific topics
  const source = filename.split('-')[0];
  const sourceSpecificTopics = {
    'comptrain': ['comptrain', 'ben_bergeron', 'crossfit_games', 'comptrain_programming'],
    'westside': ['westside', 'conjugate_method', 'louis_simmons', 'bands_and_chains', 'dynamic_effort', 'max_effort'],
    'starting': ['starting_strength', 'mark_rippetoe', 'linear_progression'],
    'juggernaut': ['juggernaut_method', 'chad_wesley_smith', 'volume_accumulation'],
    'cube': ['cube_method', 'brandon_lilly'],
    'smolov': ['smolov_program', 'russian_squat_routine'],
    'prvn': ['prvn', 'shane_orr', 'prvn_programming'],
    'hwpo': ['hwpo', 'mat_fraser', 'hard_work_pays_off'],
    'mayhem': ['mayhem', 'rich_froning', 'mayhem_athlete'],
    'ncfit': ['ncfit', 'jason_khalipa', 'ncfit_programming'],
    'strongfirst': ['strongfirst', 'pavel_tsatsouline', 'kettlebell', 'strength_principles'],
    'sheiko': ['sheiko', 'boris_sheiko', 'russian_powerlifting'],
    'athletic': ['block_periodization', 'vladimir_issurin'],
    'bulgarian': ['bulgarian_method', 'ivan_abadjiev'],
    'gvt': ['german_volume_training'],
    'fms': ['functional_movement_screen'],
    'crossfit': ['crossfit', 'greg_glassman', 'open_workouts', 'benchmark_workouts']
  };
  if (sourceSpecificTopics[source]) {
    topics.push(...sourceSpecificTopics[source]);
  }

  return {
    source,
    title,
    discipline,
    level,
    topics: [...new Set(topics)], // Remove duplicates
    filename,
    loggedAt: new Date().toISOString()
  };
}

/**
 * Main function to upsert all methodology documents
 */
async function upsertAllMethodologies() {
  try {
    console.info('🚀 Starting methodology upsert to Pinecone...');
    console.info(`📁 Reading from: ${METHODOLOGY_DIR}`);
    console.info(`📊 Namespace: ${NAMESPACE}`);

    // Get Pinecone client
    const { index } = await getPineconeClient();
    console.info('✅ Pinecone client initialized');
    console.info('📊 Pinecone configuration:');
    console.info(`   Index: coach-creator-proto-v1-dev`);
    console.info(`   Namespace: ${NAMESPACE}`);
    console.info(`   API Key set: ${process.env.PINECONE_API_KEY ? 'Yes' : 'No (using fallback!)'}`);

    // Read all .md files
    const files = fs.readdirSync(METHODOLOGY_DIR)
      .filter(file => file.endsWith('.md'))
      .sort(); // Sort for consistent ordering

    console.info(`📄 Found ${files.length} methodology files`);

    let successCount = 0;
    let errorCount = 0;
    for (const file of files) {
      try {
        const filePath = path.join(METHODOLOGY_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract metadata
        const metadata = extractMetadata(content, file);

        // Create record ID
        const recordId = `methodology_${file.replace('.md', '')}`;

        console.info(`📝 Processing: ${file}`);
        console.info(`   Title: ${metadata.title}`);
        console.info(`   Source: ${metadata.source}`);
        console.info(`   Discipline: ${metadata.discipline}`);
        console.info(`   Level: ${metadata.level}`);
        console.info(`   Topics: ${metadata.topics.join(', ')}`);

        // Upsert to Pinecone
        await index.namespace(NAMESPACE).upsertRecords([{
          id: recordId,
          text: content, // This gets auto-embedded by Pinecone
          ...metadata
        }]);

        console.info(`✅ Successfully upserted: ${file}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
        errorCount++;
      }
    }

    console.info('\n📊 Summary:');
    console.info(`✅ Successfully upserted: ${successCount} files`);
    if (errorCount > 0) {
      console.info(`❌ Errors: ${errorCount} files`);
    }
    console.info(`📊 Total processed: ${files.length} files`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  upsertAllMethodologies()
    .then(() => {
      console.info('🎉 Methodology upsert completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { upsertAllMethodologies };
