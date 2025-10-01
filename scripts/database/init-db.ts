import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Database Initialization Script
 * Run this script to set up the database schema and seed data
 */

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function initializeDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please ensure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🔄 Initializing database...\n');

  try {
    const sql = neon(DATABASE_URL);

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📋 Executing schema.sql...');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Use template literal for Neon's tagged template requirement
        await sql`${sql.unsafe(statement)}`;
        successCount++;

        // Log what we're creating
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (\w+)/)?.[1];
          console.log(`  ✓ Created table: ${tableName}`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX (\w+)/)?.[1];
          console.log(`  ✓ Created index: ${indexName}`);
        } else if (statement.includes('INSERT INTO')) {
          const tableName = statement.match(/INSERT INTO (\w+)/)?.[1];
          console.log(`  ✓ Inserted data into: ${tableName}`);
        } else if (statement.includes('CREATE TYPE')) {
          const typeName = statement.match(/CREATE TYPE (\w+)/)?.[1];
          console.log(`  ✓ Created type: ${typeName}`);
        } else if (statement.includes('CREATE EXTENSION')) {
          const extName = statement.match(/CREATE EXTENSION.*"([^"]+)"/)?.[1];
          console.log(`  ✓ Enabled extension: ${extName}`);
        }
      } catch (error: unknown) {
        // Check if error is about already existing items (which is fine)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate key')
        ) {
          console.log(`  ℹ️  Skipped (already exists)`);
          successCount++;
        } else {
          console.error(`  ❌ Error: ${errorMessage}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  ✓ Successful statements: ${successCount}`);
    console.log(`  ❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Database initialized successfully!');

      // Test connection with a simple query
      console.log('\n🔍 Testing database connection...');
      const result = await sql`SELECT COUNT(*) as table_count
                                FROM information_schema.tables
                                WHERE table_schema = 'public'`;
      console.log(`✓ Found ${result[0]?.table_count} tables in database`);

      // Check for payment plans
      const plans = await sql`SELECT name, price FROM payment_plans`;
      console.log(`✓ Found ${plans.length} payment plans`);
      plans.forEach(plan => {
        console.log(`  - ${plan.name}: $${plan.price}`);
      });

      console.log('\n🎉 Database is ready to use!');
    } else {
      console.log('\n⚠️  Database initialization completed with some errors');
      console.log('Some errors may be expected (e.g., existing tables)');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during database initialization:');
    console.error(error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase()
  .then(() => {
    console.log('\n✅ Database initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database initialization failed:');
    console.error(error);
    process.exit(1);
  });
