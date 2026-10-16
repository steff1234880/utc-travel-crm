import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000/api';
let adminToken = '';
let customerId = '';
let enquiryId = '';
let salesLeadId = '';
let quotationId = '';
let bookingId = '';

const TEST_EMAIL = `e2e_test_${Date.now()}@example.com`;

test.describe.serial('Critical Business Flow', () => {

  test('1. Create Website Enquiry', async ({ request }) => {
    const res = await request.post(`${API_BASE}/enquiries/submit`, {
      data: {
        firstName: 'E2E Test',
        lastName: 'User',
        email: TEST_EMAIL,
        phone: '1234567890',
        message: 'Automated E2E Test',
        destination: 'Japan',
        travelDate: '2027-01-01',
        budgetRange: '5000'
      }
    });
    
    expect(res.ok(), `Enquiry failed: ${await res.text()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

  test('2. Admin Login & Verify Lead', async ({ request }) => {
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'e2e@utctravel.com',
        password: 'password123'
      }
    });
    
    expect(loginRes.ok(), `Login failed: ${await loginRes.text()}`).toBeTruthy();
    const loginData = await loginRes.json();
    adminToken = loginData.accessToken;
    expect(adminToken).toBeDefined();

    // Fetch Enquiries to find the newly created one and get the Customer ID
    const enqRes = await request.get(`${API_BASE}/enquiries`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(enqRes.ok()).toBeTruthy();
    const enqData = await enqRes.json();
    
    const myEnquiry = enqData.data.find((e: any) => e.customer.email === TEST_EMAIL);
    expect(myEnquiry).toBeDefined();
    
    enquiryId = myEnquiry.id;
    customerId = myEnquiry.customerId;

    // Fetch Leads to get the salesLeadId for this enquiry
    const leadsRes = await request.get(`${API_BASE}/crm/leads`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const leadsData = await leadsRes.json();
    const myLead = leadsData.data.find((l: any) => l.enquiryId === enquiryId);
    expect(myLead, 'Lead not found for enquiry').toBeDefined();
    salesLeadId = myLead.id;
  });

  test('3. Create Quotation for Lead', async ({ request }) => {
    const res = await request.post(`${API_BASE}/crm/quotations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        salesLeadId: salesLeadId,
        customerId: customerId,
        validityDate: '2027-12-31',
        basePrice: 1000,
        items: [
          {
            title: 'E2E Package',
            quantity: 1,
            unitPrice: 1000
          }
        ]
      }
    });

    expect(res.ok(), `Quotation creation failed: ${await res.text()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    quotationId = json.data.id;
  });

  test('4. Accept Quotation', async ({ request }) => {
    const res = await request.post(`${API_BASE}/crm/quotations/public/${quotationId}/respond`, {
      data: {
        status: 'ACCEPTED',
        remarks: 'Accepted via E2E test'
      }
    });

    expect(res.ok(), `Accept quotation failed: ${await res.text()}`).toBeTruthy();
  });

  test('5. Convert to Booking', async ({ request }) => {
    const res = await request.post(`${API_BASE}/crm/quotations/${quotationId}/convert`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    expect(res.ok(), `Convert to booking failed: ${await res.text()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    bookingId = json.data.id;
  });

  test('6. Record Payment', async ({ request }) => {
    const res = await request.post(`${API_BASE}/accounting/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        quotationId: quotationId,
        customerId: customerId,
        amount: 1000,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TXN-E2E-1234',
        status: 'COMPLETED'
      }
    });

    expect(res.ok(), `Payment creation failed: ${await res.text()}`).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
  });

});
