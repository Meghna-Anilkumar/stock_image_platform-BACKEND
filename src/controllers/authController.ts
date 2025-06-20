import { Request, Response } from "express";
import UserModel from "../models/userModel";
import { ISignupInput, ILoginInput } from "../types/userEntity";
import { hashPassword, verifyPassword, generateTokens, verifyRefreshToken } from "../utils/authUtils";
import { StatusCodes } from "../constants/statusCodes";
import { MESSAGES } from "../constants/messages";
import { Cookie } from "../utils/Enum";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";


export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password, confirmPassword } = req.body as ISignupInput;

    if (!name || !phone || !email || !password || !confirmPassword) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.ALL_FIELDS_REQUIRED });
      return;
    }

    if (password !== confirmPassword) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.PASSWORDS_DO_NOT_MATCH });
      return;
    }

    const existingUser = await UserModel.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.USER_EXISTS });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = new UserModel({
      name,
      phone,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(StatusCodes.CREATED).json({
      message: MESSAGES.USER_CREATED,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
      },
      redirectUrl: '/login'
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, password } = req.body as ILoginInput;

    if (!password || (!email && !phone)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.ALL_FIELDS_REQUIRED });
      return;
    }

    const user = await UserModel.findOne({
      $or: [{ email: email || "" }, { phone: phone || "" }],
    });

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.email);

    res.cookie(Cookie.userToken, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(StatusCodes.OK).json({
      message: MESSAGES.LOGIN_SUCCESSFUL,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
      },
      token: accessToken,
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    res.clearCookie(Cookie.userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.status(StatusCodes.OK).json({ message: MESSAGES.LOGOUT_SUCCESSFUL });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS
      });
      return;
    }

    const decoded = await verifyRefreshToken(refreshToken);

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS
      });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.email);

    res.cookie(Cookie.userToken, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Token refreshed',
      token: accessToken
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: MESSAGES.INVALID_CREDENTIALS
    });
  }
};


export const resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: MESSAGES.ALL_FIELDS_REQUIRED });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'usernot found' });
      return;
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'current password is wrong' });
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'invalid password fromat' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'password reset successfull' });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


