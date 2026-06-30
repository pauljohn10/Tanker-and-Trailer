async function test() {
  const credentials = [
    { username: 'admin', password: 'adminpassword' },
    { username: 'staff', password: 'staffpassword' },
    { username: 'viewer', password: 'viewerpassword' }
  ];

  for (const cred of credentials) {
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      console.log(`User: ${cred.username} - Status: ${res.status}`);
      const body = await res.json();
      console.log('Response:', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error(`Error for user ${cred.username}:`, err);
    }
  }
}
test();
