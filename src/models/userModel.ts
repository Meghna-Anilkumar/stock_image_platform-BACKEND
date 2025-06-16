import mongoose, { Schema } from "mongoose";
import { ISignupInput } from "../types/userEntity";

const UserSchema = new Schema<ISignupInput>({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

}, {
    timestamps: true,
});

const UserModel = mongoose.model<ISignupInput>('User', UserSchema);

export default UserModel;