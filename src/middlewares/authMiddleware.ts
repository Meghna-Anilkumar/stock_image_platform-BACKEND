import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/authUtils";
import { StatusCodes } from "../constants/statusCodes";
import { MESSAGES } from "../constants/messages";
import { Types } from "mongoose";
import { Cookie } from "../utils/Enum";
import UserModel from "../models/userModel";

interface AuthenticatedRequest extends Request {
  user?: { _id: Types.ObjectId; email: string };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔍 Auth Middleware - All Cookies:', req.cookies);
    
    const token = req.cookies[Cookie.userJWT];
    console.log('🔍 Auth Middleware - Token found:', !!token);
    
    if (!token) {
      console.log('❌ Auth Middleware - No access token found');
      res.status(StatusCodes.UNAUTHORIZED).json({ 
        success: false, 
        message: MESSAGES.INVALID_CREDENTIALS,
        shouldRefresh: true // Signal frontend to try refresh
      });
      return;
    }

    console.log('🔍 Auth Middleware - Verifying access token...');
    const decoded = await verifyToken(token);
    console.log('🔍 Auth Middleware - Token decoded:', { userId: decoded.userId, email: decoded.email });

    // Verify user still exists
    const user = await UserModel.findById(decoded.userId);
    console.log('🔍 Auth Middleware - User found:', !!user);
    
    if (!user) {
      console.log('❌ Auth Middleware - User not found in database');
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

    console.log('✅ Auth Middleware - Success');
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    
    // Check if it's a JWT verification error
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        console.log('❌ JWT Error - Access token expired, should refresh');
        res.status(StatusCodes.UNAUTHORIZED).json({ 
          success: false, 
          message: MESSAGES.INVALID_CREDENTIALS,
          shouldRefresh: true // Signal frontend to try refresh
        });
        return;
      } else if (error.name === 'JsonWebTokenError') {
        console.log('❌ JWT Error - Invalid token format');
      } else if (error.name === 'NotBeforeError') {
        console.log('❌ JWT Error - Token not active');
      }
    }
    
    res.status(StatusCodes.UNAUTHORIZED).json({ 
      success: false, 
      message: MESSAGES.INVALID_CREDENTIALS
    });
  }
};
