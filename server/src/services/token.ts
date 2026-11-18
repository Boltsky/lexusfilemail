import crypto from 'crypto';

export class TokenService {
  /**
   * Generates a 24-byte cryptographically secure random base64url token for the transfer URL.
   * Example URL: https://lexusmail.com/download/aB39_dF09k-2kL...
   */
  static generateTransferToken(): string {
    return crypto.randomBytes(24).toString('base64url');
  }

  /**
   * Compute the SHA-256 hash of a transfer token for database storage and lookup.
   * Storing hashes ensures that even if database records leak, download links cannot be discovered.
   */
  static hashTransferToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Generates a verification or reset token
   */
  static generateAuthToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
