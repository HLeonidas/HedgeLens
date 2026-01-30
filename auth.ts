import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { upsertUserFromOAuth } from "@/lib/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [GitHub],
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        if (user.email) {
          const dbUser = await upsertUserFromOAuth({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          });
          token.userId = dbUser.id;
          token.active = dbUser.active;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = (token.userId as string | undefined) ?? token.sub;
        session.user.active = (token.active as boolean | undefined) ?? true;
      }
      return session;
    },
  },
});

export const { GET, POST } = handlers;
