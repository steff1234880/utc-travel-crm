async function testDeleteLead() {
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

    // 2. Create a temporary lead to delete
    console.log('Creating temporary lead...');
    const createRes = await fetch(`http://localhost:5000/api/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Delete Test Lead',
        source: 'Manual Entry',
        firstName: 'Delete',
        lastName: 'Me',
        email: 'delete@test.com'
      })
    });
    const createData = await createRes.json();
    if (!createData.success) throw new Error(createData.error || 'Failed to create lead');
    const leadId = createData.data.id;
    console.log('Created temporary lead:', leadId);

    // 3. Delete the lead
    console.log('Deleting lead...');
    const deleteRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    if (!deleteData.success) throw new Error(deleteData.error || 'Failed to delete lead');
    console.log('Lead deleted successfully:', deleteData.message);

    // 4. Verify it's gone
    const verifyRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (verifyRes.status === 404) {
      console.log('Verification passed: Lead is completely removed.');
    } else {
      console.log('Verification failed: Lead might still exist (status ' + verifyRes.status + ')');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDeleteLead();
