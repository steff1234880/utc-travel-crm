SELECT u.email, u."isActive", r.name as role_name
FROM "User" u
LEFT JOIN "Role" r ON r.id = u."roleId"
LIMIT 10;
