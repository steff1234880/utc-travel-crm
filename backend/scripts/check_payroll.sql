-- Check employees and their salary structures
SELECT e.id, e."firstName", e."lastName", e.status, ss.id as structure_id, ss."basicSalary"
FROM "Employee" e
LEFT JOIN "SalaryStructure" ss ON ss."employeeId" = e.id
LIMIT 10;

-- Check SalaryAllowance rows
SELECT * FROM "SalaryAllowance" LIMIT 10;

-- Check SalaryDeduction rows
SELECT * FROM "SalaryDeduction" LIMIT 10;
