import { createClient } from '@supabase/supabase-js';

// Lazy loading environment variables
const getSupabaseConfig = () => {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Use service role key if available to bypass RLS for administrative backend queries, fall back to anon key
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const cleanEnvVar = (v: any): string | undefined => {
    if (!v || typeof v !== 'string') return undefined;
    let cleaned = v.trim();
    // Strip leading/trailing double quotes or single quotes
    cleaned = cleaned.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    return cleaned;
  };

  const cleanedUrl = cleanEnvVar(url);
  const cleanedKey = cleanEnvVar(key);

  const isValidStr = (v: any): boolean => {
    if (!v) return false;
    return v !== '' &&
           v !== 'undefined' &&
           v !== 'null' &&
           !v.includes('your-project') &&
           !v.includes('placeholder') &&
           !v.includes('YOUR_');
  };

  if (isValidStr(cleanedUrl) && isValidStr(cleanedKey)) {
    return { url: cleanedUrl, key: cleanedKey };
  }
  return { url: undefined, key: undefined };
};

let supabaseClient: any = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { url, key } = getSupabaseConfig();
  if (url && key && url !== 'https://your-project.supabase.co') {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log('✅ Supabase Client initialized successfully.');
      return supabaseClient;
    } catch (err) {
      console.error('❌ Failed to create Supabase Client:', err);
    }
  }
  return null;
}

export function isSupabaseActive(): boolean {
  return getSupabaseClient() !== null;
}

// Memory cache state for Supabase calls to prevent rate limiting (429)
let cachedUsers: any[] | null = null;
let cachedUsersTime = 0;

let cachedRecords: any[] | null = null;
let cachedRecordsTime = 0;

let cachedSettings: any | null = null;
let cachedSettingsTime = 0;

let cachedLogs: any[] | null = null;
let cachedLogsTime = 0;

const CACHE_TTL = 8000; // 8 seconds cache window

// Dynamically auto-detect column name if user setup SQL database with 'branch' instead of 'branch_station'
export let detectedPasswordColumn: 'branch_station' | 'branch' = 'branch_station';

export function clearUsersCache() {
  cachedUsers = null;
  cachedUsersTime = 0;
}

export function clearRecordsCache() {
  cachedRecords = null;
  cachedRecordsTime = 0;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cachedSettingsTime = 0;
}

export function clearLogsCache() {
  cachedLogs = null;
  cachedLogsTime = 0;
}

// Map database columns to JS properties
export function toDbRecord(r: any) {
  const dbRec: any = {
    aramco_tank_number: r.aramcoTankNumber || '',
    new_tank_number: r.newTankNumber,
    classification: r.classification,
    model: r.model || '',
    product: r.product,
    quantity: Number(r.quantity),
    authorized_vehicle: r.authorizedVehicle || '',
    region: r.region || '',
    status: r.status || 'OPERATIONAL',
    created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString()
  };
  if (r.sn !== undefined && r.sn !== null && !isNaN(Number(r.sn))) {
    dbRec.sn = Number(r.sn);
  }
  return dbRec;
}

