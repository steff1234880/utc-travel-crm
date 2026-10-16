import { generatePnLStatement } from './src/services/pnlService';
async function run() {
  const res = await generatePnLStatement({ startDate: new Date('2026-01-01T00:00:00.000Z') });
  console.log(JSON.stringify(res, null, 2));
}
run();
