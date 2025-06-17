import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SALT_ROUNDS = 10;


if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  throw new Error('JWT_SECRET is required');
}

if (!REFRESH_SECRET) {
  console.error('JWT_REFRESH_SECRET is not defined in environment variables');
  throw new Error('JWT_REFRESH_SECRET is required');
}

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateTokens = (userId: Types.ObjectId, email: string) => {
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, email }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};


export const verifyToken = (token: string): Promise<{ userId: string; email: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }

      if (typeof decoded === 'object' && decoded && 'userId' in decoded && 'email' in decoded) {
        resolve(decoded as { userId: string; email: string });
      } else {
        reject(new Error('Invalid token payload'));
      }
    });
  });
};

export const verifyRefreshToken = (token: string): Promise<{ userId: string; email: string }> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, REFRESH_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }

      if (typeof decoded === 'object' && decoded && 'userId' in decoded && 'email' in decoded) {
        resolve(decoded as { userId: string; email: string });
      } else {
        reject(new Error('Invalid refresh token payload'));
      }
    });
  });
};