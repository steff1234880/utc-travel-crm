async function run() {
  const login = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@utctravel.com',
      password: 'password'
    })
  }).then(r => r.json());
  
  const token = login.data.token;
  
  const fin = await fetch('http://localhost:5000/api/analytics/financials', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  
  console.log(JSON.stringify(fin.data.summary, null, 2));
}
run().catch(console.error);
