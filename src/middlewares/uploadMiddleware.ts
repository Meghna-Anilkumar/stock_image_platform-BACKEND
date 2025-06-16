import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from '../constants/statusCodes';

// Configure storage (in-memory for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('[uploadMiddleware] Processing file:', { originalname: file.originalname, mimetype: file.mimetype });
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    console.log('[uploadMiddleware] Invalid file type:', file.mimetype);
    cb(new Error('Only image files are allowed'));
  }
};

// Multer configuration for multiple files
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10, // Max 10 files per request
    fieldSize: 1024 * 1024, // 1MB for fields (e.g., titles)
  },
  fileFilter,
}).array('images', 10); // Field name 'images', max 10 files

// Multer configuration for single file (edit upload)
export const singleUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter,
}).single('image'); // Field name 'image' for edit

// Error handling middleware for multer
export const handleMulterErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error('[uploadMiddleware] Multer error:', err.message, { code: err.code });
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'File size exceeds 10MB limit' });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Too many files uploaded (max 10)' });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Unexpected file field' });
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
  } else if (err.message === 'Only image files are allowed') {
    console.error('[uploadMiddleware] File type error:', err.message);
    res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
  } else {
    next(err);
  }
};