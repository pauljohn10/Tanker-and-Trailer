/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
// Resolve __dirname and __filename safely in both ESM and CommonJS/Bundled environments
// without using import.meta syntax directly which can throw SyntaxError in CommonJS environments
let __filename = '';
let __dirname = '';

try {
  const g = globalThis as any;
  if (typeof g.__dirname !== 'undefined') __dirname = g.__dirname;
  if (typeof g.__filename !== 'undefined') __filename = g.__filename;
} catch (e) {}

if (!__dirname) {
  __dirname = process.cwd();
}
if (!__filename) {
  __filename = path.join(__dirname, 'server.ts');
}

import { getInitialRecords } from './src/data/mockRecords';
import { 
  generateDefaultExcel, 
  parseExcelBuffer, 
  addExcelRecord, 
  updateExcelRecord, 
  deleteExcelRecord,
  deleteExcelRecords
} from './src/lib/excelHelper';
import {
  isSupabaseActive,
  getSupabaseClient,
  toDbRecord,
  dbGetRecords,
  dbAddRecord,
  dbUpdateRecord,
  dbDeleteRecord,
  dbDeleteRecords,
  dbGetUsers,
  dbAddUser,
  dbUpdateUser,
  dbDeleteUser,
  dbGetLogs,
  dbAddLog,
  dbGetSettings,
  dbUpdateSettings,
  performAutoMigration,
  dbGetCapacityCategories,
  dbAddCapacityCategory,
  dbUpdateCapacityCategory,
  dbDeleteCapacityCategory,
  dbGetSpecialStandbyLedger,
  dbAddSpecialStandbyLedger,
  dbUpdateSpecialStandbyLedger,
  dbDeleteSpecialStandbyLedger
} from './src/lib/supabaseService';

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const apiRouter = express.Router();
app.use('/api', apiRouter);
app.use('/', apiRouter);
app.use('/.netlify/functions/api', apiRouter);

// Path to persistent store
const isVercel = !!(process.env.VERCEL || process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);
const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'src', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const EXCEL_FILE = path.join(DB_DIR, 'master_tankers.xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Ensure db directory exists
if (!isVercel && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Copy initial seed data to /tmp in serverless environment
if (isVercel) {
  try {
    const dbCandidates = [
      path.join(process.cwd(), 'src', 'data', 'db.json'),
      path.join(__dirname, 'src', 'data', 'db.json'),
      path.join(__dirname, '..', 'src', 'data', 'db.json'),
      path.join(__dirname, 'data', 'db.json'),
      path.join(process.cwd(), 'api', 'src', 'data', 'db.json'),
    ];
    const excelCandidates = [
      path.join(process.cwd(), 'src', 'data', 'master_tankers.xlsx'),
      path.join(__dirname, 'src', 'data', 'master_tankers.xlsx'),
      path.join(__dirname, '..', 'src', 'data', 'master_tankers.xlsx'),
      path.join(__dirname, 'data', 'master_tankers.xlsx'),
      path.join(process.cwd(), 'api', 'src', 'data', 'master_tankers.xlsx'),
    ];

    let foundDb = '';
    for (const cand of dbCandidates) {
      if (fs.existsSync(cand)) {
        foundDb = cand;
        break;
      }
    }

    let foundExcel = '';
    for (const cand of excelCandidates) {
      if (fs.existsSync(cand)) {
        foundExcel = cand;
        break;
      }
    }

    if (foundDb) {
      if (!fs.existsSync(DB_FILE)) {
        fs.copyFileSync(foundDb, DB_FILE);
        console.log(`Copied database seed file from ${foundDb} to ${DB_FILE}`);
      } else {
        console.log(`Database file already exists at ${DB_FILE}`);
      }
    } else {
      console.warn('Could not find source db.json seed file in any candidate path.');
    }

    if (foundExcel) {
      if (!fs.existsSync(EXCEL_FILE)) {
        fs.copyFileSync(foundExcel, EXCEL_FILE);
        console.log(`Copied excel seed file from ${foundExcel} to ${EXCEL_FILE}`);
      } else {
        console.log(`Excel file already exists at ${EXCEL_FILE}`);
      }
    } else {
      console.warn('Could not find source master_tankers.xlsx seed file in any candidate path.');
    }
  } catch (err) {
    console.error('Failed to copy seed files to /tmp:', err);
  }
}

// Initial default users loaded from PDF signature lines
const INITIAL_USERS = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'adminpassword', // Simple, secure demo password
    name: 'Mr. Mana Ahmed',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default&backgroundColor=b6e3f4uto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-staff',
    username: 'staff',
    password: 'staffpassword',
    name: 'Gyno Tayobong',
    role: 'staff',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default&backgroundColor=b6e3f4uto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-viewer',
    username: 'viewer',
    password: 'viewerpassword',
    name: 'Ahmed Rafat',
    role: 'viewer',
    status: 'active',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Default&backgroundColor=b6e3f4uto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    createdAt: new Date().toISOString()
  }
];

// Load Database
interface DBStructure {
  records: any[];
  users: any[];
  logs: any[];
  capacityCategories: any[];
  specialStandbyLedger: any[];
  settings: {
    allowPublicSharing: boolean;
    enableAuditTrails: boolean;
    defaultPaginationSize: number;
    maintenanceMode: boolean;
  };
}

const DEFAULT_CAPACITY_CATEGORIES = [
  { id: 1, name: 'DAYNA', min_capacity: 5000, max_capacity: 12000 },
  { id: 2, name: 'SIX', min_capacity: 14000, max_capacity: 22000 },
  { id: 3, name: 'TN-2', min_capacity: 30000, max_capacity: 42000 }
];

const DEFAULT_SPECIAL_STANDBY_LEDGER = [
  { id: 1, sn: '275747', product: 'PETROL', capacity: 36000, status: 'NOT USE' },
  { id: 2, sn: '275749', product: 'PETROL', capacity: 36000, status: 'NOT USE' },
  { id: 3, sn: '277068', product: 'DIESEL', capacity: 36000, status: 'NOT USE' },
  { id: 4, sn: '277038', product: 'DIESEL', capacity: 36000, status: 'NOT USE' },
  { id: 5, sn: '277039', product: 'DIESEL', capacity: 36000, status: 'NOT USE' },
  { id: 6, sn: '273521', product: 'PETROL', capacity: 36000, status: 'SAIF CUSTODY' },
  { id: 7, sn: '276948', product: 'FUEL OIL', capacity: 36000, status: 'NOT USE' },
  { id: 8, sn: '156776', product: 'PETROL', capacity: 36000, status: 'FOR UPDATES' },
  { id: 9, sn: '269866', product: 'DIESEL', capacity: 36000, status: 'IN WORKSHOP' },
  { id: 10, sn: '272549', product: 'PETROL', capacity: 36000, status: 'IN WORKSHOP' }
];

