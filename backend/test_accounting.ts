const { getDashboardSummary } = require('./src/controllers/accountingController');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const req = { query: {} };
  let responseData;
  let statusCode;
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; }
  };
  
  try {
    await getDashboardSummary(req, res);
    console.log("Status:", statusCode);
    console.log("Response:", JSON.stringify(responseData, null, 2));
  } catch (err) {
    console.error("Crash!", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
