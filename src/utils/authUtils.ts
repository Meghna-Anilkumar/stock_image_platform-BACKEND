import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SALT_ROUNDS = 10;


if (!JWT_SECRET) {
  console.error('[authUtils] JWT_SECRET is not defined in environment variables');
  throw new Error('JWT_SECRET is required');
}

if (!REFRESH_SECRET) {
  console.error('[authUtils] JWT_REFRESH_SECRET is not defined in environment variables');
  throw new Error('JWT_REFRESH_SECRET is required');
}

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateTokens = (userId: Types.ObjectId, email: string) => {
  console.log('[authUtils] Generating tokens for user:', { userId, email });
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, email }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Legacy function
export const generateToken = (userId: Types.ObjectId, email: string): string => {
  console.log('[authUtils] Generating legacy token for user:', { userId, email });
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): Promise<{ userId: string; email: string }> => {
  return new Promise((resolve, reject) => {
    console.log('🔍 Verifying access token with secret length:', JWT_SECRET.length);
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('❌ Access token verification failed:', err.message);
        reject(err);
        return;
      }

      if (typeof decoded === 'object' && decoded && 'userId' in decoded && 'email' in decoded) {
        console.log('✅ Access token verification successful');
        resolve(decoded as { userId: string; email: string });
      } else {
        console.error('❌ Access token payload invalid');
        reject(new Error('Invalid token payload'));
      }
    });
  });
};

export const verifyRefreshToken = (token: string): Promise<{ userId: string; email: string }> => {
  return new Promise((resolve, reject) => {
    console.log('🔍 Verifying refresh token with secret length:', REFRESH_SECRET.length);
    jwt.verify(token, REFRESH_SECRET, (err, decoded) => {
      if (err) {
        console.error('❌ Refresh token verification failed:', err.message);
        reject(err);
        return;
      }

      if (typeof decoded === 'object' && decoded && 'userId' in decoded && 'email' in decoded) {
        console.log('✅ Refresh token verification successful');
        resolve(decoded as { userId: string; email: string });
      } else {
        console.error('❌ Refresh token payload invalid');
        reject(new Error('Invalid refresh token payload'));
      }
    });
  });
};