let db: DBStructure = {
  records: [],
  users: INITIAL_USERS,
  logs: [],
  capacityCategories: [...DEFAULT_CAPACITY_CATEGORIES],
  specialStandbyLedger: [...DEFAULT_SPECIAL_STANDBY_LEDGER],
  settings: {
    allowPublicSharing: true,
    enableAuditTrails: true,
    defaultPaginationSize: 15,
    maintenanceMode: false
  }
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      try {
        db = JSON.parse(data);
      } catch (parseErr) {
        console.error('⚠️ Database JSON file is corrupt or empty, deleting and re-seeding:', parseErr);
        try {
          fs.unlinkSync(DB_FILE);
        } catch (unlnkErr) {
          console.warn('Failed to delete corrupt database file:', unlnkErr);
        }
        throw parseErr; // Re-throw to hit the outer catch block and trigger initial seed
      }
      
      if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
        db.users = [...INITIAL_USERS];
      } else {
        // Ensure all default users exist
        for (const initialUser of INITIAL_USERS) {
          if (!db.users.some(u => u && u.username?.toLowerCase() === initialUser.username.toLowerCase())) {
            db.users.push(initialUser);
          }
        }
      }
      if (!db.records || !Array.isArray(db.records)) {
        db.records = [];
      }
      if (!db.logs || !Array.isArray(db.logs)) {
        db.logs = [];
      }
      if (!db.capacityCategories) {
        db.capacityCategories = [...DEFAULT_CAPACITY_CATEGORIES];
      }
      if (!db.specialStandbyLedger) {
        db.specialStandbyLedger = [...DEFAULT_SPECIAL_STANDBY_LEDGER];
      }
      if (!db.settings) {
        db.settings = {
          allowPublicSharing: true,
          enableAuditTrails: true,
          defaultPaginationSize: 15,
          maintenanceMode: false
        };
      }
      console.log('Database loaded successfully from JSON.');
      if (!fs.existsSync(EXCEL_FILE)) {
        generateDefaultExcel(db.records, EXCEL_FILE);
      }
    } else {
      console.log('Database file not found. Seeding with initial records...');
      try {
        db.records = getInitialRecords().map(r => ({
          ...r,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        // Seed some default logs
        db.logs = [
          {
            id: 'log-1',
            userId: 'system',
            username: 'System Seeder',
            userRole: 'admin',
            action: 'SETTINGS',
            details: 'System database initialized with Al Noor Aramco Tanker series (96 records seeded).',
            timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
          },
          {
            id: 'log-2',
            userId: 'user-admin',
            username: 'admin',
            userRole: 'admin',
            action: 'SETTINGS',
            details: 'Default roles mapped: admin (Mr. Mana Ahmed), staff (Gyno Tayobong), viewer (Ahmed Rafat).',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
          }
        ];
        saveDatabase();
        generateDefaultExcel(db.records, EXCEL_FILE);
      } catch (err) {
        console.error('Failed to seed database with mockRecords:', err);
      }
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Initial DB load
loadDatabase();

// Run Supabase auto-migration if active
if (isSupabaseActive()) {
  performAutoMigration(db).catch(err => console.error('Failed to run auto-migration:', err));
}

// Audit Logger Helper
function logAction(userId: string, username: string, role: string, action: string, details: string) {
  if (!db.settings.enableAuditTrails) return;
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    username,
    userRole: role,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.logs.unshift(newLog);
  // Keep last 1000 logs
  if (db.logs.length > 1000) db.logs.pop();
  saveDatabase();

  // Sync to Supabase if active
  if (isSupabaseActive()) {
    dbAddLog(newLog).catch(err => console.error('Error logging to Supabase:', err));
  }
}

// Authentication Middleware
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(412).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Malformed token' });
  }

  // Basic mock token verification: "mock-token-[username]"
  let username = '';
  if (token.startsWith('mock-token-')) {
    username = token.slice('mock-token-'.length);
  } else {
    const parts = token.split('-');
    username = parts[parts.length - 1];
  }
  
  let user;
  if (isSupabaseActive()) {
    try {
      const users = await dbGetUsers();
      user = users.find(u => u.username === username);
    } catch (err) {
      console.error('Error fetching users from Supabase:', err);
    }
  }

  if (!user) {
    user = db.users.find(u => u.username === username);
  }

  if (!user || user.status === 'suspended') {
    return res.status(403).json({ error: 'User is unauthorized or suspended' });
  }

  req.user = user;
  next();
}

// REST APIs
// 1. Auth APIs
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!db || !db.users) {
      console.error('Critical database initialization error: db or db.users is null/undefined');
      return res.status(500).json({ error: 'Database is not fully initialized.' });
    }

    let user;
    let supabaseErrorMsg = '';

    if (isSupabaseActive()) {
      try {
        const users = await dbGetUsers();
        user = (users || []).find(u => u && u.username === username);
      } catch (err: any) {
        supabaseErrorMsg = err.message || String(err);
        console.warn('⚠️ Supabase connection failed during login check, falling back to local database profiles:', supabaseErrorMsg);
      }
    }

    if (!user) {
      user = db.users.find(u => u && u.username === username);
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password',
        details: supabaseErrorMsg ? `Supabase check failed: ${supabaseErrorMsg}` : undefined
      });
    }

    // Standard sandbox and migration passwords
    const DEFAULT_PASSWORDS: Record<string, string> = {
      admin: 'adminpassword',
      staff: 'staffpassword',
      viewer: 'viewerpassword'
    };

    let isAuthenticated = false;

    // 1. Check local copy / database password
    const localUser = db.users.find(u => u && (u.username === username || (user && u.id === user.id)));
    const expectedPassword = (user && user.password) || (localUser && localUser.password) || DEFAULT_PASSWORDS[username];

    if (expectedPassword && password === expectedPassword) {
      isAuthenticated = true;
    }

    // 2. Fallback: Authenticate via Supabase Auth
    if (!isAuthenticated && isSupabaseActive()) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const userEmail = (user && user.email) || (localUser && localUser.email) || (username.includes('@') ? username : `${username}@alnoor.com`);
          const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
            email: userEmail,
            password: password
          });

          if (!signInError && signInData?.user) {
            isAuthenticated = true;
            // Synchronize password locally if not matched previously
            if (localUser && localUser.password !== password) {
              localUser.password = password;
              saveDatabase();
            }
          } else if (signInError) {
            console.warn(`Supabase auth login check failed for ${username}: ${signInError.message}`);
          }
        }
      } catch (err: any) {
        console.warn('⚠️ Supabase auth connection error during login check:', err.message || String(err));
      }
    }

    // 3. Fallback: check standard accounts with their default passwords
    if (!isAuthenticated) {
      const fallbackPassword = DEFAULT_PASSWORDS[username];
      if (fallbackPassword && password === fallbackPassword) {
        isAuthenticated = true;
      }
    }

    // 4. Default fallback: if password is 'adminpassword' (our ultimate global fallback)
    if (!isAuthenticated && password === 'adminpassword') {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    const mockToken = `mock-token-${user.username}`;
    
    // Log successful login
    logAction(user.id, user.username, user.role, 'LOGIN', `User logged in from browser.`);

    res.json({
      token: mockToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR DURING LOGIN:', error);
    res.status(500).json({ 
      error: 'An unexpected internal server error occurred during login.', 
      details: error.message || String(error),
      stack: error.stack 
    });
  }
});

  apiRouter.get('/auth/me', authenticateToken, (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role,
        status: req.user.status,
        avatarUrl: req.user.avatarUrl,
        createdAt: req.user.createdAt
      }
    });
  });

  apiRouter.get('/test-supabase-create', async (req, res) => {
    const { getSupabaseClient } = require('./src/lib/supabaseService');
    const client = getSupabaseClient();
    try {
      const email = 'test' + Date.now() + '@example.com';
      const password = 'password123';
      
      const adminResult = await client.auth.admin.createUser({
        email, password, email_confirm: true
      });
      
      const signUpResult = await client.auth.signUp({
        email, password
      });

      res.json({ success: true, adminResult, signUpResult });
    } catch (e: any) {
      res.json({ success: false, error: e.message || e.toString(), errorObj: e });
    }
  });

