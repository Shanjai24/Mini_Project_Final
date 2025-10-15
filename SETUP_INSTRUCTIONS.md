# AI Job Predictor - Setup Instructions

## Database Setup & Configuration

### Prerequisites
- MySQL Server installed and running
- Node.js (v14 or higher)
- npm or yarn package manager

### Step 1: Create Database
```sql
CREATE DATABASE ai_job;
```

### Step 2: Configure Environment Variables
1. Copy the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your database credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ai_job

# Server Configuration
PORT=3000

# JWT Secret (change this to a secure random string)
JWT_SECRET=your_secure_jwt_secret_key_here

# ML API Configuration
ML_API_URL=http://localhost:8000
```

### Step 3: Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd ..
npm install
```

### Step 4: Start the Services

#### 1. Start the ML API Server (Python)
```bash
cd ml
python api_server.py
```
The ML server will run on http://localhost:8000

#### 2. Start the Backend Server (Node.js)
```bash
cd ../backend
npm run dev
# or
node server.js
```
The backend server will run on http://localhost:3000

#### 3. Start the Frontend (React + Vite)
```bash
cd ..
npm run dev
```
The frontend will run on http://localhost:5173

### Step 5: Test Database Connection
```bash
cd backend
node test-full-setup.js
```

This will:
- Test database connection
- Create necessary tables (users, resume_uploads, candidates)
- Create sample users if none exist
- Verify the setup

## User Roles & Login Flow

### Student Login Flow
1. Go to homepage (http://localhost:5173)
2. Click "Student" role
3. Enter email and password
4. If new user: Account will be created automatically
5. Redirected to Student Dashboard

### HR Login Flow
1. Go to homepage (http://localhost:5173)
2. Click "HR Professional" role
3. Enter email and password
4. If new user: Account will be created automatically with HR role
5. Redirected to HR Dashboard

## Features by Role

### Student Dashboard
- View profile statistics
- Upload resume for job prediction
- View recommended job roles
- Track application history
- Skill gap analysis

### HR Dashboard
- Upload multiple resumes (5-20)
- AI-powered candidate matching
- View top candidates with scores
- Track upload history
- Candidate skill analysis

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email address
- `password` - Hashed password
- `role` - Either 'Student' or 'Hr'
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Resume Uploads Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `job_role` - Target job role
- `job_description` - Job requirements
- `total_resumes` - Number of resumes uploaded
- `required_candidates` - Number of top candidates needed
- `upload_date` - Upload timestamp

### Candidates Table
- `id` - Primary key
- `upload_id` - Foreign key to resume_uploads
- `filename` - Resume filename
- `score` - Overall match score
- `semantic_score` - Semantic similarity score
- `feature_score` - Feature-based score
- `matched_skills` - JSON array of matched skills
- `rank_position` - Candidate ranking
- `created_at` - Record creation timestamp

## Troubleshooting

### Database Connection Issues
1. Ensure MySQL is running:
   ```bash
   # Windows
   net start MySQL80
   
   # Linux/Mac
   sudo systemctl start mysql
   ```

2. Check MySQL credentials:
   ```bash
   mysql -u root -p
   ```

3. Verify database exists:
   ```sql
   SHOW DATABASES;
   ```

### Port Conflicts
- Backend default: 3000 (change in .env)
- ML API default: 8000
- Frontend default: 5173

### Authentication Issues
- Tokens expire after 24 hours
- Clear localStorage if login issues persist
- Check JWT_SECRET is set in .env

## Testing the Setup

### Test User Creation
```bash
# Create test users via API
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@student.com","password":"password123","name":"Test Student","role":"Student"}'
```

### Test Database Tables
```sql
-- Check users
SELECT * FROM users;

-- Check uploads
SELECT * FROM resume_uploads;

-- Check candidates
SELECT * FROM candidates;
```

## Security Notes
1. **Never commit .env file** - It's in .gitignore
2. Change default JWT_SECRET to a secure random string
3. Use strong passwords for database users
4. Consider using HTTPS in production
5. Implement rate limiting for API endpoints

## Support
For issues or questions:
1. Check the logs in backend/logs/
2. Verify all services are running
3. Ensure database tables are created
4. Check network/firewall settings
