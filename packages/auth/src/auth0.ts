import type { OIDCConfig } from "next-auth/providers"

export interface Auth0Profile {
  sub: string
  name?: string
  email?: string
  picture?: string
}

export default function Auth0(): OIDCConfig<Auth0Profile> {
  const auth0Domain = process.env.AUTH0_DOMAIN
  const issuer =
    process.env.AUTH_AUTH0_ISSUER ??
    (auth0Domain ? `https://${auth0Domain}` : undefined)

  return {
    id: "auth0",
    name: "Auth0",
    type: "oidc",
    issuer,
    clientId: process.env.AUTH_AUTH0_ID ?? process.env.AUTH0_CLIENT_ID!,
    clientSecret:
      process.env.AUTH_AUTH0_SECRET ?? process.env.AUTH0_CLIENT_SECRET!,
    authorization: { params: { scope: "openid profile email" } },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }
    },
  }
}
