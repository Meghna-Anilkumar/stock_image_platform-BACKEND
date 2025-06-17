import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from '../constants/statusCodes';


const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};


export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 10, 
    fieldSize: 1024 * 1024,
  },
  fileFilter,
}).array('images', 10); 


export const singleUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter,
}).single('image'); 


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