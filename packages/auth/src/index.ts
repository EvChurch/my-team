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
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    pcoId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

async function refreshAccessToken(token: {
  refreshToken?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  if (!token.refreshToken) return null;

  try {
    const res = await fetch(
      "https://api.planningcenteronline.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
          client_id: process.env.AUTH_PLANNING_CENTER_ID,
          client_secret: process.env.AUTH_PLANNING_CENTER_SECRET,
        }),
      },
    );

    if (!res.ok) {
      console.error("PCO token refresh failed:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  } catch (error) {
    console.error("PCO token refresh error:", error);
    return null;
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
    async jwt({ token, account, profile }) {
      // Initial login — store tokens from OAuth provider
      if (account && profile?.sub) {
        token.pcoId = profile.sub;
        token.accessToken = account.access_token ?? undefined;
        token.refreshToken = account.refresh_token ?? undefined;
        token.expiresAt = account.expires_at ?? undefined;
        return token;
      }

      // Token still valid — return as-is
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) {
        return token;
      }

      // Token expired — attempt refresh
      const refreshed = await refreshAccessToken(token);
      if (refreshed) {
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        token.expiresAt = refreshed.expiresAt;
      } else {
        // Refresh failed — clear tokens, user will need to re-login
        token.accessToken = undefined;
        token.refreshToken = undefined;
        token.expiresAt = undefined;
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
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
