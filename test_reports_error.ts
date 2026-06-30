import fetch from 'node-fetch';

async function testStats() {
  console.log('Testing statistics endpoint...');
  try {
    // 1. Attempt login as admin
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'adminpassword' })
    });
    
    const loginData: any = await loginRes.json();
    if (!loginData.token) {
      console.error('Login failed:', loginData);
      return;
    }
    
    const token = loginData.token;
    console.log('Login successful, token:', token);
    
    // 2. Test GET /api/reports/statistics
    const statsRes = await fetch('http://localhost:3000/api/reports/statistics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('/api/reports/statistics response status:', statsRes.status);
    console.log('/api/reports/statistics headers:', Object.fromEntries(statsRes.headers.entries()));
    const bodyText = await statsRes.text();
    console.log('/api/reports/statistics body (first 500 chars):', bodyText.slice(0, 500));
  } catch (err) {
    console.error('Test error:', err);
  }
}

testStats();
