import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();

// Serve uploaded media files securely
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Explicit CORS to allow all origins during development and tunnel access
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'UTC Travel API is running with RBAC & Security Module',
    timestamp: new Date().toISOString(),
    db: 'postgresql@localhost:5432/utc_travel'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`✅ UTC Travel API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  // Seed/ensure RBAC permissions & default roles exist
  await seedRbac();
});
