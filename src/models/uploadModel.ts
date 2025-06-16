import mongoose, { Schema } from "mongoose";
import { IUpload } from "../types/uploadEntity";

const UploadSchema = new Schema<IUpload>({
    title: { 
        type: String, 
        required: true,
        trim: true 
    },
    imageUrl: { 
        type: String, 
        required: true 
    },
    publicId: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    order: { 
        type: Number, 
        required: true,
        default: 1 
    }
}, {
    timestamps: true
});

const UploadModel = mongoose.model<IUpload>('Upload', UploadSchema);

export default UploadModel;