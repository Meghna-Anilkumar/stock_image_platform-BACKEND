import { Types } from "mongoose";

export interface IUpload {
    _id?: Types.ObjectId;
    title: string;
    imageUrl: string;
    publicId: string;
    userId: Types.ObjectId;
    order: number;
    createdAt?: Date;
    updatedAt?: Date;
}