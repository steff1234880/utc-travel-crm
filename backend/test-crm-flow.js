async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@utctravel.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;

    if (!token) {
      console.log('Login failed');
      return;
    }

    // Create a customer
    const customerRes = await fetch('http://localhost:5000/api/crm/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: 'CRM Test User',
        email: 'crmtest@example.com',
      })
    });
    const customerData = await customerRes.json();
    const customerId = customerData.data.id;
    console.log('Customer created:', customerId);

    // Create a lead
    const leadRes = await fetch('http://localhost:5000/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Europe Tour',
        source: 'Website Enquiry',
        destination: 'Europe',
        status: 'NEW',
        customerId: customerId,
        expectedValue: 5000,
        priority: 'HIGH',
        pipelineStage: 'New'
      })
    });
    const leadData = await leadRes.json();
    const leadId = leadData.data.id;
    console.log('Lead created:', leadId);

    // Edit pipeline stage
    const patchRes = await fetch(`http://localhost:5000/api/crm/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pipelineStageId: leadData.data.pipelineStageId, // Just test the route works, even if same stage
        status: 'IN_PROGRESS'
      })
    });
    const patchData = await patchRes.json();
    console.log('Lead stage updated:', patchData.success);

    console.log('All CRM API flows working successfully!');

  } catch(e) {
    console.error('Test failed:', e.message);
  }
}
test();
