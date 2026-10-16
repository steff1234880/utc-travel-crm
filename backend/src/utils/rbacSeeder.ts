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

    // 1. Seed Permissions
    const createdPermissions: Record<string, string> = {};

    for (const moduleName of MODULES) {
      for (const action of ACTIONS) {
        const permName = `${moduleName.toLowerCase().replace(/\s+/g, '_')}:${action.toLowerCase()}`;
        const description = `Allows ${action.toLowerCase()} action in ${moduleName} module`;

        const permission = await prisma.permission.upsert({
          where: { name: permName },
          update: { module: moduleName, action, description },
          create: {
            name: permName,
            module: moduleName,
            action,
            description
          }
        });
        createdPermissions[permName] = permission.id;
      }
    }

    const allPermIds = Object.values(createdPermissions);

    // Helper to filter permission IDs by module or pattern
    const getPermIdsByModules = (moduleNames: string[]) => {
      return Object.entries(createdPermissions)
        .filter(([name]) => {
          const mod = name.split(':')[0];
          return moduleNames.some(m => m.toLowerCase().replace(/\s+/g, '_') === mod);
        })
        .map(([_, id]) => id);
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
    await prisma.securitySettings.upsert({
      where: { id: 'default' },
      update: {},
      create: {
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

    console.log('✅ RBAC System Permissions and Roles initialized successfully.');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
  }
};