export function fromDbRecord(r: any) {
  return {
    sn: r.sn,
    aramcoTankNumber: r.aramco_tank_number,
    newTankNumber: r.new_tank_number,
    classification: r.classification,
    model: r.model,
    product: r.product,
    quantity: Number(r.quantity),
    authorizedVehicle: r.authorized_vehicle || r.plate_number || '',
    region: r.region,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export function toDbUser(u: any) {
  const username = u.username || '';
  const dbUser: any = {
    id: u.id,
    username: username,
    name: u.name,
    role: u.role,
    status: u.status,
    avatar_url: u.avatarUrl || '',
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (detectedPasswordColumn === 'branch') {
    dbUser.branch = u.password || '';
  } else {
    dbUser.branch_station = u.password || '';
  }
  return dbUser;
}

export function fromDbUser(u: any) {
  if (!u) return null;
  const username = u.username || '';
  return {
    id: u.id || '',
    username: username,
    email: u.email || (username.includes('@') ? username : (username ? `${username}@alnoor.com` : '')),
    name: u.name || '',
    role: u.role || 'viewer',
    status: u.status || 'active',
    avatarUrl: u.avatar_url || '',
    password: u.branch_station || u.branch || '',
    createdAt: u.created_at || new Date().toISOString()
  };
}

export function toDbLog(l: any) {
  const isValidUuid = (val: any) => {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  };

  const dbLog: any = {
    username: l.username,
    user_role: l.userRole || l.user_role,
    action: l.action,
    details: l.details,
    timestamp: (l.timestamp || l.created_at) ? new Date(l.timestamp || l.created_at).toISOString() : new Date().toISOString()
  };

  if (isValidUuid(l.id)) {
    dbLog.id = l.id;
  }

  const potentialUserId = l.userId || l.user_id;
  if (isValidUuid(potentialUserId)) {
    dbLog.user_id = potentialUserId;
  } else {
    dbLog.user_id = null;
  }

  return dbLog;
}

export function fromDbLog(l: any) {
  if (!l) return null;
  return {
    id: l.id || '',
    userId: l.user_id || 'system',
    username: l.username || 'system',
    userRole: l.user_role || 'viewer',
    action: l.action || 'INFO',
    details: l.details || '',
    timestamp: l.timestamp || new Date().toISOString()
  };
}

export function toDbSettings(s: any) {
  const settingsObj = s || {};
  return {
    id: 1,
    allow_public_sharing: settingsObj.allowPublicSharing !== false,
    enable_audit_trails: settingsObj.enableAuditTrails !== false,
    default_pagination_size: isNaN(Number(settingsObj.defaultPaginationSize)) ? 15 : Number(settingsObj.defaultPaginationSize),
    maintenance_mode: settingsObj.maintenanceMode === true
  };
}

export function fromDbSettings(s: any) {
  if (!s) return {
    allowPublicSharing: true,
    enableAuditTrails: true,
    defaultPaginationSize: 15,
    maintenanceMode: false
  };
  return {
    allowPublicSharing: s.allow_public_sharing !== false,
    enableAuditTrails: s.enable_audit_trails !== false,
    defaultPaginationSize: isNaN(Number(s.default_pagination_size)) ? 15 : Number(s.default_pagination_size),
    maintenanceMode: s.maintenance_mode === true
  };
}

// Core DB operations
export async function dbGetRecords(): Promise<any[]> {
  const now = Date.now();
  if (cachedRecords && (now - cachedRecordsTime < CACHE_TTL)) {
    return cachedRecords;
  }

  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('tanker_records')
    .select('*')
    .order('sn', { ascending: true });
  
  if (error) {
    console.error('Error fetching records from Supabase:', error);
    throw error;
  }
  cachedRecords = (data || []).map(fromDbRecord);
  cachedRecordsTime = Date.now();
  return cachedRecords;
}

export async function dbAddRecord(record: any): Promise<any> {
  clearRecordsCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const dbRec = toDbRecord(record);
  
  let retries = 5;
  while (retries > 0) {
    const { data: maxData } = await client
      .from('tanker_records')
      .select('sn')
      .order('sn', { ascending: false })
      .limit(1);
      
    const nextSn = (maxData && maxData.length > 0) ? Number(maxData[0].sn) + 1 : 1;
    dbRec.sn = nextSn;

    const { data, error } = await client
      .from('tanker_records')
      .insert([dbRec])
      .select();
      
    if (!error && data && data.length > 0) {
      return fromDbRecord(data[0]);
    }

    if (error && error.code === '23505') {
      retries--;
      await new Promise(res => setTimeout(res, 50 + Math.random() * 100));
      continue;
    }

    console.error('Error adding record to Supabase:', error);
    throw error;
  }
  throw new Error('Failed to generate unique sequential SN for the new record.');
}

export async function dbUpdateRecord(sn: number, record: any): Promise<any> {
  clearRecordsCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const dbRec = toDbRecord(record);
  delete dbRec.sn; // Prevent modification of primary key column during update
  const { data, error } = await client
    .from('tanker_records')
    .update(dbRec)
    .eq('sn', sn)
    .select();
  
  if (error) {
    console.error('Error updating record in Supabase:', error);
    throw error;
  }
  const updatedRecord = data && data[0] ? data[0] : { ...dbRec, sn };
  return fromDbRecord(updatedRecord);
}

export async function dbDeleteRecord(sn: number): Promise<boolean> {
  clearRecordsCache();
  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client
    .from('tanker_records')
    .delete()
    .eq('sn', sn)
    .select();
  
  if (error) {
    console.error('Error deleting record in Supabase:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    throw new Error('Deletion failed: No rows deleted in Supabase. Ensure SUPABASE_SERVICE_ROLE_KEY is set in secrets to bypass Row Level Security.');
  }

  // Trigger re-sequencing in the background
  dbResequenceRecords().catch(err => console.error('Failed to re-sequence records after deletion:', err));

  return true;
}

export async function dbDeleteRecords(sns: number[]): Promise<boolean> {
  clearRecordsCache();
  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client
    .from('tanker_records')
    .delete()
    .in('sn', sns)
    .select();
  
  if (error) {
    console.error('Error bulk deleting records in Supabase:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Bulk deletion failed: No rows deleted in Supabase. Ensure SUPABASE_SERVICE_ROLE_KEY is set in secrets to bypass Row Level Security.');
  }

  // Trigger re-sequencing in the background
  dbResequenceRecords().catch(err => console.error('Failed to re-sequence records after bulk deletion:', err));

  return true;
}

export async function dbResequenceRecords(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data, error } = await client
      .from('tanker_records')
      .select('sn')
      .order('sn', { ascending: true });

    if (error || !data) return;

    for (let i = 0; i < data.length; i++) {
      const expectedSn = i + 1;
      if (data[i].sn !== expectedSn) {
        await client
          .from('tanker_records')
          .update({ sn: expectedSn })
          .eq('sn', data[i].sn);
      }
    }
    clearRecordsCache();
  } catch (err) {
    console.error('Error re-sequencing records:', err);
  }
}

export async function dbGetUsers(): Promise<any[]> {
  const now = Date.now();
  if (cachedUsers && (now - cachedUsersTime < CACHE_TTL)) {
    return cachedUsers;
  }

  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const fetchPromise = client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }: any) => {
        if (error) {
          console.error('Error fetching users from Supabase:', error);
          throw error;
        }
        return data || [];
      });

    const timeoutPromise = new Promise<any[]>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Supabase dbGetUsers query timed out (3000ms limit)'));
      }, 3000);
    });

    const data = await Promise.race([fetchPromise, timeoutPromise]);

    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      if (keys.includes('branch') && !keys.includes('branch_station')) {
        detectedPasswordColumn = 'branch';
      } else {
        detectedPasswordColumn = 'branch_station';
      }
    }

    cachedUsers = (data || []).map(fromDbUser);
    cachedUsersTime = Date.now();
    return cachedUsers;
  } catch (err: any) {
    console.error('⚠️ dbGetUsers query failed or timed out:', err.message || String(err));
    throw err;
  }
}

