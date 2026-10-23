import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { createTRPCContext } from "@mt/api/init";

export default async function ConnectAccountPage() {
  const session = await auth();
  if (!session?.user?.auth0Id) redirect("/login");
  const context = await createTRPCContext();
  if (context.personId) redirect("/teams");
  const t = await getTranslations("AccountLink");
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-page px-6">
      <div className="w-full max-w-md bg-bg-card rounded-2xl shadow-[var(--shadow-card)] p-8 space-y-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
        <p role="alert" className="text-sm text-text-secondary">
          {t(context.identityError === "unavailable" ? "unavailable" : "description")}
        </p>
        <Link href="/teams" prefetch={false} className="block text-center w-full bg-accent text-text-on-accent rounded-[10px] px-6 py-3 text-sm font-semibold">
          {t("retry")}
        </Link>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm text-text-secondary underline">{t("signOut")}</button>
        </form>
      </div>
    </main>
  );
}
