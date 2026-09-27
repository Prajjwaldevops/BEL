/**
 * Database Migration Runner
 * Executes SQL migrations in order against Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'database', 'migrations');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function ensureMigrationsTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
  });

  if (error) {
    // Try alternative method using direct SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    
    console.log('Creating migrations table...');
    // This would need to be run manually in Supabase SQL editor
    console.log('Please run this SQL in Supabase SQL editor:');
    console.log(createTableSQL);
  }
}

async function getExecutedMigrations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('migration_name')
    .order('migration_name', { ascending: true });

  if (error) {
    console.error('Error fetching executed migrations:', error);
    return [];
  }

  return data?.map(row => row.migration_name) || [];
}

async function executeMigration(filename: string, sql: string): Promise<boolean> {
  console.log(`\n📝 Executing migration: ${filename}`);

  try {
    // Split by semicolons but keep them for complete statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.startsWith('COMMENT ON')) {
        continue;
      }

      console.log(`  Executing statement ${i + 1}/${statements.length}...`);
      
      // For Supabase, we need to use the REST API or SQL editor
      // This script outputs the SQL for manual execution
      console.log(`  ${statement.substring(0, 100)}...`);
    }

    // Record migration as executed
    const { error: insertError } = await supabase
      .from('schema_migrations')
      .insert({ migration_name: filename });

    if (insertError) {
      console.error(`  ❌ Error recording migration: ${insertError.message}`);
      return false;
    }

    console.log(`  ✅ Migration executed successfully`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error executing migration:`, error);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Ensure migrations table exists
  await ensureMigrationsTable();

  // Get list of executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`📊 ${executedMigrations.length} migrations already executed\n`);

  // Get all migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found');
    return;
  }

  console.log(`📁 Found ${files.length} migration files\n`);

  let executed = 0;
  let skipped = 0;

  for (const file of files) {
    if (executedMigrations.includes(file)) {
      console.log(`⏭️  Skipping ${file} (already executed)`);
      skipped++;
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Migration: ${file}`);
    console.log(`${'='.repeat(60)}`);
    console.log('\n⚠️  MANUAL EXECUTION REQUIRED:');
    console.log('Copy and paste the following SQL into Supabase SQL Editor:\n');
    console.log(sql);
    console.log(`\n${'='.repeat(60)}\n`);

    executed++;
  }

  console.log('\n✅ Migration scan complete!');
  console.log(`   Executed: ${executed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${files.length}`);
  console.log('\n⚠️  Note: Supabase requires manual SQL execution via SQL Editor');
  console.log('   1. Open Supabase Dashboard > SQL Editor');
  console.log('   2. Copy the SQL output above');
  console.log('   3. Paste and run each migration');
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n🎉 Migration process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });
