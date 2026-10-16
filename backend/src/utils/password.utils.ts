import bcrypt from 'bcrypt';
import prisma from './prisma';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, storedHash: string): Promise<boolean> => {
  if (!storedHash || !password) return false;

  // Check if stored string is bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compare(password, storedHash);
  }

  // Fallback for legacy plain-text passwords during migration
  return password === storedHash;
};

export const validatePasswordStrength = async (password: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const settings = await prisma.securitySettings.findUnique({ where: { id: 'default' } });
    const minLength = settings?.passwordMinLength || 8;
    const reqUpper = settings?.requireUppercase ?? true;
    const reqLower = settings?.requireLowercase ?? true;
    const reqNum = settings?.requireNumbers ?? true;
    const reqSpecial = settings?.requireSpecialChars ?? true;

    if (password.length < minLength) {
      return { isValid: false, message: `Password must be at least ${minLength} characters long.` };
    }

    if (reqUpper && !/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }

    if (reqLower && !/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }

    if (reqNum && !/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number.' };
    }

    if (reqSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character.' };
    }

    return { isValid: true };
  } catch (error) {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    return { isValid: true };
  }
};
