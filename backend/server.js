import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX allowed.'));
    }
  }
});

let pool;

async function startServer() {
  pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  console.log('✅ Database connected successfully');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('Student','Hr') NOT NULL DEFAULT 'Student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Ensured users table exists');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS resume_uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_role VARCHAR(255) NOT NULL,
      job_description TEXT,
      total_resumes INT NOT NULL,
      required_candidates INT NOT NULL,
      upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Ensured resume_uploads table exists');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      upload_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      candidate_name VARCHAR(255),
      score DECIMAL(5,2) NOT NULL,
      semantic_score DECIMAL(5,2),
      feature_score DECIMAL(5,2),
      matched_skills TEXT,
      rank_position INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (upload_id) REFERENCES resume_uploads(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Ensured candidates table exists with candidate_name field');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const normalizedRole = role && (role.toLowerCase().includes('hr') || role === 'Hr') ? 'Hr' : 'Student';
      const [ins] = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name || null, email, hashedPassword, normalizedRole]
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [ins.insertId]);
      user = rows[0];
    } else {
      user = users[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[AUTH] ❌ Missing token header:', authHeader);
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('[AUTH] ❌ Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.log('[AUTH] ✅ Token verified for user:', decoded.email || decoded.id, 'role:', decoded.role);
    req.user = decoded;
    next();
  });
}


app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/delete-account', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/match-resumes', authenticateToken, upload.array('files', 20), async (req, res) => {
  try {
    const { userId } = req.user;
    const { jobRole, jobDescription, requiredSkills, minEducation, minExperience, topN } = req.body;
    const files = req.files;

    console.log('📁 Received files:', files?.length);
    if (!files || files.length < 5 || files.length > 20) {
      files?.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {}
      });
      return res.status(400).json({ message: 'Please upload between 5 and 20 resumes' });
    }

    if (!jobRole || !jobDescription) {
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {}
      });
      return res.status(400).json({ message: 'Job role and description are required' });
    }

    const formData = new FormData();
    files.forEach(file => {
      const fileBuffer = fs.readFileSync(file.path);
      formData.append('files', fileBuffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
  });

    const jobRequirements = {
      required_skills: requiredSkills ? requiredSkills.split(',').map(s => s.trim().toLowerCase()) : [],
      min_education_level: parseInt(minEducation) || 0,
      min_experience: parseInt(minExperience) || 0
    };

    formData.append('job_description', jobDescription);
    formData.append('job_requirements', JSON.stringify(jobRequirements));
    formData.append('top_n', topN || 5);

    console.log('🚀 Calling ML API at:', `${ML_API_URL}/api/match-resumes`);
    const mlResponse = await fetch(`${ML_API_URL}/api/match-resumes`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('📡 ML API Response Status:', mlResponse.status);

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error('❌ ML API error response:', errorText);
      throw new Error(`ML API error: ${mlResponse.statusText}`);
    }

    const mlResults = await mlResponse.json();
    console.log('✅ ML Results received:', mlResults);

    const [uploadResult] = await pool.query(
      `INSERT INTO resume_uploads (user_id, job_role, job_description, total_resumes, required_candidates) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, jobRole, jobDescription, mlResults.total_resumes, parseInt(topN) || 5]
    );

    const uploadId = uploadResult.insertId;

    for (let i = 0; i < mlResults.top_candidates.length; i++) {
      const candidate = mlResults.top_candidates[i];
      await pool.query(
        `INSERT INTO candidates (upload_id, filename, candidate_name, score, semantic_score, feature_score, matched_skills, rank_position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uploadId,
          candidate.filename,
          candidate.candidate_name || 'Unknown Candidate',
          candidate.score,
          candidate.semantic_score,
          candidate.feature_score,
          JSON.stringify(candidate.matched_skills || []),
          candidate.rank_position || 0
        ]
      );
    }

    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    });

    console.log('✅ Successfully processed and saved candidates');

    return res.json({
      success: true,
      uploadId: uploadId,
      results: mlResults
    });

  } catch (error) {
    console.error('❌ Match resumes error:', error);
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {}
      });
    }
    return res.status(500).json({ message: 'Error processing resumes', error: error.message });
  }
});

app.get("/api/upload-history", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    
    const [results] = await pool.query(`
      SELECT 
        r.id,
        r.job_role,
        r.total_resumes,
        r.required_candidates,
        r.upload_date,
        ROUND(AVG(c.score), 2) AS avg_score
      FROM resume_uploads r
      LEFT JOIN candidates c ON r.id = c.upload_id
      WHERE r.user_id = ?
      GROUP BY r.id
      ORDER BY r.upload_date DESC
    `, [userId]);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching upload history:", error);
    return res.status(500).json({ message: "Database error" });
  }
});

app.get('/api/candidates/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { uploadId } = req.params;
    const [uploads] = await pool.query(
      'SELECT * FROM resume_uploads WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    const [candidates] = await pool.query(
      `SELECT * FROM candidates WHERE upload_id = ? ORDER BY rank_position`,
      [uploadId]
    );

    return res.json({
      upload: uploads[0],
      candidates: candidates.map(c => ({
        ...c,
        matched_skills: JSON.parse(c.matched_skills)
      }))
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const [totalUploads] = await pool.query(
      'SELECT COUNT(*) as count FROM resume_uploads WHERE user_id = ?',
      [userId]
    );

    const [totalCandidates] = await pool.query(
      `SELECT COUNT(*) as count FROM candidates c
       JOIN resume_uploads r ON c.upload_id = r.id
       WHERE r.user_id = ?`,
      [userId]
    );

    const [avgScore] = await pool.query(
      `SELECT AVG(score) as avg_score FROM candidates c
       JOIN resume_uploads r ON c.upload_id = r.id
       WHERE r.user_id = ?`,
      [userId]
    );

    return res.json({
      totalUploads: totalUploads[0].count,
      totalCandidates: totalCandidates[0].count,
      avgScore: avgScore[0].avg_score ? Math.round(avgScore[0].avg_score) : 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/analyze-student-resume', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('📄 Analyzing student resume:', file.originalname);
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(file.path);
    formData.append('file', fileBuffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    console.log('🚀 Calling ML API at:', `${ML_API_URL}/api/analyze-student-resume`);
    const mlResponse = await fetch(`${ML_API_URL}/api/analyze-student-resume`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('📡 ML API Response Status:', mlResponse.status);

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error('❌ ML API error response:', errorText);
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
      
      throw new Error(`ML API error: ${mlResponse.statusText}`);
    }

    const mlResults = await mlResponse.json();
    console.log('✅ ML Results received:', mlResults);
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    return res.json(mlResults);

  } catch (error) {
    console.error('❌ Student resume analysis error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}
    }
    
    return res.status(500).json({ 
      message: 'Error analyzing resume', 
      error: error.message 
    });
  }
});

startServer();