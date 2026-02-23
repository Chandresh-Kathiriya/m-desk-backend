import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export interface ITokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: ITokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'm-desk-jwt-secret-key-looks-like-this';
  const expiresIn = process.env.JWT_EXPIRE || '7d';
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

export const verifyToken = (token: string): ITokenPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'm-desk-jwt-secret-key-looks-like-this';
    const decoded = jwt.verify(token, secret) as ITokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
