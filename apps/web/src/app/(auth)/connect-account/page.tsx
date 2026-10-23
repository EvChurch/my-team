import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { createTRPCContext } from "@mt/api/init";
import { accountLinkConfigured, beginPcoLink, linkCookie, linkCookieOptions } from "@/lib/pco-account-link";

export default async function ConnectAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user?.auth0Id) redirect("/login");
  if ((await createTRPCContext()).personId) redirect("/teams");
  const t = await getTranslations("AccountLink");
  const configured = accountLinkConfigured();
  const failed = Boolean((await searchParams).error);
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg-page px-6">
      <div className="w-full max-w-md bg-bg-card rounded-2xl shadow-[var(--shadow-card)] p-8 space-y-5">
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-secondary">{t("description")}</p>
        {(failed || !configured) && <p role="alert" className="text-sm text-text-secondary">{t(configured ? "failed" : "unavailable")}</p>}
        {configured && <form action={async () => {
          "use server";
          const current = await auth();
          if (!current?.user?.auth0Id) redirect("/login");
          let flow;
          try { flow = await beginPcoLink(current.user.auth0Id); }
          catch { redirect("/connect-account?error=connection"); }
          (await cookies()).set(linkCookie, flow.cookie, linkCookieOptions);
          redirect(flow.url.href);
        }}>
          <button className="w-full bg-accent text-text-on-accent rounded-[10px] px-6 py-3 text-sm font-semibold">{t("connect")}</button>
        </form>}
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm text-text-secondary underline">{t("signOut")}</button>
        </form>
      </div>
    </main>
  );
}