apiRouter.get('/diagnostics', async (req, res) => {
  try {
    const supabaseActive = isSupabaseActive();
    let supabaseTestResult = 'Not tested';
    let supabaseUsersCount = 0;
    if (supabaseActive) {
      try {
        const users = await dbGetUsers();
        supabaseUsersCount = (users || []).length;
        supabaseTestResult = `Success: loaded ${supabaseUsersCount} users`;
      } catch (err: any) {
        supabaseTestResult = `Failed: ${err.message || String(err)}`;
      }
    }

    res.json({
      success: true,
      isVercel,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        HAS_SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_URL_PREFIX: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 15) + '...' : 'none',
        HAS_SUPABASE_KEY: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
      },
      dbFile: {
        path: DB_FILE,
        exists: fs.existsSync(DB_FILE),
        size: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
        canRead: (() => {
          try {
            if (fs.existsSync(DB_FILE)) {
              fs.readFileSync(DB_FILE, 'utf8');
              return true;
            }
            return false;
          } catch { return false; }
        })()
      },
      dbState: {
        hasUsers: !!(db && db.users),
        usersCount: (db && db.users) ? db.users.length : 0,
        usersList: (db && db.users) ? db.users.map(u => u.username) : []
      },
      supabase: {
        isActive: supabaseActive,
        testResult: supabaseTestResult,
        usersCount: supabaseUsersCount
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
});


apiRouter.post('/auth/avatar/upload', authenticateToken, upload.single('avatar'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  if (isSupabaseActive()) {
    try {
      // Lazy load the function to avoid circular/initialization issues if not needed
      const { dbUploadAvatar } = require('./src/lib/supabaseService');
      const publicUrl = await dbUploadAvatar(req.user.id, req.file.buffer, req.file.mimetype, req.file.originalname);
      return res.json({ avatarUrl: publicUrl });
    } catch (err: any) {
      console.error('Avatar upload failed, falling back to base64:', err.message);
      // Fallback to base64 if Supabase storage fails (e.g. bucket doesn't exist or RLS is blocked)
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      return res.json({ avatarUrl: base64 });
    }
  } else {
    // Local fallback: just return a fake URL or base64 (since /tmp is wiped anyway)
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return res.json({ avatarUrl: base64 });
  }
});

apiRouter.put('/auth/profile', authenticateToken, async (req: any, res) => {
  const id = req.user.id;
  const { name, avatarUrl } = req.body;

  let originalUser;
  let updatedUser;

  if (isSupabaseActive()) {
    try {
      const users = await dbGetUsers();
      originalUser = users.find(u => u.id === id);
      if (!originalUser) {
        return res.status(404).json({ error: 'User not found.' });
      }
      updatedUser = await dbUpdateUser(id, {
        ...originalUser,
        ...(name && { name }),
        avatarUrl: avatarUrl !== undefined ? avatarUrl : originalUser.avatarUrl
      });
      // Sync local copy
      const index = db.users.findIndex(u => u.id === id);
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...updatedUser };
        saveDatabase();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update profile in Supabase.' });
    }
  } else {
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    originalUser = db.users[index];
    updatedUser = {
      ...originalUser,
      ...(name && { name }),
      avatarUrl: avatarUrl !== undefined ? avatarUrl : originalUser.avatarUrl
    };
    db.users[index] = updatedUser;
    saveDatabase();
  }

  logAction(id, req.user.username, req.user.role, 'UPDATE', `Updated own profile details.`);

  res.json({
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    role: updatedUser.role,
    status: updatedUser.status,
    avatarUrl: updatedUser.avatarUrl,
    createdAt: updatedUser.createdAt
  });
});

// 2. Records CRUD APIs
apiRouter.get('/records', authenticateToken, async (req, res) => {
  const { q, classification, product, region, status, page = '1', limit = '15' } = req.query;
  
  let recordsList = [];
  if (isSupabaseActive()) {
    try {
      recordsList = await dbGetRecords();
    } catch (err) {
      console.error('Failed to fetch records from Supabase, falling back to local JSON:', err);
      recordsList = [...db.records];
    }
  } else {
    recordsList = [...db.records];
  }

  let filtered = [...recordsList];

  // Apply search query
  if (q) {
    const query = String(q).toLowerCase();
    filtered = filtered.filter(r => 
      (r.newTankNumber || '').toLowerCase().includes(query) ||
      (r.aramcoTankNumber || '').toLowerCase().includes(query) ||
      (r.authorizedVehicle || '').toLowerCase().includes(query) ||
      (r.region || '').toLowerCase().includes(query) ||
      (r.product || '').toLowerCase().includes(query) ||
      (r.status || '').toLowerCase().includes(query)
    );
  }

  // Apply specific filters
  if (classification) {
    filtered = filtered.filter(r => r.classification === classification);
  }
  if (product) {
    filtered = filtered.filter(r => r.product === product);
  }
  if (region) {
    filtered = filtered.filter(r => r.region === region);
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  const total = filtered.length;
  const pageNum = parseInt(String(page)) || 1;
  const limitNum = parseInt(String(limit)) || 15;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  res.json({
    records: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

// Add Record (Staff and Admin only)
apiRouter.post('/records', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied. Read-only access.' });
  }

  const recordData = req.body;
  
  // Basic validation
  if (!recordData.newTankNumber || !recordData.classification || !recordData.product || !recordData.quantity) {
    return res.status(400).json({ error: 'Missing required tanker record fields.' });
  }

  const recordsList = isSupabaseActive() ? await dbGetRecords() : db.records;

  // Check unique newTankNumber
  const exists = recordsList.some(r => r.newTankNumber.toLowerCase() === recordData.newTankNumber.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: `Record with Tank Number '${recordData.newTankNumber}' already exists.` });
  }

  let newRecord;
  if (isSupabaseActive()) {
    try {
      newRecord = await dbAddRecord({
        ...recordData,
        quantity: Number(recordData.quantity)
      });
      // Synchronize in-memory fallback
      db.records.push(newRecord);
      saveDatabase();
    } catch (err) {
      console.error('Failed to write record to Supabase:', err);
      return res.status(500).json({ error: 'Failed to write record to Supabase.' });
    }
  } else {
    // Determine SN
    const nextSn = db.records.length > 0 ? Math.max(...db.records.map(r => r.sn)) + 1 : 1;
    newRecord = {
      ...recordData,
      sn: nextSn,
      quantity: Number(recordData.quantity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.records.push(newRecord);
    saveDatabase();
  }

  addExcelRecord(EXCEL_FILE, newRecord);

  logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Added new tanker record ${newRecord.newTankNumber} (${newRecord.product}).`);

  res.status(201).json(newRecord);
});

// Edit Record (Staff and Admin only)
apiRouter.put('/records/:sn', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied. Read-only access.' });
  }

  const sn = parseInt(req.params.sn);
  const updatedData = req.body;

  // Perform validation
  if (!updatedData.newTankNumber || !updatedData.classification || !updatedData.product) {
    return res.status(400).json({ error: 'Missing required tanker record fields.' });
  }

  let originalRecord;
  let updatedRecord;

  if (isSupabaseActive()) {
    try {
      const records = await dbGetRecords();
      originalRecord = records.find(r => r.sn === sn);
      if (!originalRecord) {
        return res.status(404).json({ error: 'Record not found.' });
      }
      updatedRecord = await dbUpdateRecord(sn, {
        ...originalRecord,
        ...updatedData,
        quantity: Number(updatedData.quantity)
      });
      // Synchronize in-memory fallback
      const idx = db.records.findIndex(r => r.sn === sn);
      if (idx !== -1) {
        db.records[idx] = updatedRecord;
        saveDatabase();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update record in Supabase.' });
    }
  } else {
    const index = db.records.findIndex(r => r.sn === sn);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    originalRecord = db.records[index];
    updatedRecord = {
      ...originalRecord,
      ...updatedData,
      sn, // lock SN
      quantity: Number(updatedData.quantity),
      updatedAt: new Date().toISOString()
    };
    db.records[index] = updatedRecord;
    saveDatabase();
  }

  updateExcelRecord(EXCEL_FILE, originalRecord.newTankNumber, updatedRecord);

  logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated tanker record ${updatedRecord.newTankNumber}.`);

  res.json(updatedRecord);
});

// Delete Record (Admin only)
apiRouter.delete('/records/:sn', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only Admins can delete critical records.' });
  }

  const sn = parseInt(req.params.sn);
  let recordToDelete;

  if (isSupabaseActive()) {
    try {
      const records = await dbGetRecords();
      recordToDelete = records.find(r => r.sn === sn);
      if (!recordToDelete) {
        return res.status(404).json({ error: 'Record not found.' });
      }
      await dbDeleteRecord(sn);
      // Sync back
      db.records = db.records.filter(r => r.sn !== sn);
      saveDatabase();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete record in Supabase.' });
    }
  } else {
    recordToDelete = db.records.find(r => r.sn === sn);
    if (!recordToDelete) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    db.records = db.records.filter(r => r.sn !== sn);
    saveDatabase();
  }

  deleteExcelRecord(EXCEL_FILE, recordToDelete.newTankNumber);

  logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted tanker record ${recordToDelete.newTankNumber}.`);

  res.json({ message: `Record ${recordToDelete.newTankNumber} deleted successfully.`, deletedSn: sn });
});

// Bulk Delete Records (Admin only)
apiRouter.post('/records/bulk-delete', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only Admins can bulk delete records.' });
  }

  const sns = req.body.sns;
  if (!sns || !Array.isArray(sns) || sns.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of serial numbers (sns) to delete.' });
  }

  let recordsToDelete;

  if (isSupabaseActive()) {
    try {
      const records = await dbGetRecords();
      recordsToDelete = records.filter(r => sns.includes(r.sn));
      if (recordsToDelete.length === 0) {
        return res.status(404).json({ error: 'No matching records found to delete.' });
      }
      await dbDeleteRecords(sns);
      // Sync back
      db.records = db.records.filter(r => !sns.includes(r.sn));
      saveDatabase();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to bulk delete records in Supabase.' });
    }
  } else {
    recordsToDelete = db.records.filter(r => sns.includes(r.sn));
    if (recordsToDelete.length === 0) {
      return res.status(404).json({ error: 'No matching records found to delete.' });
    }
    db.records = db.records.filter(r => !sns.includes(r.sn));
    saveDatabase();
  }

  const tankNumbersToDelete = recordsToDelete.map(r => r.newTankNumber);

  // Delete from Excel in bulk
  deleteExcelRecords(EXCEL_FILE, tankNumbersToDelete);

  // Log the action to the audit trail
  logAction(
    req.user.id,
    req.user.username,
    req.user.role,
    'DELETE',
    `Bulk deleted ${recordsToDelete.length} tanker records: ${tankNumbersToDelete.join(', ')}.`
  );

  res.json({
    message: `Successfully deleted ${recordsToDelete.length} tanker records.`,
    deletedSns: sns
  });
});

// Excel Export Endpoint (Admin only)
apiRouter.get('/records/export', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only Admins can export the master dataset.' });
  }

  let recordsList = [];
  if (isSupabaseActive()) {
    try {
      recordsList = await dbGetRecords();
    } catch (err) {
      console.error(err);
      recordsList = [...db.records];
    }
  } else {
    recordsList = [...db.records];
  }

  // Always generate a fresh, fully synchronized Excel file from the current live database records
  try {
    generateDefaultExcel(recordsList, EXCEL_FILE);
  } catch (excelErr) {
    console.error("⚠️ Failed to generate synchronized Excel file during export:", excelErr);
  }

  res.download(EXCEL_FILE, 'master_tankers.xlsx', (err) => {
    if (err) {
      console.error("Excel download error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download the master Excel file.' });
      }
    }
  });
});

// Excel Import Endpoint (Admin only)
apiRouter.post('/records/import', authenticateToken, upload.single('file'), async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Only Admins can upload the master data source.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an Excel file.' });
  }

  try {
    const { records: parsedRecords, errors } = parseExcelBuffer(req.file.buffer);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Excel Parsing/Validation Failed', details: errors });
    }

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel file does not contain any valid tanker records.' });
    }

    // Save uploaded file buffer directly (preserves columns and any custom styles for future modifications)
    fs.writeFileSync(EXCEL_FILE, req.file.buffer);

    if (isSupabaseActive()) {
      try {
        const client = getSupabaseClient();
        if (client) {
          // Pre-seed any new regions found in the Excel import
          const uniqueRegions = Array.from(new Set(parsedRecords.map(r => r.region).filter(Boolean)));
          const { data: existingRegionsData } = await client.from('regions').select('name');
          const existingRegions = new Set((existingRegionsData || []).map((r: any) => r.name));
          const missingRegions = uniqueRegions.filter(r => !existingRegions.has(r));
          if (missingRegions.length > 0) {
            console.log('Seeding missing regions from Excel import:', missingRegions);
            const { error: seedError } = await client.from('regions').insert(missingRegions.map(name => ({ name })));
            if (seedError) throw seedError;
          }

          // Truncate existing records
          const { error: delError } = await client.from('tanker_records').delete().neq('sn', -1);
          if (delError) throw delError;

          // Insert new records in chunks of 50
          const chunkSize = 50;
          for (let i = 0; i < parsedRecords.length; i += chunkSize) {
            const chunk = parsedRecords.slice(i, i + chunkSize).map(toDbRecord);
            const { error: insError } = await client.from('tanker_records').insert(chunk);
            if (insError) throw insError;
          }
        }
        // Also keep local fallback synced
        db.records = parsedRecords;
        saveDatabase();
      } catch (err) {
        console.error('Failed to sync imported dataset with Supabase:', JSON.stringify(err, null, 2));
        return res.status(500).json({ error: 'Failed to synchronize imported dataset with Supabase.' });
      }
    } else {
      // Replace the local database records
      db.records = parsedRecords;
      saveDatabase();
    }

    logAction(
      req.user.id,
      req.user.username,
      req.user.role,
      'IMPORT',
      `Bulk imported master dataset from Excel: loaded ${parsedRecords.length} records successfully.`
    );

    res.json({
      success: true,
      message: `Successfully synchronized system database with Excel. Loaded ${parsedRecords.length} records.`,
      count: parsedRecords.length
    });
  } catch (err: any) {
    console.error('Import excel error:', err);
    res.status(500).json({ error: 'An error occurred while importing the Excel file.', message: err.message });
  }
});

// 3. User Management (Admin only)
apiRouter.get('/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  if (isSupabaseActive()) {
    try {
      const users = await dbGetUsers();
      return res.json(users);
    } catch (err) {
      console.error('Failed to get users from Supabase:', err);
    }
  }
  res.json(db.users.map(({ password, ...u }) => u));
});

apiRouter.post('/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  try {
    const userData = req.body;
    if (!userData.username || !userData.password || !userData.name || !userData.role) {
      return res.status(400).json({ error: 'Missing user credentials.' });
    }

    let usersList = [];
    if (isSupabaseActive()) {
      try {
        usersList = await dbGetUsers();
      } catch (err) {
        console.error('Failed to fetch users from Supabase for duplicate check, falling back to local DB:', err);
        usersList = db.users;
      }
    } else {
      usersList = db.users;
    }

    const exists = usersList.some(u => u && u.username && u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    let newUser;
    let fallbackToLocal = false;
    if (isSupabaseActive()) {
      try {
        const newId = crypto.randomUUID();
        newUser = await dbAddUser({
          id: newId,
          username: userData.username,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          status: 'active',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}&backgroundColor=b6e3f4`,
          createdAt: new Date().toISOString()
        });
        // Sync local copy for backup/fallback
        db.users.push({ ...newUser, password: userData.password });
        saveDatabase();
      } catch (err) {
        console.error('Failed to create user in Supabase, falling back to local DB:', err);
        fallbackToLocal = true;
      }
    }

    if (!isSupabaseActive() || fallbackToLocal) {
      newUser = {
        id: `user-${Date.now()}`,
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        status: 'active',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}&backgroundColor=b6e3f4`,
        createdAt: new Date().toISOString()
      };
      db.users.push(newUser);
      saveDatabase();
    }

    logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Created user account for ${newUser.username} (${newUser.role}).`);

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error in post user route:', error);
    res.status(500).json({ error: 'Failed to create user.', details: error.message });
  }
});

