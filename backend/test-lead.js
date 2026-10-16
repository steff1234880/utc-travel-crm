async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@utctravel.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    const stagesRes = await fetch('http://localhost:5000/api/crm/sales/pipeline', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stagesData = await stagesRes.json();
    console.log('Stages response:', JSON.stringify(stagesData, null, 2));
    if (!stagesData.data || stagesData.data.length === 0) {
      console.log('No stages found in response.');
      return;
    }
    const firstStageId = stagesData.data[0].id;
    console.log('Fetched first stage ID:', firstStageId);

    const customerRes = await fetch('http://localhost:5000/api/crm/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: 'Test Customer',
        lastName: '',
        email: 'test@example.com',
        phone: ''
      })
    });
    const customerData = await customerRes.json();
    if (!customerData.success) {
      console.error('Customer creation failed:', customerData);
      return;
    }
    const customerId = customerData.data.id;
    console.log('Customer created:', customerId);

    const leadRes = await fetch('http://localhost:5000/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Dubai Vacation',
        source: 'Manual Entry',
        destination: 'Dubai',
        status: 'NEW',
        customerId: customerId,
        expectedValue: 0,
        priority: 'MEDIUM',
        pipelineStageId: firstStageId
      })
    });
    const leadData = await leadRes.json();
    if (!leadData.success) {
      console.error('Lead creation failed:', leadData);
    } else {
      console.log('Lead created successfully:', leadData.data.id);
    }
  } catch(e) {
    console.error('Test failed:', e.message);
  }
}
test();
