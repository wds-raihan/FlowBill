/**
 * Authentication Type Definitions
 *
 * This file contains TypeScript type definitions related to authentication,
 * user sessions, and NextAuth.
 */

import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * Extended user type for NextAuth session
 */
export interface ExtendedUser extends DefaultUser {
  id: string;
  role: string;
  orgId: string;
}

/**
 * Extended session type for NextAuth
 */
export interface ExtendedSession extends DefaultSession {
  user: ExtendedUser;
}

/**
 * Extended JWT token type for NextAuth
 */
export interface ExtendedJWT extends JWT {
  role?: string;
  orgId?: string;
}
