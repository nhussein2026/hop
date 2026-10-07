import { z } from 'zod';

// Passwords are never trimmed: surrounding spaces are part of what the user chose.
const newPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(256, 'Password cannot exceed 256 characters');

const existingPassword = z.string().min(1, 'Password is required').max(256, 'Password cannot exceed 256 characters');

export const setupPasswordSchema = z.object({ password: newPassword }).strict();
export const loginSchema = z.object({ password: existingPassword }).strict();
export const changePasswordSchema = z.object({ currentPassword: existingPassword, newPassword }).strict();
