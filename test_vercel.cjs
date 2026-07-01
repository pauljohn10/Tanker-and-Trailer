

async function run() {
  try {
    const loginRes = await fetch('https://tanker-and-trailer.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'adminpassword' })
    });
    
    if (!loginRes.ok) {
      console.log('Login failed:', loginRes.status, await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Logged in, token:', token);
    
    const record = {
      aramcoTankNumber: '123',
      newTankNumber: 'TN-2-99999999',
      classification: 'STEEL',
      model: '2026',
      product: 'PETROL',
      quantity: 36000,
      authorizedVehicle: '122',
      region: 'NAJRAN',
      status: 'OPERATIONAL'
    };
    
    const postRes = await fetch('https://tanker-and-trailer.vercel.app/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(record)
    });
    
    const text = await postRes.text();
    console.log('Post record response:', postRes.status, text);
  } catch (err) {
    console.error(err);
  }
}

run();
