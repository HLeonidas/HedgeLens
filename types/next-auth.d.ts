import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      active?: boolean;
      role?: "admin" | "enduser";
      preferred_currency?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    active?: boolean;
    role?: "admin" | "enduser";
    preferred_currency?: string;
  }
}
