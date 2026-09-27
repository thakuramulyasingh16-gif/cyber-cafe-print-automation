import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';

const router = Router();

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10); // 50MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Get page count from PDF
async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const fileBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes);
    return pdfDoc.getPageCount();
  } catch {
    return 1; // Default to 1 if cannot read
  }
}

// POST /api/upload
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(createError('No file uploaded', 400, 'NO_FILE'));
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    
    let pageCount: number | null = null;
    if (ext === '.pdf') {
      pageCount = await getPdfPageCount(file.path);
    } else {
      pageCount = 1; // Images are 1 page
    }

    // Save document record
    const document = await prisma.document.create({
      data: {
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        pageCount,
      },
    });

    res.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.originalName,
        sizeBytes: document.sizeBytes,
        pageCount: document.pageCount,
        mimeType: document.mimeType,
      },
    });
  } catch (error) {
    // Cleanup file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(error);
  }
});

// GET /api/upload/:documentId - Get document info
router.get('/:documentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.documentId },
    });

    if (!document) {
      return next(createError('Document not found', 404));
    }

    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

export default router;
