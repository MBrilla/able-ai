import { User as FirebaseUser } from 'firebase/auth';

/**
 * Email verification utility functions
 * Centralized logic for checking and handling email verification status
 */

export interface EmailVerificationStatus {
  isVerified: boolean;
  email: string | null;
  needsVerification: boolean;
}

/**
 * Check if a Firebase user's email is verified
 */
export function checkEmailVerificationStatus(user: FirebaseUser | null): EmailVerificationStatus {
  if (!user) {
    return {
      isVerified: false,
      email: null,
      needsVerification: false
    };
  }

  const isVerified = user.emailVerified;
  const email = user.email;

  return {
    isVerified,
    email,
    needsVerification: !isVerified && !!email
  };
}

/**
 * Check if user needs email verification before proceeding
 */
export function requiresEmailVerification(user: FirebaseUser | null): boolean {
  const status = checkEmailVerificationStatus(user);
  return status.needsVerification;
}

/**
 * Get user-friendly message for email verification status
 */
export function getEmailVerificationMessage(status: EmailVerificationStatus): string {
  if (!status.email) {
    return 'No email address found. Please contact support.';
  }

  if (status.isVerified) {
    return 'Your email has been verified successfully.';
  }

  return `Please verify your email address (${status.email}) to continue.`;
}

/**
 * Check if the current URL is an email verification link
 */
export function isEmailVerificationLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Check for common email verification parameters
    return !!(
      params.get('mode') === 'verifyEmail' ||
      params.get('oobCode') ||
      params.get('apiKey') ||
      url.includes('verifyEmail') ||
      url.includes('emailLink')
    );
  } catch {
    return false;
  }
}

/**
 * Extract email from verification URL parameters
 */
export function extractEmailFromVerificationUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Try different parameter names that might contain the email
    return params.get('email') || 
           params.get('userEmail') || 
           params.get('emailAddress') ||
           null;
  } catch {
    return null;
  }
}
