/**
 * OA Local Server - Main Entry Point (sql.js version)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getConfig } from './config';
import { getDb, closeDb } from './db/connection';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';

import authRoutes from './routes/auth';
import approvalRoutes from './routes/approvals';
import templateRoutes from './routes/templates';
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import exportRoutes from './routes/export';
import federationRoutes from './routes/federation';
import fileRoutes from './routes/files';
import adminRoutes from './routes/admin';

const app = express();
const config = getConfig();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', tenantId: config.tenantId, tenantName: config.tenantName, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', tenantMiddleware);
app.use('/api/approvals', approvalRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/approvals', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/federation', federationRoutes);
app.use('/api/vault', fileRoutes);
app.use('/api/admin', adminRoutes);

const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/api/files', authMiddleware, express.static(uploadDir));

if (config.nodeEnv === 'production') {
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await getDb();
  app.listen(config.port, () => {
    console.log(`\n`);
    console.log(`║  OA Approval System - Local Server                   ║`);
    console.log(`╠══════════════════════════════════════════════════════╣`);
    console.log(`║  Address:  http://localhost:${config.port}              ║`);
    console.log(`║  Tenant:   ${config.tenantName} (${config.tenantId})`.padEnd(50) + `║`);
    console.log(`║  Env:      ${config.nodeEnv}`.padEnd(50) + `║`);
    console.log(`║  Database: ${config.db.path}`.padEnd(50) + `║`);
    console.log(`╚══════════════════════════════════════════════════════╝\n`);
  });
}

process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

start();
export default app;
