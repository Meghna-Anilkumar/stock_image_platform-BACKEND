import { Request, Response } from 'express';
import UploadModel from '../models/uploadModel';
import { StatusCodes } from '../constants/statusCodes';
import { MESSAGES } from '../constants/messages';
import { Types } from 'mongoose';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';

// Extend Request interface to include user and multer file(s)
interface AuthenticatedRequest extends Request {
  user?: { _id: Types.ObjectId; email: string };
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }; // For uploadMiddleware (multiple files)
  file?: Express.Multer.File; // For singleUploadMiddleware (single file)
}

// Interface for update input
interface IUpdateInput {
  title?: string;
}

// Bulk upload controller
export const bulkUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    console.log('[imageController] Bulk upload request:', {
      userId,
      fileCount: Array.isArray(req.files) ? req.files.length : 0,
      body: req.body,
    });

    if (!userId) {
      console.log('[imageController] No user ID, unauthorized');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const titles = req.body.titles ? JSON.parse(req.body.titles) : [];

    if (!files || files.length === 0) {
      console.log('[imageController] No files uploaded');
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.NO_FILES_UPLOADED });
      return;
    }

    if (titles.length !== files.length) {
      console.log('[imageController] Mismatch between files and titles', {
        fileCount: files.length,
        titleCount: titles.length,
      });
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.TITLE_FILE_MISMATCH });
      return;
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const title = titles[i] || `Image ${i + 1}`;

      console.log('[imageController] Processing file:', {
        originalname: file.originalname,
        size: file.size,
        title,
      });

      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`);

      const newUpload = new UploadModel({
        title,
        imageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        userId,
        order: (await UploadModel.countDocuments({ userId })) + 1,
      });

      await newUpload.save();
      uploadedImages.push({
        id: newUpload._id.toString(), // Convert ObjectId to string
        title: newUpload.title,
        imageUrl: newUpload.imageUrl,
        order: newUpload.order,
      });
    }

    console.log('[imageController] Bulk upload success:', { uploadedCount: uploadedImages.length });
    res.status(StatusCodes.CREATED).json({
      message: MESSAGES.UPLOAD_SUCCESSFUL,
      uploads: uploadedImages,
    });
  } catch (error) {
    console.error('[imageController] Bulk upload error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// View uploads
export const getUserUploads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    console.log('[imageController] Get uploads request:', { userId });

    if (!userId) {
      console.log('[imageController] No user ID, unauthorized');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const uploads = await UploadModel.find({ userId })
      .select('title imageUrl order')
      .sort({ order: 1 });

    // Transform the response to ensure consistent ID field
    const transformedUploads = uploads.map(upload => ({
      id: upload._id.toString(), // Convert ObjectId to string for frontend consistency
      title: upload.title,
      imageUrl: upload.imageUrl,
      order: upload.order,
    }));

    console.log('[imageController] Get uploads success:', { count: transformedUploads.length });
    res.status(StatusCodes.OK).json({
      message: MESSAGES.SUCCESS,
      uploads: transformedUploads,
    });
  } catch (error) {
    console.error('[imageController] Get uploads error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Edit upload
export const editUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title }: IUpdateInput = req.body;
    const file = req.file; // Use req.file for singleUploadMiddleware
    const userId = req.user?._id;

    console.log('[imageController] Edit upload request:', { id, title, hasFile: !!file, userId });

    if (!userId) {
      console.log('[imageController] No user ID, unauthorized');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    // Validate ID format and ensure it's not undefined
    if (!id || id === 'undefined' || id === 'null' || !Types.ObjectId.isValid(id)) {
      console.log('[imageController] Invalid ID:', id);
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ID });
      return;
    }

    const upload = await UploadModel.findOne({ _id: id, userId });

    if (!upload) {
      console.log('[imageController] Upload not found:', { id, userId });
      res.status(StatusCodes.NOT_FOUND).json({ message: MESSAGES.UPLOAD_NOT_FOUND });
      return;
    }

    // Update fields
    if (title !== undefined && title !== null) {
      upload.title = title;
    }

    if (file) {
      console.log('[imageController] Updating image file');
      // Delete old image from Cloudinary
      if (upload.publicId) {
        await deleteFromCloudinary(upload.publicId);
      }

      // Upload new image
      const cloudinaryResult = await uploadToCloudinary(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
      upload.imageUrl = cloudinaryResult.secure_url;
      upload.publicId = cloudinaryResult.public_id;
    }

    await upload.save();

    console.log('[imageController] Edit upload success:', { id });
    res.status(StatusCodes.OK).json({
      message: MESSAGES.UPLOAD_UPDATED,
      upload: {
        id: upload._id.toString(), // Ensure consistent ID format
        title: upload.title,
        imageUrl: upload.imageUrl,
        order: upload.order,
      },
    });
  } catch (error) {
    console.error('[imageController] Edit upload error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Delete upload
export const deleteUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    console.log('[imageController] Delete upload request:', { id, userId });

    if (!userId) {
      console.log('[imageController] No user ID, unauthorized');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    // Validate ID format and ensure it's not undefined
    if (!id || id === 'undefined' || id === 'null' || !Types.ObjectId.isValid(id)) {
      console.log('[imageController] Invalid ID:', id);
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ID });
      return;
    }

    const upload = await UploadModel.findOne({ _id: id, userId });

    if (!upload) {
      console.log('[imageController] Upload not found:', { id, userId });
      res.status(StatusCodes.NOT_FOUND).json({ message: MESSAGES.UPLOAD_NOT_FOUND });
      return;
    }

    // Delete from Cloudinary
    if (upload.publicId) {
      await deleteFromCloudinary(upload.publicId);
    }

    // Delete from database
    await UploadModel.deleteOne({ _id: id });

    // Update orders of remaining uploads
    await UploadModel.updateMany(
      { userId, order: { $gt: upload.order } },
      { $inc: { order: -1 } }
    );

    console.log('[imageController] Delete upload success:', { id });
    res.status(StatusCodes.OK).json({
      message: MESSAGES.UPLOAD_DELETED,
    });
  } catch (error) {
    console.error('[imageController] Delete upload error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

// Rearrange uploads
export const rearrangeUploads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { order }: { order: string[] } = req.body;
    const userId = req.user?._id;

    console.log('[imageController] Rearrange uploads request:', { userId, order });

    if (!userId) {
      console.log('[imageController] No user ID, unauthorized');
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    if (!Array.isArray(order)) {
      console.log('[imageController] Invalid order array');
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    // Validate all IDs in the order array
    const validIds = order.filter(id => id && id !== 'undefined' && id !== 'null' && Types.ObjectId.isValid(id));
    if (validIds.length !== order.length) {
      console.log('[imageController] Invalid IDs in order array:', { provided: order, valid: validIds });
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    // Verify all IDs are valid and belong to user
    const uploads = await UploadModel.find({
      _id: { $in: validIds },
      userId,
    });

    if (uploads.length !== validIds.length) {
      console.log('[imageController] Invalid order:', { provided: validIds.length, found: uploads.length });
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    // Update order for each upload
    const updatePromises = validIds.map((id, index) =>
      UploadModel.updateOne({ _id: id, userId }, { $set: { order: index + 1 } })
    );

    await Promise.all(updatePromises);

    console.log('[imageController] Rearrange uploads success:', { order: validIds });
    res.status(StatusCodes.OK).json({
      message: MESSAGES.REORDER_SUCCESSFUL,
    });
  } catch (error) {
    console.error('[imageController] Rearrange uploads error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};