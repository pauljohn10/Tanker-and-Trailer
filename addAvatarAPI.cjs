const fs = require('fs');

// 1. Update supabaseService.ts
let supabaseServiceContent = fs.readFileSync('src/lib/supabaseService.ts', 'utf8');

const uploadFunction = `
export async function dbUploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string, originalName: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client not initialized');

  const ext = originalName.split('.').pop() || 'jpg';
  const filePath = \`avatars/\${userId}_\${Date.now()}.\${ext}\`;

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
`;

if (!supabaseServiceContent.includes('dbUploadAvatar')) {
  supabaseServiceContent += uploadFunction;
  fs.writeFileSync('src/lib/supabaseService.ts', supabaseServiceContent);
}

// 2. Update server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
const avatarEndpoint = `
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
      console.error('Avatar upload failed:', err);
      return res.status(500).json({ error: 'Avatar upload failed', details: err.message });
    }
  } else {
    // Local fallback: just return a fake URL or base64 (since /tmp is wiped anyway)
    const base64 = \`data:\${req.file.mimetype};base64,\${req.file.buffer.toString('base64')}\`;
    return res.json({ avatarUrl: base64 });
  }
});
`;

if (!serverContent.includes('/auth/avatar/upload')) {
  serverContent = serverContent.replace(
    `apiRouter.put('/auth/profile'`,
    avatarEndpoint + `\napiRouter.put('/auth/profile'`
  );
  fs.writeFileSync('server.ts', serverContent);
}

// 3. Update api.ts
let apiContent = fs.readFileSync('src/lib/api.ts', 'utf8');
const apiFunction = `
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(\`\${API_BASE}/auth/avatar/upload\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${sessionStorage.getItem('al_noor_token')}\`
      },
      body: formData,
    });
    return handleResponse(res);
  },
`;

if (!apiContent.includes('uploadAvatar(')) {
  apiContent = apiContent.replace(
    `async updateProfile`,
    apiFunction + `\n  async updateProfile`
  );
  fs.writeFileSync('src/lib/api.ts', apiContent);
}

console.log('Successfully added Avatar API endpoints.');
