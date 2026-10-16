import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../utils/auditLogger';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
            permissions: true
          }
        },
        permissions: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ success: true, data: roles });
  } catch (error) {
    console.error('getRoles error:', error);
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const getRoleById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            email: true,
            isActive: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    return res.json({ success: true, data: role });
  } catch (error) {
    console.error('getRoleById error:', error);
    return res.status(500).json({ error: 'Failed to fetch role details' });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions: {
          connect: Array.isArray(permissionIds) ? permissionIds.map((pid: string) => ({ id: pid })) : []
        }
      },
      include: { permissions: true }
    });

    await logAudit({
      req,
      action: 'ROLE_CREATE',
      module: 'User Management',
      recordId: role.id,
      newValue: { name: role.name, permissionsCount: role.permissions.length },
      status: 'SUCCESS',
      details: `Created new role '${role.name}'`
    });

    return res.status(201).json({ success: true, message: 'Role created successfully', data: role });
  } catch (error) {
    console.error('createRole error:', error);
    return res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, description, permissionIds } = req.body;

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true }
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (name && name !== role.name && !role.isSystem) updateData.name = name;

    if (Array.isArray(permissionIds)) {
      updateData.permissions = {
        set: permissionIds.map((pid: string) => ({ id: pid }))
      };
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
      include: { permissions: true }
    });

    await logAudit({
      req,
      action: 'ROLE_UPDATE',
      module: 'User Management',
      recordId: id,
      previousValue: { name: role.name, permissionsCount: role.permissions.length },
      newValue: { name: updated.name, permissionsCount: updated.permissions.length },
      status: 'SUCCESS',
      details: `Updated role permissions for '${updated.name}'`
    });

    return res.json({ success: true, message: 'Role updated successfully', data: updated });
  } catch (error) {
    console.error('updateRole error:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ error: 'Protected system roles cannot be deleted' });
    }

    if (role._count.users > 0) {
      return res.status(400).json({ error: `Cannot delete role '${role.name}' because it is assigned to ${role._count.users} user(s)` });
    }

    await prisma.role.delete({ where: { id } });

    await logAudit({
      req,
      action: 'ROLE_DELETE',
      module: 'User Management',
      recordId: id,
      previousValue: { name: role.name },
      status: 'SUCCESS',
      details: `Deleted custom role '${role.name}'`
    });

    return res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('deleteRole error:', error);
    return res.status(500).json({ error: 'Failed to delete role' });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }]
    });

    // Group permissions by module
    const grouped: Record<string, any[]> = {};
    permissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });

    return res.json({ success: true, data: permissions, grouped });
  } catch (error) {
    console.error('getPermissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
};
