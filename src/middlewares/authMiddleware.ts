import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/authUtils";
import { StatusCodes } from "../constants/statusCodes";
import { MESSAGES } from "../constants/messages";
import { Types } from "mongoose";
import { Cookie } from "../utils/Enum";
import UserModel from "../models/userModel";

export interface AuthenticatedRequest extends Request {
  user?: { _id: Types.ObjectId; email: string };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies[Cookie.userToken];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS,
        shouldRefresh: true
      });
      return;
    }

    const decoded = await verifyToken(token);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS
      });
      return;
    }

    req.user = {
      _id: new Types.ObjectId(decoded.userId),
      email: decoded.email,
    };

    next();
  } catch (error) {

    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: MESSAGES.INVALID_CREDENTIALS,
          shouldRefresh: true
        });
        return;
      } else if (error.name === 'JsonWebTokenError') {
        console.log('JWT Error - Invalid token format');
      } else if (error.name === 'NotBeforeError') {
        console.log('JWT Error - Token not active');
      }
    }

    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: MESSAGES.INVALID_CREDENTIALS
    });
  }
};
