import NextAuth from "next-auth"
import Auth0 from "./auth0"

declare module "@auth/core/types" {
  interface User {
    auth0Id?: string
    auth0EmailVerified?: boolean
  }

  interface Session {
    user: {
      id: string
      auth0Id: string
      auth0EmailVerified?: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    auth0Id?: string
    auth0EmailVerified?: boolean
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [Auth0()],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial login — store Auth0 subject as the app auth identity.
      if (account && profile?.sub) {
        token.auth0Id = profile.sub
        token.auth0EmailVerified = profile.email_verified === true
      }
      return token
    },
    session({ session, token }) {
      if (token.auth0Id) {
        session.user.auth0Id = token.auth0Id
      }
      session.user.auth0EmailVerified = token.auth0EmailVerified === true
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