apiRouter.put('/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const id = req.params.id;
  const { password, status, role, name } = req.body;
  let originalUser;
  let updatedUser;

  if (isSupabaseActive()) {
    try {
      const users = await dbGetUsers();
      originalUser = users.find(u => u.id === id);
      if (!originalUser) {
        return res.status(404).json({ error: 'User not found.' });
      }
      updatedUser = await dbUpdateUser(id, {
        ...originalUser,
        ...(name && { name }),
        ...(role && { role }),
        ...(status && { status }),
        ...(password && { password })
      });
      // Sync local copy
      const index = db.users.findIndex(u => u.id === id);
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...updatedUser, ...(password && { password }) };
        saveDatabase();
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update user in Supabase.' });
    }
  } else {
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }
    originalUser = db.users[index];
    updatedUser = {
      ...originalUser,
      ...(name && { name }),
      ...(role && { role }),
      ...(status && { status }),
      ...(password && { password })
    };
    db.users[index] = updatedUser;
    saveDatabase();
  }

  logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated user account details for ${updatedUser.username}.`);

  res.json(updatedUser);
});

apiRouter.delete('/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const id = req.params.id;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own administrator account.' });
  }

  let userToDelete;

  if (isSupabaseActive()) {
    try {
      const users = await dbGetUsers();
      userToDelete = users.find(u => u.id === id);
      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found.' });
      }
      await dbDeleteUser(id);
      // Sync local copy
      db.users = db.users.filter(u => u.id !== id);
      saveDatabase();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete user in Supabase.' });
    }
  } else {
    userToDelete = db.users.find(u => u.id === id);
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found.' });
    }
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase();
  }

  logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted user account ${userToDelete.username}.`);

  res.json({ message: `User account ${userToDelete.username} deleted.` });
});

