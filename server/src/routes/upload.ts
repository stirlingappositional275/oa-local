/**
 * File Upload Routes (sql.js version)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { getConfig } from '../config';
import { getDb, execute, queryOne } from '../db/connection';

const router = Router();
router.use(authMiddleware);

function getUploadMiddleware() {
  const config = getConfig();
  const uploadDir = path.resolve(config.upload.dir);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: config.upload.maxFileSize },
    fileFilter: (_req, file, cb) => {
      const allowed = ['application/pdf','image/jpeg','image/png','image/gif','image/webp',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip','text/plain'];
      cb(null, allowed.includes(file.mimetype));
    },
  });
}

router.post('/:id/attach', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    await getDb();
    const app = queryOne('SELECT id FROM approvals WHERE id = ? AND tenant_id = ?', [String(req.params.id), tenantId]);
    if (!app) { res.status(404).json({ error: 'Not found' }); return; }

    const upload = getUploadMiddleware();
    upload.array('files', 10)(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message }); return;
        }
        res.status(400).json({ error: err.message }); return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files?.length) { res.status(400).json({ error: 'No files' }); return; }

      const fileInfos = files.map(f => ({
        id: uuidv4(), originalName: f.originalname, storedName: f.filename,
        path: f.path, size: f.size, mimetype: f.mimetype, url: `/api/files/${f.filename}`,
      }));

      const attLink = JSON.stringify(fileInfos.map(f => f.url));
      execute("UPDATE approvals SET att_link = ?, att_state = 'uploaded', updated_at = ? WHERE id = ?",
        [attLink, new Date().toISOString(), String(req.params.id)]);

      res.status(201).json({
        message: 'Uploaded', files: fileInfos.map(f => ({ id: f.id, originalName: f.originalName, size: f.size, url: f.url })),
      });
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
