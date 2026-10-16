const path = require('path');
const fs = require('fs');
const { PrismaClient } = require(path.join(__dirname, 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function backup() {
  console.log('Starting full database backup...');
  
  const backupData = {
    timestamp: new Date().toISOString(),
    users: await prisma.user.findMany(),
    roles: await prisma.role.findMany(),
    departments: await prisma.department.findMany(),
    designations: await prisma.designation.findMany(),
    employees: await prisma.employee.findMany(),
  };

  const backupPath = path.join(__dirname, 'db_backup_latest.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup completed successfully! Saved to: ${backupPath}`);
  console.log(`Records backed up: ${backupData.users.length} users, ${backupData.departments.length} departments, ${backupData.employees.length} employees.`);
}

backup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
