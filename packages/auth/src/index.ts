import NextAuth from "next-auth";
import PlanningCenter from "./planning-center";

declare module "@auth/core/types" {
  interface User {
    pcoId?: string;
  }

  interface Session {
    user: {
      id: string;
      pcoId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    pcoId?: string;
    accessToken?: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [PlanningCenter()],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile?.sub) {
        token.pcoId = profile.sub;
        token.accessToken = account.access_token ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (token.pcoId) {
        session.user.pcoId = token.pcoId;
      }
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
