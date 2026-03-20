import type { OIDCConfig } from "next-auth/providers";

export interface PlanningCenterProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

export default function PlanningCenter(): OIDCConfig<PlanningCenterProfile> {
  return {
    id: "planning-center",
    name: "Planning Center",
    type: "oidc",
    issuer: "https://api.planningcenteronline.com",
    clientId: process.env.AUTH_PLANNING_CENTER_ID!,
    clientSecret: process.env.AUTH_PLANNING_CENTER_SECRET!,
    authorization: { params: { scope: "openid people services" } },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      };
    },
  };
}