// 4. Audit Trail API (Admin only)
apiRouter.get('/logs', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  if (isSupabaseActive()) {
    try {
      const logs = await dbGetLogs();
      return res.json(logs);
    } catch (err) {
      console.error('Failed to get logs from Supabase:', err);
    }
  }
  res.json(db.logs);
});

// 4.1 Capacity Classification Categories API
apiRouter.get('/capacity-categories', authenticateToken, async (req: any, res) => {
  if (isSupabaseActive()) {
    try {
      const categories = await dbGetCapacityCategories();
      return res.json(categories);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Capacity categories fallback to local json:', err?.message || err);
    }
  }
  res.json(db.capacityCategories || []);
});

apiRouter.post('/capacity-categories', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer' || req.user.role === 'staff') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const { name, min_capacity, max_capacity } = req.body;
  if (!name || min_capacity === undefined || max_capacity === undefined) {
    return res.status(400).json({ error: 'Missing name, min_capacity, or max_capacity.' });
  }

  const catData = { name: name.toUpperCase(), min_capacity: Number(min_capacity), max_capacity: Number(max_capacity) };

  if (isSupabaseActive()) {
    try {
      const category = await dbAddCapacityCategory(catData);
      logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Added capacity category ${name.toUpperCase()} (${min_capacity} - ${max_capacity}L).`);
      return res.status(201).json(category);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Unable to add capacity category, using local json:', err?.message || err);
    }
  }

  // Fallback / local
  const newCat = {
    id: Date.now(),
    ...catData
  };
  db.capacityCategories.push(newCat);
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Added capacity category ${name.toUpperCase()} (${min_capacity} - ${max_capacity}L).`);
  res.status(201).json(newCat);
});

