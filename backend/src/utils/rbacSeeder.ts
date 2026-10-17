import prisma from './prisma';

export const MODULES = [
  'Website Management',
  'Packages',
  'Enquiries',
  'Customers',
  'Sales CRM',
  'Quotations',
  'Bookings',
  'HR',
  'Employees',
  'Salary',
  'Accounting',
  'Payments',
  'Expenses',
  'Operations',
  'Tickets',
  'Hotels',
  'Vendors',
  'Dashboard',
  'Reports',
  'User Management',
  'System Settings',
  'Audit Logs'
];

export const ACTIONS = [
  'View',
  'Create',
  'Edit',
  'Delete',
  'Approve',
  'Export',
  'Assign',
  'Publish',
  'Manage'
];

export const DEFAULT_ROLES = [
  'CEO / Super Admin',
  'Admin',
  'HR Manager',
  'Sales Manager',
  'Sales Executive',
  'Accountant',
  'Operations Manager',
  'Reservation Executive',
  'Tour Coordinator'
];

export const seedRbac = async () => {
  try {
    console.log('🔄 Initializing RBAC System permissions and roles...');

    // Pre-flight check: verify Permission table exists before proceeding
    let existingPerms: Array<{ id: string; name: string }> = [];
    try {
      existingPerms = await prisma.permission.findMany({
        select: { id: true, name: true }
      });
    } catch (dbErr: any) {
      if (dbErr?.code === 'P2021' || dbErr?.message?.includes('does not exist')) {
        console.warn('⚠️ RBAC table "Permission" does not exist in the database yet. Skipping RBAC seeding until database tables are created.');
        return;
      }
      throw dbErr;
    }

    // 1. Seed Permissions (idempotent & batch-checked)
    const permMap = new Map<string, string>(existingPerms.map(p => [p.name, p.id]));
    const missingPermissions: Array<{ name: string; module: string; action: string; description: string }> = [];

    for (const moduleName of MODULES) {
      for (const action of ACTIONS) {
        const permName = `${moduleName.toLowerCase().replace(/\s+/g, '_')}:${action.toLowerCase()}`;
        if (!permMap.has(permName)) {
          missingPermissions.push({
            name: permName,
            module: moduleName,
            action,
            description: `Allows ${action.toLowerCase()} action in ${moduleName} module`
          });
        }
      }
    }

    if (missingPermissions.length > 0) {
      console.log(`🌱 Seeding ${missingPermissions.length} new system permissions...`);
      for (const p of missingPermissions) {
        const created = await prisma.permission.create({ data: p });
        permMap.set(p.name, created.id);
      }
    }

    const allPermIds = Array.from(permMap.values());

    // Helper to filter permission IDs by module or pattern
    const getPermIdsByModules = (moduleNames: string[]) => {
      const result: string[] = [];
      for (const [name, id] of permMap.entries()) {
        const mod = name.split(':')[0];
        if (moduleNames.some(m => m.toLowerCase().replace(/\s+/g, '_') === mod)) {
          result.push(id);
        }
      }
      return result;
    };

    // 2. Define Role-Permission Mappings
    const rolePermissionMap: Record<string, string[]> = {
      'CEO / Super Admin': allPermIds,
      'Admin': allPermIds,
      'HR Manager': getPermIdsByModules([
        'HR', 'Employees', 'Salary', 'User Management', 'Dashboard', 'Reports'
      ]),
      'Sales Manager': getPermIdsByModules([
        'Sales CRM', 'Enquiries', 'Customers', 'Quotations', 'Bookings', 'Packages', 'Dashboard', 'Reports'
      ]),
      'Sales Executive': getPermIdsByModules([
        'Sales CRM', 'Enquiries', 'Customers', 'Quotations', 'Dashboard'
      ]),
      'Accountant': getPermIdsByModules([
        'Accounting', 'Payments', 'Expenses', 'Salary', 'Reports', 'Dashboard'
      ]),
      'Operations Manager': getPermIdsByModules([
        'Operations', 'Tickets', 'Hotels', 'Vendors', 'Bookings', 'Packages', 'Dashboard', 'Reports'
      ]),
      'Reservation Executive': getPermIdsByModules([
        'Tickets', 'Hotels', 'Bookings', 'Operations', 'Dashboard'
      ]),
      'Tour Coordinator': getPermIdsByModules([
        'Operations', 'Tickets', 'Bookings', 'Dashboard'
      ])
    };

    // 3. Upsert Roles and Connect Permissions
    for (const roleName of DEFAULT_ROLES) {
      const isSuperAdmin = roleName === 'CEO / Super Admin' || roleName === 'Admin';
      const rolePermIds = rolePermissionMap[roleName] || [];

      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {
          description: `Standard system role for ${roleName}`,
          isSystem: isSuperAdmin,
          permissions: {
            set: rolePermIds.map(id => ({ id }))
          }
        },
        create: {
          name: roleName,
          description: `Standard system role for ${roleName}`,
          isSystem: isSuperAdmin,
          permissions: {
            connect: rolePermIds.map(id => ({ id }))
          }
        }
      });

      // Auto-assign CEO / Super Admin role to users without a role
      if (roleName === 'CEO / Super Admin') {
        await prisma.user.updateMany({
          where: { roleId: null },
          data: { roleId: role.id }
        });
      }
    }

    // 4. Ensure SecuritySettings default record exists
    try {
      const existingSettings = await prisma.securitySettings.findUnique({
        where: { id: 'default' }
      });

      if (!existingSettings) {
        await prisma.securitySettings.create({
          data: {
            id: 'default',
            passwordMinLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            sessionTimeoutMins: 120,
            maxLoginAttempts: 5,
            lockoutDurationMins: 15,
            auditLoggingEnabled: true,
            maxFileUploadMb: 10,
            allowedFileTypes: 'pdf,doc,docx,jpg,jpeg,png,webp,csv,xlsx'
          }
        });
      }
    } catch (secErr: any) {
      console.warn('⚠️ Could not verify default SecuritySettings:', secErr?.message);
    }

    console.log('✅ RBAC System Permissions and Roles initialized successfully.');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
  }
};
