import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import blogRoutes from './routes/blogRoutes';
import contactRoutes from './routes/contactRoutes';
import enquiryRoutes from './routes/enquiryRoutes';
import hrRoutes from './routes/hrRoutes';
import packageRoutes from './routes/packageRoutes';
import settingsRoutes from './routes/settingsRoutes';
import payrollRoutes from './routes/payrollRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import salesRoutes from './routes/salesRoutes';
import leadRoutes from './routes/leadRoutes';
import quotationRoutes from './routes/quotationRoutes';
import customerRoutes from './routes/customerRoutes';
import accountingRoutes from './routes/accountingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import revenueRoutes from './routes/revenueRoutes';
import gstRoutes from './routes/gstRoutes';
import expenseRoutes from './routes/expenseRoutes';
import pnlRoutes from './routes/pnlRoutes';
import payrollAccountingRoutes from './routes/payrollAccountingRoutes';
import reportRoutes from './routes/reportRoutes';
import operationsRoutes from './routes/operationsRoutes';
import groupTourRoutes from './routes/groupTourRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import timelineRoutes from './routes/timelineRoutes';
import notificationRoutes from './routes/notificationRoutes';
import tourPricingRoutes from './routes/tourPricingRoutes';

// RBAC & Security Routes
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';
import auditRoutes from './routes/auditRoutes';
import securityRoutes from './routes/securityRoutes';
import { seedRbac } from './utils/rbacSeeder';

import path from 'path';

const app = express();

// Serve uploaded media files securely
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Explicit CORS to allow all origins during development and tunnel access
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

// Core Routes
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/hr/payroll', payrollRoutes);
app.use('/api/packages', packageRoutes);
app.use('/packages', packageRoutes); // Route alias for public / direct frontend calls
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/crm/sales', salesRoutes);
app.use('/api/crm/leads', leadRoutes);
app.use('/api/crm/quotations', quotationRoutes);
app.use('/api/crm/customers', customerRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/accounting/payments', paymentRoutes);
app.use('/api/accounting/revenue', revenueRoutes);
app.use('/api/accounting/gst', gstRoutes);
app.use('/api/accounting/expenses', expenseRoutes);
app.use('/api/accounting/pnl', pnlRoutes);
app.use('/api/accounting/payroll', payrollAccountingRoutes);
app.use('/api/accounting/reports', reportRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/group-tours', groupTourRoutes);
app.use('/api/tour-pricing', tourPricingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ceo-dashboard', analyticsRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/notifications', notificationRoutes);

// RBAC & Security Module Routes
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/security', securityRoutes);

// Health check endpoints (support /, /health, and /api/health for Render)
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'UTC Travel API',
    timestamp: new Date().toISOString()
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ UTC Travel API running on http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/health`);
  
  // Seed/ensure RBAC permissions & default roles exist (runs in background so health check responds instantly)
  seedRbac().catch((err) => {
    console.warn('⚠️ Background RBAC seeding warning:', err?.message || err);
  });
});

// Graceful shutdown handling for container environments (Render/Docker)
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed successfully.');
    process.exit(0);
  });
});

