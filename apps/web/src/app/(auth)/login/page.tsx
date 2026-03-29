import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signIn } from "@/lib/auth";
import {
  Church,
  HeartHandshake,
  Users,
  CalendarCheck,
} from "lucide-react";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/teams");
  }

  const t = await getTranslations("Common");
  const tAuth = await getTranslations("Auth");

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop left panel — gradient */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-accent to-accent-dark items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-text-on-accent">
          <Church className="w-16 h-16 opacity-30" />
          <span className="text-2xl font-semibold opacity-30">{t("appName")}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-bg-page">
        {/* Mobile decorative icons */}
        <div className="flex items-center gap-4 mb-8 md:hidden">
          {[HeartHandshake, Users, CalendarCheck].map((Icon, i) => (
            <div
              key={i}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-accent-light"
            >
              <Icon className="w-5 h-5 text-accent" />
            </div>
          ))}
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm bg-bg-card rounded-2xl shadow-[var(--shadow-card)] p-8 flex flex-col items-center">
          <Church className="w-8 h-8 text-accent mb-3" />
          <h1 className="text-2xl font-semibold text-text-primary mb-1">
            {t("appName")}
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            {t("appTagline")}
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("planning-center", { redirectTo: "/teams" });
            }}
          >
            <button
              type="submit"
              className="w-full bg-accent text-text-on-accent rounded-[10px] px-6 py-3 text-sm font-semibold hover:bg-accent-dark transition-colors"
            >
              {tAuth("signIn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