export async function dbAddUser(user: any): Promise<any> {
  clearUsersCache();
  const client = getSupabaseClient();
  if (!client) return null;

  const email = user.email || (user.username && user.username.includes('@') ? user.username : `${user.username}@alnoor.com`);
  const password = user.password || 'alnoor12345';

  let authUserId = user.id;
  let authCreated = false;

  // Try creating in auth.users
  try {
    if (client.auth?.admin) {
      const result = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          name: user.name,
          role: user.role,
          avatar_url: user.avatarUrl || ''
        }
      });
      if (result.error) {
        console.warn(`Admin user creation failed for ${user.username}, error message: ${result.error.message}`);
        if (result.error.message?.includes('already exists') || result.error.status === 422) {
          const { data: listData } = await client.auth.admin.listUsers();
          const existingAuth = listData?.users?.find((u: any) => u.email === email);
          if (existingAuth) {
            authUserId = existingAuth.id;
            authCreated = true;
          }
        }
      } else if (result.data?.user) {
        authUserId = result.data.user.id;
        authCreated = true;
      }
    }
  } catch (err) {
    console.error(`Error in admin createUser for ${user.username}:`, err);
  }

  // Fallback to client-side signUp if admin is not available or failed and we don't have a valid UUID yet
  const isValidUuid = (val: any) => {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  };

  if (!authCreated || !isValidUuid(authUserId)) {
    try {
      console.log(`Fallback to signUp for user ${user.username}...`);
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: user.username,
            name: user.name,
            role: user.role,
            avatar_url: user.avatarUrl || ''
          }
        }
      });

      if (!signUpError && signUpData?.user) {
        authUserId = signUpData.user.id;
        authCreated = true;
        console.log(`✅ Fallback signUp succeeded for ${user.username}. ID: ${authUserId}`);
      } else {
        if (signUpError) {
          console.warn(`Fallback signUp failed for ${user.username}:`, signUpError.message);
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            if (client.auth?.admin) {
              const { data: listData } = await client.auth.admin.listUsers();
              const existingAuth = listData?.users?.find((u: any) => u.email === email);
              if (existingAuth) {
                authUserId = existingAuth.id;
                authCreated = true;
              }
            }
          }
        }
      }
    } catch (signUpErr) {
      console.error('Fallback signUp error:', signUpErr);
    }
  }

  if (!isValidUuid(authUserId)) {
    authUserId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-0000-0000-000000000000'.replace(/[018]/g, (c: any) => (Number(c) ^ (Math.random() * 16 >> Number(c) / 4)).toString(16));
  }

  try {
    let { data: existingProfile } = await client
      .from('profiles')
      .select('*')
      .or(`id.eq.${authUserId},username.eq.${user.username}`)
      .maybeSingle();

    if (existingProfile) {
      console.log(`Profile already exists for ${user.username}, verifying password field...`);
      const existingPassword = existingProfile.branch_station || existingProfile.branch;
      if (user.password && !existingPassword) {
        console.log(`⚡ Updating missing password field for existing profile ${user.username}...`);
        try {
          const updatePayload: any = {};
          if (detectedPasswordColumn === 'branch') {
            updatePayload.branch = user.password;
          } else {
            updatePayload.branch_station = user.password;
          }
          const { data: updatedProfileData } = await client
            .from('profiles')
            .update(updatePayload)
            .eq('id', existingProfile.id)
            .select();
          if (updatedProfileData && updatedProfileData[0]) {
            existingProfile = updatedProfileData[0];
          }
        } catch (updateErr) {
          console.error(`Failed to update password for existing profile ${user.username}:`, updateErr);
        }
      }
      return fromDbUser(existingProfile);
    }
  } catch (err) {
    console.warn(`Error checking existing profile for ${user.username}:`, err);
  }

  const dbUsr = toDbUser({
    ...user,
    id: authUserId,
    email
  });

  const { data, error } = await client
    .from('profiles')
    .upsert([dbUsr])
    .select();

  if (error) {
    console.error('Error adding user profile in Supabase:', error);
    throw error;
  }
  const insertedUser = data && data[0] ? data[0] : dbUsr;
  return fromDbUser(insertedUser);
}