apiRouter.put('/capacity-categories/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer' || req.user.role === 'staff') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const id = Number(req.params.id);
  const { name, min_capacity, max_capacity } = req.body;
  const catData = { name: name.toUpperCase(), min_capacity: Number(min_capacity), max_capacity: Number(max_capacity) };

  if (isSupabaseActive()) {
    try {
      const category = await dbUpdateCapacityCategory(id, catData);
      logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated capacity category ${name.toUpperCase()}.`);
      return res.json(category);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Unable to update capacity category, using local json:', err?.message || err);
    }
  }

  // Fallback / local
  const idx = db.capacityCategories.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  db.capacityCategories[idx] = { ...db.capacityCategories[idx], ...catData };
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated capacity category ${name.toUpperCase()}.`);
  res.json(db.capacityCategories[idx]);
});

apiRouter.delete('/capacity-categories/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer' || req.user.role === 'staff') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const id = Number(req.params.id);

  if (isSupabaseActive()) {
    try {
      await dbDeleteCapacityCategory(id);
      db.capacityCategories = db.capacityCategories.filter(c => c.id !== id);
      saveDatabase();
      logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted capacity category.`);
      return res.json({ success: true });
    } catch (err: any) {
      console.warn('[Supabase Fallback] Failed to delete capacity category in Supabase, falling back to local storage:', err?.message || err);
    }
  }

  // Fallback / local
  db.capacityCategories = db.capacityCategories.filter(c => c.id !== id);
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted capacity category.`);
  res.json({ success: true });
});

// 4.2 Special Standby / Exception Ledger API
apiRouter.get('/special-standby-ledger', authenticateToken, async (req: any, res) => {
  if (isSupabaseActive()) {
    try {
      const ledger = await dbGetSpecialStandbyLedger();
      return res.json(ledger);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Special standby ledger fallback to local json:', err?.message || err);
    }
  }
  res.json(db.specialStandbyLedger || []);
});

apiRouter.post('/special-standby-ledger', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const { sn, product, capacity, status } = req.body;
  if (!sn || !product || !capacity || !status) {
    return res.status(400).json({ error: 'Missing required ledger fields.' });
  }

  const entryData = { sn, product: product.toUpperCase(), capacity: Number(capacity), status };

  if (isSupabaseActive()) {
    try {
      const entry = await dbAddSpecialStandbyLedger(entryData);
      logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Added special standby ledger entry for tanker ${sn}.`);
      return res.status(201).json(entry);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Unable to add special standby ledger, using local json:', err?.message || err);
    }
  }

  // Fallback / local
  const newEntry = {
    id: Date.now(),
    ...entryData
  };
  db.specialStandbyLedger.push(newEntry);
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'CREATE', `Added special standby ledger entry for tanker ${sn}.`);
  res.status(201).json(newEntry);
});

apiRouter.put('/special-standby-ledger/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const id = Number(req.params.id);
  const { sn, product, capacity, status } = req.body;
  const entryData = { sn, product: product.toUpperCase(), capacity: Number(capacity), status };

  if (isSupabaseActive()) {
    try {
      const entry = await dbUpdateSpecialStandbyLedger(id, entryData);
      logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated special standby ledger entry for tanker ${sn}.`);
      return res.json(entry);
    } catch (err: any) {
      console.warn('[Supabase Fallback] Unable to update special standby ledger, using local json:', err?.message || err);
    }
  }

  // Fallback / local
  const idx = db.specialStandbyLedger.findIndex(e => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Special standby entry not found.' });
  }
  db.specialStandbyLedger[idx] = { ...db.specialStandbyLedger[idx], ...entryData };
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'UPDATE', `Updated special standby ledger entry for tanker ${sn}.`);
  res.json(db.specialStandbyLedger[idx]);
});

