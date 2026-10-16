async function testUpdateLead() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@utctravel.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    if (!token) throw new Error('Failed to login');

    // 2. Get the first lead
    const leadsRes = await fetch('http://localhost:5000/api/crm/leads', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const leadsData = await leadsRes.json();
    const lead = leadsData.data[0];
    console.log('Testing with Lead ID:', lead.id);

    // 3. Update lead
    console.log('Updating lead...');
    const updateRes = await fetch(`http://localhost:5000/api/crm/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: lead.title + ' (Updated)',
        firstName: 'TestFirst',
        lastName: 'TestLast',
        followUpDate: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Testing quick follow-up from edit modal'
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error(updateData.error || 'Failed to update');
    console.log('Updated Lead Title:', updateData.data.title);
    
    // 4. Revert lead title
    await fetch(`http://localhost:5000/api/crm/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: lead.title,
      })
    });

    console.log('Lead updated and reverted successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testUpdateLead();
