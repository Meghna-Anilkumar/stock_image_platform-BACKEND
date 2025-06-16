import { Types } from "mongoose";

export interface IUser {
    _id: Types.ObjectId;
    name: string
    phone: string;
    email: string;
    dob: string;
}

export interface ISignupInput {
    name: string
    phone: string;
    email: string;
    dob: string;
    password: string;
    confirmPassword: string;
}


export interface ILoginInput {
    email?: string;
    phone?: string;
    password: string;
}