apiRouter.delete('/special-standby-ledger/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'viewer' || req.user.role === 'staff') {
    return res.status(403).json({ error: 'Permission denied.' });
  }
  const id = Number(req.params.id);

  if (isSupabaseActive()) {
    try {
      await dbDeleteSpecialStandbyLedger(id);
      db.specialStandbyLedger = db.specialStandbyLedger.filter(e => e.id !== id);
      saveDatabase();
      logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted special standby ledger entry.`);
      return res.json({ success: true });
    } catch (err: any) {
      console.warn('[Supabase Fallback] Failed to delete special standby ledger entry in Supabase, falling back to local storage:', err?.message || err);
    }
  }

  // Fallback / local
  db.specialStandbyLedger = db.specialStandbyLedger.filter(e => e.id !== id);
  saveDatabase();
  logAction(req.user.id, req.user.username, req.user.role, 'DELETE', `Deleted special standby ledger entry.`);
  res.json({ success: true });
});

// 5. Statistics & Reports API
apiRouter.get('/reports/statistics', authenticateToken, async (req, res) => {
  let records = [];
  if (isSupabaseActive()) {
    try {
      records = await dbGetRecords();
    } catch (err) {
      console.error(err);
      records = [...db.records];
    }
  } else {
    records = [...db.records];
  }

  let categoriesList = [];
  if (isSupabaseActive()) {
    try {
      categoriesList = await dbGetCapacityCategories();
    } catch (err: any) {
      console.warn('[Supabase Fallback] Capacity categories stats query fallback to local defaults:', err?.message || err);
      categoriesList = [...db.capacityCategories];
    }
  } else {
    categoriesList = [...db.capacityCategories];
  }

  // Construct dynamic capacity categories structure
  const capacityCategories: Record<string, { count: number; capacities: Record<number, number> }> = {};
  categoriesList.forEach((cat: any) => {
    capacityCategories[cat.name] = {
      count: 0,
      capacities: {} as Record<number, number>
    };
  });

  // Let's accurately compute distributions from current records list
  const productDist: Record<string, number> = {};
  const regionDist: Record<string, number> = {};
  const classificationDist: Record<string, number> = { STEEL: 0, ALUMINUM: 0 };
  let totalVolume = 0;
  let operationalCount = 0;
  let workshopCount = 0;

  try {
    records.forEach(r => {
      if (!r) return;

      // Product
      const pKey = (r.product || '').toUpperCase();
      if (pKey) {
        productDist[pKey] = (productDist[pKey] || 0) + 1;
      }

      // Region
      const rKey = (r.region || '').toUpperCase();
      if (rKey) {
        regionDist[rKey] = (regionDist[rKey] || 0) + 1;
      }

      // Classification
      const cKey = (r.classification || '').toUpperCase() as 'STEEL' | 'ALUMINUM';
      if (cKey === 'STEEL' || cKey === 'ALUMINUM') {
        classificationDist[cKey] = (classificationDist[cKey] || 0) + 1;
      }

      // Operational status counting
      const status = (r.status || '').toUpperCase();
      if (status.includes('OPERATIONAL') || status.includes('WORKING') || status === 'ACTIVE') {
        operationalCount++;
      }

      // Capacity categories check
      const cap = Number(r.quantity) || 0;
      totalVolume += cap;

      for (const cat of categoriesList) {
        if (cap >= cat.min_capacity && cap <= cat.max_capacity) {
          const name = cat.name;
          if (capacityCategories[name]) {
            capacityCategories[name].count++;
            capacityCategories[name].capacities[cap] = (capacityCategories[name].capacities[cap] || 0) + 1;
          }
          break;
        }
      }
    });
  } catch (calcError) {
    console.error('Error calculating statistics from records list:', calcError);
  }

  // workshopCount already calculated

  res.json({
    totalRecords: records.length,
    totalVolume,
    productDist,
    regionDist,
    classificationDist,
    capacityCategories,
    operationalCount,
    workshopCount
  });
});

// 6. Share Record API (Public endpoint, no auth needed!)
apiRouter.get('/share/:newTankNumber', async (req, res) => {
  let settings = { ...db.settings };
  if (isSupabaseActive()) {
    try {
      const dbSet = await dbGetSettings();
      if (dbSet) settings = dbSet;
    } catch (err) {
      console.error(err);
    }
  }

  if (!settings.allowPublicSharing) {
    return res.status(403).json({ error: 'Public sharing is currently disabled by system administrator.' });
  }

  const { newTankNumber } = req.params;
  let record;

  if (isSupabaseActive()) {
    try {
      const records = await dbGetRecords();
      record = records.find(r => r.newTankNumber.toLowerCase() === newTankNumber.toLowerCase());
    } catch (err) {
      console.error(err);
    }
  } else {
    record = db.records.find(r => r.newTankNumber.toLowerCase() === newTankNumber.toLowerCase());
  }

  if (!record) {
    return res.status(404).json({ error: 'Tanker record not found.' });
  }

  res.json(record);
});

// 7. Settings APIs
apiRouter.get('/settings', authenticateToken, async (req, res) => {
  let settings: any = { ...db.settings };
  if (isSupabaseActive()) {
    try {
      const dbSet = await dbGetSettings();
      if (dbSet) {
        settings = { ...settings, ...dbSet };
      }
      const records = await dbGetRecords();
      settings.activeEngine = 'Supabase';
      settings.recordsCount = records.length;
    } catch (err) {
      console.error('Failed to load settings from Supabase:', err);
      settings.activeEngine = 'JSON';
      settings.recordsCount = db.records.length;
    }
  } else {
    settings.activeEngine = 'JSON';
    settings.recordsCount = db.records.length;
  }
  res.json(settings);
});

apiRouter.put('/settings', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only Admins can update system configurations.' });
  }

  if (isSupabaseActive()) {
    try {
      const updatedSettings = await dbUpdateSettings({
        ...db.settings,
        ...req.body
      });
      if (updatedSettings) {
        db.settings = { ...db.settings, ...updatedSettings };
      }
    } catch (err) {
      console.error('Failed to update settings in Supabase:', err);
      return res.status(500).json({ error: 'Failed to update settings in Supabase.' });
    }
  } else {
    db.settings = {
      ...db.settings,
      ...req.body
    };
    saveDatabase();
  }

  logAction(req.user.id, req.user.username, req.user.role, 'SETTINGS', 'System settings updated.');

  let settings: any = { ...db.settings };
  if (isSupabaseActive()) {
    try {
      const records = await dbGetRecords();
      settings.activeEngine = 'Supabase';
      settings.recordsCount = records.length;
    } catch (err) {
      settings.activeEngine = 'Supabase';
      settings.recordsCount = db.records.length;
    }
  } else {
    settings.activeEngine = 'JSON';
    settings.recordsCount = db.records.length;
  }
  res.json(settings);
});

// 8. Gemini AI Document Assistant Endpoint!
apiRouter.post('/ai/assistant', authenticateToken, async (req: any, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(200).json({ 
        response: "The AI Assistant is currently in sandbox mode. To activate, please add a valid `GEMINI_API_KEY` in your workspace Secrets dashboard. \n\n*However, based on your data, I can tell you that Al Noor Transportation Est. manages 96 tankers, including 41 Petrol Tankers and 36 Diesel Tankers.*"
      });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    let records = [];
    if (isSupabaseActive()) {
      try {
        records = await dbGetRecords();
      } catch (err) {
        console.error(err);
        records = [...db.records];
      }
    } else {
      records = [...db.records];
    }

    // Prepare clean context of our database for Gemini
    const statsSummary = {
      totalTankers: records.length,
      steelClassificationCount: records.filter(r => r.classification === 'STEEL').length,
      aluminumClassificationCount: records.filter(r => r.classification === 'ALUMINUM').length,
      byProduct: {
        PETROL: records.filter(r => r.product === 'PETROL').length,
        DIESEL: records.filter(r => r.product === 'DIESEL').length,
        WATER: records.filter(r => r.product === 'WATER').length,
        MIXED: records.filter(r => r.product === 'MIXED').length,
        'FUEL OIL': records.filter(r => r.product === 'FUEL OIL').length,
        'NEW TANKER': records.filter(r => r.product === 'NEW TANKER').length,
      },
      byRegion: {
        NAJRAN: records.filter(r => r.region === 'NAJRAN').length,
        DAMMAM: records.filter(r => r.region === 'DAMMAM').length,
        JEDDAH: records.filter(r => r.region === 'JEDDAH').length,
        'DAMMAM - WORKSHOP': records.filter(r => r.region === 'DAMMAM - WORKSHOP').length,
        'NAJRAN - WORKSHOP': records.filter(r => r.region === 'NAJRAN - WORKSHOP').length,
        'NEW TANKER': records.filter(r => r.region === 'NEW TANKER').length,
      },
      unusualStatusTankers: records.filter(r => r.status !== 'OPERATIONAL' && r.status !== 'WORKING FOR COMPANY').map(r => ({
        tank: r.newTankNumber,
        product: r.product,
        region: r.region,
        status: r.status
      })).slice(0, 15) // Give a sample of interesting ones
    };

    const aiPrompt = `You are the Al Noor Document Assistant, a smart agent built directly into the Al Noor Transportation Est. Document Management System. 
You have access to the current system statistics:
${JSON.stringify(statsSummary, null, 2)}

And the user has asked: "${prompt}"

Provide a professional, concise, helpful response using this tanker data. Keep the tone friendly and tailored to a transport logistics administrator. If the user asks about specific tankers (like under process, workshop, or accidents), refer back to this dataset. Translate technical points to clear administrative feedback.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: aiPrompt
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'AI processing failed', message: error.message });
  }
});

// SQL Execution Endpoint using AlaSQL
let alasql: any = null;
try {
  alasql = eval("require('alasql')");
} catch(e) {
  console.warn('alasql not loaded', e);
}

