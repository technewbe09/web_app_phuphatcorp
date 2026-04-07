import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserPublic } from '../types/user';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  roleId: number | null;
  permissions: string[];
}

export function generateAccessToken(user: UserPublic): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    roleId: user.role_id ?? null,
    permissions: user.permissions ?? [],
  };
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, env.jwt.secret, options);
}

export function generateRefreshToken(user: UserPublic): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    roleId: user.role_id ?? null,
    permissions: user.permissions ?? [],
  };
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, env.jwt.secret, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.secret) as TokenPayload;
}
