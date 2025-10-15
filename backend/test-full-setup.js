import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the root directory
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('🔧 Testing Full Database Setup for AI Job Predictor');
console.log('====================================================\n');

async function testDatabaseSetup() {
  let connection;
  
  try {
    // Step 1: Test connection
    console.log('📡 Step 1: Testing database connection...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ai_job',
      port: process.env.DB_PORT || 3306
    });
    console.log('✅ Successfully connected to database: ' + (process.env.DB_NAME || 'ai_job'));
    
    // Step 2: Check tables
    console.log('\n📊 Step 2: Checking database tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Found tables:', tables.map(t => Object.values(t)[0]));
    
    // Step 3: Check users table structure
    console.log('\n👥 Step 3: Checking users table structure...');
    const [userColumns] = await connection.query('DESCRIBE users');
    console.log('Users table columns:');
    userColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? '(PRIMARY KEY)' : ''}`);
    });
    
    // Step 4: Check for existing users
    console.log('\n🔍 Step 4: Checking existing users...');
    const [users] = await connection.query('SELECT id, email, role, created_at FROM users');
    if (users.length > 0) {
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Created: ${user.created_at}`);
      });
    } else {
      console.log('No users found in database.');
    }
    
    // Step 5: Test creating a sample user (if none exist)
    if (users.length === 0) {
      console.log('\n➕ Step 5: Creating sample users for testing...');
      
      // Create a student user
      await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test Student', 'student@test.com', '$2b$10$YourHashedPasswordHere', 'Student']
      );
      console.log('✅ Created test student user: student@test.com');
      
      // Create an HR user
      await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test HR', 'hr@test.com', '$2b$10$YourHashedPasswordHere', 'Hr']
      );
      console.log('✅ Created test HR user: hr@test.com');
    } else {
      console.log('\n✅ Step 5: Users already exist, skipping sample creation.');
    }
    
    // Step 6: Check resume_uploads table
    console.log('\n📄 Step 6: Checking resume_uploads table...');
    const [uploadColumns] = await connection.query('DESCRIBE resume_uploads');
    console.log('Resume uploads table columns:');
    uploadColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Step 7: Check candidates table
    console.log('\n🎯 Step 7: Checking candidates table...');
    const [candidateColumns] = await connection.query('DESCRIBE candidates');
    console.log('Candidates table columns:');
    candidateColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\n✅ Database setup verification complete!');
    console.log('\n📝 Summary:');
    console.log('  - Database: ' + (process.env.DB_NAME || 'ai_job'));
    console.log('  - Tables: users, resume_uploads, candidates');
    console.log('  - Users in DB: ' + (users.length > 0 ? users.length : '2 (newly created)'));
    console.log('\n🚀 Your database is ready for the AI Job Predictor application!');
    
  } catch (error) {
    console.error('\n❌ Database setup error:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('  1. Make sure MySQL is running');
    console.error('  2. Check your .env file has correct database credentials');
    console.error('  3. Ensure the database "ai_job" exists');
    console.error('  4. Verify user has proper permissions');
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 The database "ai_job" does not exist. Create it with:');
      console.error('   CREATE DATABASE ai_job;');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run the test
testDatabaseSetup();