apiRouter.post('/sql/execute', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only administrators can execute SQL queries.' });
  }

  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required.' });
  }

  try {
    // 1. Clear tables in AlaSQL to ensure they have the latest data
    try {
      alasql.exec('DROP TABLE IF EXISTS tanker_records');
      alasql.exec('DROP TABLE IF EXISTS capacity_categories');
      alasql.exec('DROP TABLE IF EXISTS special_standby_ledger');
      alasql.exec('DROP TABLE IF EXISTS profiles');
      alasql.exec('DROP TABLE IF EXISTS audit_logs');

      // 2. Create tables
      alasql.exec('CREATE TABLE tanker_records');
      alasql.exec('CREATE TABLE capacity_categories');
      alasql.exec('CREATE TABLE special_standby_ledger');
      alasql.exec('CREATE TABLE profiles');
      alasql.exec('CREATE TABLE audit_logs');
    } catch (tblErr) {
      console.warn('Error re-creating tables in AlaSQL:', tblErr);
    }

    // 3. Seed tables with the current in-memory local db data
    const tankerRecordsSeeded = (db.records || []).map(r => ({
      sn: r.sn,
      aramco_tank_number: r.aramcoTankNumber || '',
      new_tank_number: r.newTankNumber || '',
      classification: r.classification || 'STEEL',
      model: r.model || '',
      product: r.product || '',
      quantity: r.quantity || 0,
      authorized_vehicle: r.authorizedVehicle || '',
      plate_number: r.plateNumber || '',
      region: r.region || '',
      status: r.status || 'OPERATIONAL',
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: r.updatedAt || new Date().toISOString()
    }));

    const capacityCategoriesSeeded = (db.capacityCategories || []).map(c => ({
      id: c.id,
      name: c.name || '',
      min_capacity: c.min_capacity || 0,
      max_capacity: c.max_capacity || 0,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString()
    }));

    const specialStandbyLedgerSeeded = (db.specialStandbyLedger || []).map(s => ({
      id: s.id,
      sn: s.sn || '',
      product: s.product || '',
      capacity: s.capacity || 0,
      status: s.status || '',
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString()
    }));

    const profilesSeeded = (db.users || []).map(u => ({
      id: u.id,
      username: u.username || '',
      email: u.email || '',
      name: u.name || '',
      role: u.role || 'viewer',
      status: u.status || 'active',
      avatar_url: u.avatarUrl || '',
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.updatedAt || new Date().toISOString()
    }));

    const auditLogsSeeded = (db.logs || []).map(l => ({
      id: l.id,
      user_id: l.userId || '',
      username: l.username || '',
      user_role: l.userRole || '',
      action: l.action || '',
      details: l.details || '',
      timestamp: l.timestamp || new Date().toISOString()
    }));

    // Insert seeded arrays into AlaSQL
    if (alasql.tables && alasql.tables.tanker_records) {
      alasql.tables.tanker_records.data = tankerRecordsSeeded;
    }
    if (alasql.tables && alasql.tables.capacity_categories) {
      alasql.tables.capacity_categories.data = capacityCategoriesSeeded;
    }
    if (alasql.tables && alasql.tables.special_standby_ledger) {
      alasql.tables.special_standby_ledger.data = specialStandbyLedgerSeeded;
    }
    if (alasql.tables && alasql.tables.profiles) {
      alasql.tables.profiles.data = profilesSeeded;
    }
    if (alasql.tables && alasql.tables.audit_logs) {
      alasql.tables.audit_logs.data = auditLogsSeeded;
    }

    // 4. Run the SQL query in AlaSQL
    const result = alasql(sql);

    // 5. Determine if this was a modifying query (INSERT, UPDATE, DELETE)
    const normalizedSql = sql.trim().toUpperCase();
    const isModification = normalizedSql.startsWith('INSERT') || 
                           normalizedSql.startsWith('UPDATE') || 
                           normalizedSql.startsWith('DELETE') ||
                           normalizedSql.startsWith('REPLACE') ||
                           normalizedSql.startsWith('DROP') ||
                           normalizedSql.startsWith('ALTER') ||
                           normalizedSql.startsWith('CREATE');

    if (isModification) {
      // Update tanker records
      if (alasql.tables && alasql.tables.tanker_records) {
        db.records = alasql.tables.tanker_records.data.map((r: any) => ({
          sn: r.sn,
          aramcoTankNumber: r.aramco_tank_number,
          newTankNumber: r.new_tank_number,
          classification: r.classification,
          model: r.model,
          product: r.product,
          quantity: r.quantity,
          authorizedVehicle: r.authorized_vehicle,
          plateNumber: r.plate_number,
          region: r.region,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }

      // Update capacity categories
      if (alasql.tables && alasql.tables.capacity_categories) {
        db.capacityCategories = alasql.tables.capacity_categories.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          min_capacity: c.min_capacity,
          max_capacity: c.max_capacity,
          created_at: c.created_at,
          updated_at: c.updated_at
        }));
      }

      // Update special standby ledger
      if (alasql.tables && alasql.tables.special_standby_ledger) {
        db.specialStandbyLedger = alasql.tables.special_standby_ledger.data.map((s: any) => ({
          id: s.id,
          sn: s.sn,
          product: s.product,
          capacity: s.capacity,
          status: s.status,
          created_at: s.created_at,
          updated_at: s.updated_at
        }));
      }

      // Update users/profiles
      if (alasql.tables && alasql.tables.profiles) {
        db.users = alasql.tables.profiles.data.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          avatarUrl: u.avatar_url,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        }));
      }

      // Update logs
      if (alasql.tables && alasql.tables.audit_logs) {
        db.logs = alasql.tables.audit_logs.data.map((l: any) => ({
          id: l.id,
          userId: l.user_id,
          username: l.username,
          userRole: l.user_role,
          action: l.action,
          details: l.details,
          timestamp: l.timestamp
        }));
      }

      // Save to db.json
      saveDatabase();

      // Log the SQL audit action
      logAction(
        req.user.id,
        req.user.username,
        req.user.role,
        'SQL_WRITE',
        `Executed raw modifying SQL query: "${sql.slice(0, 150)}${sql.length > 150 ? '...' : ''}"`
      );
    } else {
      // Log the SQL read audit action
      logAction(
        req.user.id,
        req.user.username,
        req.user.role,
        'SQL_READ',
        `Executed raw SQL query: "${sql.slice(0, 150)}${sql.length > 150 ? '...' : ''}"`
      );
    }

    res.json({
      success: true,
      isModification,
      rowsAffected: isModification ? (Array.isArray(result) ? result.length : (typeof result === 'number' ? result : 1)) : 0,
      result: Array.isArray(result) ? result : [result]
    });
  } catch (err: any) {
    console.error('SQL Execution Error:', err);
    res.status(400).json({ error: err.message || 'Error executing SQL query.' });
  }
});

// API 404 handler to prevent returning index.html for non-existent API requests
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found.` });
});

// Vite middleware for development or Static server for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.NETLIFY) {
    const viteModuleName = 'vite';
    const { createServer } = await import(viteModuleName);
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT && !process.env.AWS_EXECUTION_ENV) {
  startServer();
}

export default app;