export async function dbUpdateUser(id: string, user: any): Promise<any> {
  clearUsersCache();
  const client = getSupabaseClient();
  if (!client) return null;

  if (user.password && client.auth?.admin) {
    try {
      await client.auth.admin.updateUserById(id, { password: user.password });
    } catch (err) {
      console.warn('Failed to update user password in Supabase auth:', err);
    }
  }

  const dbUsr = toDbUser(user);
  delete dbUsr.id;

  const { data, error } = await client
    .from('profiles')
    .update(dbUsr)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error updating user in Supabase:', error);
    throw error;
  }
  const updatedUser = data && data[0] ? data[0] : { ...dbUsr, id };
  return fromDbUser(updatedUser);
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  clearUsersCache();
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    if (client.auth?.admin) {
      const { error: authError } = await client.auth.admin.deleteUser(id);
      if (!authError) return true;
      console.warn('Admin delete user failed, trying direct profile delete:', authError.message);
    }
  } catch (err) {
    console.warn('Admin delete user error, trying direct profile delete:', err);
  }

  const { error } = await client
    .from('profiles')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting user in Supabase:', error);
    throw error;
  }
  return true;
}

export async function dbGetLogs(): Promise<any[]> {
  const now = Date.now();
  if (cachedLogs && (now - cachedLogsTime < CACHE_TTL)) {
    return cachedLogs;
  }

  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1000);
  
  if (error) {
    console.error('Error fetching logs from Supabase:', error);
    throw error;
  }
  cachedLogs = (data || []).map(fromDbLog);
  cachedLogsTime = Date.now();
  return cachedLogs;
}

