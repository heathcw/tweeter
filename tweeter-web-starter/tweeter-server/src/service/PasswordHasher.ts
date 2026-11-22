// AI-assisted: see AI-ATTRIBUTION.md

import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

export class PasswordHasher {
  public async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  public async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
