async function testFollowUps() {
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

    // 2. Get the first lead in the system to test with
    const leadsRes = await fetch('http://localhost:5000/api/crm/leads', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const leadsData = await leadsRes.json();
    const leadId = leadsData.data[0].id;
    console.log('Testing with Lead ID:', leadId);

    // 3. Create a follow-up
    console.log('Creating follow-up...');
    const createRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: 'Call',
        notes: 'Call to discuss initial requirements',
        scheduledFor: new Date(Date.now() + 86400000).toISOString()
      })
    });
    const createData = await createRes.json();
    if (!createData.success) throw new Error(createData.error || 'Failed to create');
    const followUpId = createData.data.id;
    console.log('Created Follow-up ID:', followUpId);

    // 4. Update the follow-up
    console.log('Updating follow-up...');
    const updateRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}/followups/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status: 'COMPLETED',
        notes: 'Call completed, sent brochure.'
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success) throw new Error(updateData.error || 'Failed to update');
    console.log('Updated Follow-up Status:', updateData.data.status);

    // 5. Delete the follow-up
    console.log('Deleting follow-up...');
    const deleteRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}/followups/${followUpId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    if (!deleteData.success) throw new Error(deleteData.error || 'Failed to delete');
    console.log('Deleted Follow-up successfully!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFollowUps();