export async function dbAddLog(log: any): Promise<any> {
  clearLogsCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const dbLg = toDbLog(log);
  
  let { data, error } = await client
    .from('audit_logs')
    .insert([dbLg])
    .select();
  
  // If we hit a foreign key constraint violation (23503) due to a non-existent profiles ID,
  // we retry by setting user_id to null so the audit log persists.
  if (error && error.code === '23503' && dbLg.user_id !== null) {
    console.warn('⚠️ Foreign key violation on user_id in audit_logs, retrying with user_id = null...');
    const retryDbLg = { ...dbLg, user_id: null };
    const retryResult = await client
      .from('audit_logs')
      .insert([retryDbLg])
      .select();
    data = retryResult.data;
    error = retryResult.error;
  }
  
  if (error) {
    console.error('Error adding log in Supabase:', error);
    return null;
  }
  return data ? fromDbLog(data[0]) : null;
}

export async function dbGetSettings(): Promise<any> {
  const now = Date.now();
  if (cachedSettings !== null && (now - cachedSettingsTime < CACHE_TTL)) {
    return cachedSettings;
  }

  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error) {
    console.error('Error fetching settings from Supabase:', error);
    return null;
  }
  cachedSettings = fromDbSettings(data);
  cachedSettingsTime = Date.now();
  return cachedSettings;
}

export async function dbUpdateSettings(settings: any): Promise<any> {
  clearSettingsCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const dbSet = toDbSettings(settings);
  const { data, error } = await client
    .from('system_settings')
    .update(dbSet)
    .eq('id', 1)
    .select();
  
  if (error) {
    console.error('Error updating settings in Supabase:', error);
    throw error;
  }
  return data ? fromDbSettings(data[0]) : null;
}

