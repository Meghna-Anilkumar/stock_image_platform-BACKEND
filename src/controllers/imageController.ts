import { Request, Response } from 'express';
import UploadModel from '../models/uploadModel';
import { StatusCodes } from '../constants/statusCodes';
import { MESSAGES } from '../constants/messages';
import { Types } from 'mongoose';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';


interface AuthenticatedRequest extends Request {
  user?: { _id: Types.ObjectId; email: string };
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  file?: Express.Multer.File;
}

interface IUpdateInput {
  title?: string;
}


export const bulkUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const titles = req.body.titles ? JSON.parse(req.body.titles) : [];

    if (!files || files.length === 0) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.NO_FILES_UPLOADED });
      return;
    }

    if (titles.length !== files.length) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.TITLE_FILE_MISMATCH });
      return;
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const title = titles[i] || `Image ${i + 1}`;

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
        id: newUpload._id.toString(),
        title: newUpload.title,
        imageUrl: newUpload.imageUrl,
        order: newUpload.order,
      });
    }

    res.status(StatusCodes.CREATED).json({
      message: MESSAGES.UPLOAD_SUCCESSFUL,
      uploads: uploadedImages,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const getUserUploads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const uploads = await UploadModel.find({ userId })
      .select('title imageUrl order')
      .sort({ order: 1 });

    const transformedUploads = uploads.map(upload => ({
      id: upload._id.toString(),
      title: upload.title,
      imageUrl: upload.imageUrl,
      order: upload.order,
    }));

    res.status(StatusCodes.OK).json({
      message: MESSAGES.SUCCESS,
      uploads: transformedUploads,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const editUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title }: IUpdateInput = req.body;
    const file = req.file;
    const userId = req.user?._id;


    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }
    if (!id || id === 'undefined' || id === 'null' || !Types.ObjectId.isValid(id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ID });
      return;
    }

    const upload = await UploadModel.findOne({ _id: id, userId });

    if (!upload) {
      res.status(StatusCodes.NOT_FOUND).json({ message: MESSAGES.UPLOAD_NOT_FOUND });
      return;
    }

    if (title !== undefined && title !== null) {
      upload.title = title;
    }

    if (file) {
      if (upload.publicId) {
        await deleteFromCloudinary(upload.publicId);
      }

      const cloudinaryResult = await uploadToCloudinary(`data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
      upload.imageUrl = cloudinaryResult.secure_url;
      upload.publicId = cloudinaryResult.public_id;
    }

    await upload.save();
    res.status(StatusCodes.OK).json({
      message: MESSAGES.UPLOAD_UPDATED,
      upload: {
        id: upload._id.toString(),
        title: upload.title,
        imageUrl: upload.imageUrl,
        order: upload.order,
      },
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const deleteUpload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    if (!id || id === 'undefined' || id === 'null' || !Types.ObjectId.isValid(id)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ID });
      return;
    }

    const upload = await UploadModel.findOne({ _id: id, userId });

    if (!upload) {
      res.status(StatusCodes.NOT_FOUND).json({ message: MESSAGES.UPLOAD_NOT_FOUND });
      return;
    }

    if (upload.publicId) {
      await deleteFromCloudinary(upload.publicId);
    }

    await UploadModel.deleteOne({ _id: id });

    await UploadModel.updateMany(
      { userId, order: { $gt: upload.order } },
      { $inc: { order: -1 } }
    );

    res.status(StatusCodes.OK).json({
      message: MESSAGES.UPLOAD_DELETED,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const rearrangeUploads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { order }: { order: string[] } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    if (!Array.isArray(order)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    const validIds = order.filter(id => id && id !== 'undefined' && id !== 'null' && Types.ObjectId.isValid(id));
    if (validIds.length !== order.length) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    const uploads = await UploadModel.find({
      _id: { $in: validIds },
      userId,
    });

    if (uploads.length !== validIds.length) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.INVALID_ORDER });
      return;
    }

    const updatePromises = validIds.map((id, index) =>
      UploadModel.updateOne({ _id: id, userId }, { $set: { order: index + 1 } })
    );

    await Promise.all(updatePromises);

    res.status(StatusCodes.OK).json({
      message: MESSAGES.REORDER_SUCCESSFUL,
    });
  } catch (error) {
    console.error('[imageController] Rearrange uploads error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


