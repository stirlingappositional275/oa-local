/**
 * File Vault Routes
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { getConfig } from '../config';
import * as vault from '../services/file-vault';
import { logAction } from '../services/audit';

const router = Router();
router.use(authMiddleware);

// Multer setup
function getUpload() {
  const config = getConfig();
  const dir = path.resolve(config.upload.dir, 'vault');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (_r, _f, cb) => cb(null, dir),
      filename: (_r, f, cb) => cb(null, `${uuidv4()}${path.extname(f.originalname)}`),
    }),
    limits: { fileSize: config.upload.maxFileSize },
  });
}

/**
 * POST /api/vault/upload
 * Upload file + tag it
 */
router.post('/upload', (req: Request, res: Response) => {
  getUpload().array('files', 10)(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message });
    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.status(400).json({ error: 'No files' });

    const tenantId = getTenantId(req);
    const tag = req.body.tag || '普通附件';
    const approvalId = req.body.approvalId || null;
    const records = files.map(f => vault.saveFileRecord({
      tenantId, originalName: f.originalname, storedName: f.filename,
      filePath: f.path, size: f.size, mimeType: f.mimetype,
      tag, approvalId, uploadedBy: req.user!.email,
    }));

    logAction({ tenantId, userEmail: req.user!.email, userName: req.user!.name, action: 'file_upload', resourceType: 'file_vault', detail: `${files.length} files, tag=${tag}` });

    res.status(201).json({ message: 'Uploaded', files: records.map(r => ({ id: r.id, name: r.original_name, size: r.size, tag: r.tag })) });
  });
});

/**
 * GET /api/vault — list files
 */
router.get('/', (req: Request, res: Response) => {
  const files = vault.listFiles(getTenantId(req), String(req.query.tag), String(req.query.approvalId));
  res.json(files);
});

/**
 * GET /api/vault/stats — file stats
 */
router.get('/stats', (req: Request, res: Response) => {
  res.json(vault.getFileStats(getTenantId(req)));
});

/**
 * GET /api/vault/:id/preview — base64 preview (allowed)
 */
router.get('/:id/preview', (req: Request, res: Response) => {
  const fid = String(req.params.id);
  const preview = vault.getFilePreview(fid, getTenantId(req));
  if (!preview) return res.status(404).json({ error: 'File not found' });
  logAction({ tenantId: getTenantId(req), userEmail: req.user!.email, action: 'file_preview', resourceType: 'file_vault', resourceId: fid });
  res.json(preview);
});

/**
 * GET /api/vault/:id/download — admin only download
 */
router.get('/:id/download', (req: Request, res: Response) => {
  const fid = String(req.params.id);
  const isAdmin = req.user!.email === (process.env.ADMIN_EMAIL || '');
  const file = vault.getFileForDownload(fid, getTenantId(req), isAdmin);
  if (!file) return res.status(isAdmin ? 404 : 403).json({ error: isAdmin ? 'Not found' : 'Download blocked. Admin only.' });

  logAction({ tenantId: getTenantId(req), userEmail: req.user!.email, action: 'file_download', resourceType: 'file_vault', resourceId: fid, detail: isAdmin ? 'admin audit download' : '' });
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.send(file.data);
});

export default router;