// Performs automatic migration from JSON to Supabase if Supabase database tables are empty
export async function performAutoMigration(localDb: { records: any[]; users: any[]; logs: any[]; settings: any }): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    console.log('🔄 Checking if Supabase data migration is needed...');

    // 1. Sync Settings
    const { count: settingsCount } = await client.from('system_settings').select('*', { count: 'exact', head: true });
    if (settingsCount === 0) {
      console.log('⚡ Migrating System Settings to Supabase...');
      const dbSettings = toDbSettings(localDb.settings);
      await client.from('system_settings').insert([dbSettings]);
    }

    // 2. Sync Profiles / Users
    if (localDb.users.length > 0) {
      console.log(`⚡ Checking and migrating missing User Profiles to Supabase...`);
      try {
        const { data: existingProfiles, error: fetchErr } = await client.from('profiles').select('*');
        if (fetchErr) throw fetchErr;

        if (existingProfiles && existingProfiles.length > 0) {
          const keys = Object.keys(existingProfiles[0]);
          if (keys.includes('branch') && !keys.includes('branch_station')) {
            detectedPasswordColumn = 'branch';
          } else {
            detectedPasswordColumn = 'branch_station';
          }
        }
        
        for (const u of localDb.users) {
          if (u && u.username) {
            const existing = (existingProfiles || []).find((p: any) => p.username?.toLowerCase() === u.username.toLowerCase());
            const passwordVal = existing ? (existing.branch_station || existing.branch) : undefined;
            const needsSync = !existing || !passwordVal;
            
            if (needsSync) {
              try {
                console.log(`⚡ Seeding or repairing profile ${u.username} in Supabase...`);
                await dbAddUser(u);
              } catch (userErr) {
                console.error(`⚠️ Failed to migrate/repair user ${u.username}:`, userErr);
              }
            }
          }
        }
      } catch (err) {
        console.error('⚠️ Failed to fetch existing user profiles for migration check:', err);
      }
    }

    // 3. Sync Tanker Records
    const { count: recordsCount } = await client.from('tanker_records').select('*', { count: 'exact', head: true });
    if (recordsCount === 0 && localDb.records.length > 0) {
      console.log(`⚡ Migrating ${localDb.records.length} Tanker Records to Supabase...`);
      
      // Ensure all unique regions exist in Supabase regions table before inserting records
      try {
        const uniqueRegions = Array.from(new Set(localDb.records.map(r => r.region).filter(Boolean)));
        const { data: existingRegionsData } = await client.from('regions').select('name');
        const existingRegions = new Set((existingRegionsData || []).map((r: any) => r.name));
        const missingRegions = uniqueRegions.filter(r => !existingRegions.has(r));
        if (missingRegions.length > 0) {
          console.log(`⚡ Seeding missing regions for auto-migration:`, missingRegions);
          await client.from('regions').insert(missingRegions.map(name => ({ name })));
        }
      } catch (regErr) {
        console.error('⚠️ Failed to pre-seed regions table:', regErr);
      }

      // Insert in chunks of 50 to stay well under packet size limit
      const chunkSize = 50;
      for (let i = 0; i < localDb.records.length; i += chunkSize) {
        const chunk = localDb.records.slice(i, i + chunkSize).map(toDbRecord);
        const { error } = await client.from('tanker_records').insert(chunk);
        if (error) {
          console.error(`❌ Error migrating record chunk starting at index ${i}:`, JSON.stringify(error, null, 2));
        }
      }
      console.log('✅ Tanker records successfully migrated.');
    }

    // 4. Sync Audit Logs
    const { count: logsCount } = await client.from('audit_logs').select('*', { count: 'exact', head: true });
    if (logsCount === 0 && localDb.logs.length > 0) {
      console.log(`⚡ Migrating ${localDb.logs.length} Audit Logs to Supabase...`);
      
      // Fetch currently existing profile IDs to prevent FK errors
      const { data: profileData } = await client.from('profiles').select('id');
      const validProfileIds = new Set((profileData || []).map((p: any) => p.id));

      const dbLogs = localDb.logs.map(toDbLog).map((log: any) => {
        if (log && log.user_id && !validProfileIds.has(log.user_id)) {
          log.user_id = null;
        }
        return log;
      }).filter((log: any) => log !== null);
      
      const chunkSize = 50;
      for (let i = 0; i < dbLogs.length; i += chunkSize) {
        const chunk = dbLogs.slice(i, i + chunkSize);
        const { error } = await client.from('audit_logs').insert(chunk);
        if (error) {
          console.error(`❌ Error migrating log chunk starting at index ${i}:`, JSON.stringify(error, null, 2));
        }
      }
    }

    console.log('✅ Supabase auto-migration and sync checks completed.');
  } catch (err) {
    console.error('⚠️ Supabase Auto-Migration failed (Verify that tables exist and RLS/policies are configured):', err);
  }
}

// Cache for Capacity Categories and Special Standby Ledger
let cachedCapCategories: any[] | null = null;
let cachedCapCategoriesTime = 0;

let cachedStandbyLedger: any[] | null = null;
let cachedStandbyLedgerTime = 0;

export function clearCapCategoriesCache() {
  cachedCapCategories = null;
  cachedCapCategoriesTime = 0;
}

export function clearStandbyLedgerCache() {
  cachedStandbyLedger = null;
  cachedStandbyLedgerTime = 0;
}

