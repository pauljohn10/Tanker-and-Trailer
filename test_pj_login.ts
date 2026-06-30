async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'pj@a.com', password: '123123' }) // whatever password they use, or random
    });
    console.log(`Status: ${res.status}`);
    const body = await res.json();
    console.log('Response:', JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
