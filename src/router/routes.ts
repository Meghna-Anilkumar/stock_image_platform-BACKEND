import { Router } from 'express';
import { signup, login, logout, refreshToken,resetPassword } from '../controllers/authController';
import {
  bulkUpload,
  getUserUploads,
  editUpload,
  deleteUpload,
  rearrangeUploads,
} from '../controllers/imageController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadMiddleware, singleUploadMiddleware, handleMulterErrors } from '../middlewares/uploadMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/reset-password',authMiddleware,resetPassword)

router.post('/uploads', authMiddleware, uploadMiddleware, handleMulterErrors, bulkUpload);
router.get('/uploads', authMiddleware, getUserUploads);
router.put('/uploads/:id', authMiddleware, singleUploadMiddleware, handleMulterErrors, editUpload);
router.delete('/uploads/:id', authMiddleware, deleteUpload);
router.post('/uploads/rearrange', authMiddleware, rearrangeUploads);

export default router;