export async function dbGetCapacityCategories(): Promise<any[]> {
  const now = Date.now();
  if (cachedCapCategories && (now - cachedCapCategoriesTime < CACHE_TTL)) {
    return cachedCapCategories;
  }
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('capacity_categories')
    .select('*')
    .order('min_capacity', { ascending: true });
  if (error) {
    console.warn('[Supabase Fallback] Capacity categories remote query not available:', error.message || error);
    throw error;
  }
  cachedCapCategories = data || [];
  cachedCapCategoriesTime = Date.now();
  return cachedCapCategories;
}

export async function dbAddCapacityCategory(cat: any): Promise<any> {
  clearCapCategoriesCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('capacity_categories')
    .insert([{
      name: cat.name.toUpperCase(),
      min_capacity: Number(cat.min_capacity),
      max_capacity: Number(cat.max_capacity)
    }])
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to add capacity category:', error.message || error);
    throw error;
  }
  return data ? data[0] : null;
}

export async function dbUpdateCapacityCategory(id: number, cat: any): Promise<any> {
  clearCapCategoriesCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('capacity_categories')
    .update({
      name: cat.name.toUpperCase(),
      min_capacity: Number(cat.min_capacity),
      max_capacity: Number(cat.max_capacity)
    })
    .eq('id', id)
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to update capacity category:', error.message || error);
    throw error;
  }
  return data ? data[0] : null;
}

export async function dbDeleteCapacityCategory(id: number): Promise<boolean> {
  clearCapCategoriesCache();
  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client
    .from('capacity_categories')
    .delete()
    .eq('id', id)
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to delete capacity category:', error.message || error);
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Deletion failed: No rows deleted in Supabase. Ensure SUPABASE_SERVICE_ROLE_KEY is set in secrets.');
  }
  return true;
}

export async function dbGetSpecialStandbyLedger(): Promise<any[]> {
  const now = Date.now();
  if (cachedStandbyLedger && (now - cachedStandbyLedgerTime < CACHE_TTL)) {
    return cachedStandbyLedger;
  }
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('special_standby_ledger')
    .select('*')
    .order('id', { ascending: true });
  if (error) {
    console.warn('[Supabase Fallback] Special standby ledger remote query not available:', error.message || error);
    throw error;
  }
  cachedStandbyLedger = data || [];
  cachedStandbyLedgerTime = Date.now();
  return cachedStandbyLedger;
}

export async function dbAddSpecialStandbyLedger(entry: any): Promise<any> {
  clearStandbyLedgerCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('special_standby_ledger')
    .insert([{
      sn: entry.sn,
      product: entry.product.toUpperCase(),
      capacity: Number(entry.capacity),
      status: entry.status
    }])
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to add special standby ledger entry:', error.message || error);
    throw error;
  }
  return data ? data[0] : null;
}

export async function dbUpdateSpecialStandbyLedger(id: number, entry: any): Promise<any> {
  clearStandbyLedgerCache();
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('special_standby_ledger')
    .update({
      sn: entry.sn,
      product: entry.product.toUpperCase(),
      capacity: Number(entry.capacity),
      status: entry.status
    })
    .eq('id', id)
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to update special standby ledger entry:', error.message || error);
    throw error;
  }
  return data ? data[0] : null;
}

export async function dbDeleteSpecialStandbyLedger(id: number): Promise<boolean> {
  clearStandbyLedgerCache();
  const client = getSupabaseClient();
  if (!client) return false;
  const { data, error } = await client
    .from('special_standby_ledger')
    .delete()
    .eq('id', id)
    .select();
  if (error) {
    console.warn('[Supabase Fallback] Unable to delete special standby ledger entry:', error.message || error);
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error('Deletion failed: No rows deleted in Supabase. Ensure SUPABASE_SERVICE_ROLE_KEY is set in secrets.');
  }
  return true;
}

export async function dbUploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string, originalName: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const ext = originalName.split('.').pop() || 'jpg';
  const filePath = `avatars/${userId}_${Date.now()}.${ext}`;

  const { data, error } = await client.storage
    .from('profiles')
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error('Error uploading avatar to Supabase:', error);
    throw error;
  }

  const { data: publicUrlData } = client.storage
    .from('profiles')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
