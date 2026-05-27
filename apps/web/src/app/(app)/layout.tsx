import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { TimezoneProvider } from "@/lib/timezone";
import { Providers } from "../providers";
import { LocaleSync } from "@/components/locale-sync";
import { getQueryClient, trpc } from "@mt/api/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const queryClient = getQueryClient();
  const profile = await queryClient.fetchQuery(trpc.people.myTeamProfile.queryOptions()).catch(() => null);

  const cookieStore = await cookies();
  const serverTimezone = cookieStore.get("tz")?.value ?? "UTC";

  // Fetch DB locale preference and pass to client for cookie sync
  const dbLocale = await queryClient.fetchQuery(trpc.preferences.getLocale.queryOptions()).catch(() => "en");
  const cookieLocale = cookieStore.get("locale")?.value;

  return (
    <Providers>
      <LocaleSync dbLocale={dbLocale} cookieLocale={cookieLocale} />
      <TimezoneProvider serverTimezone={serverTimezone}>
        <div className="flex h-full min-h-screen">
          <Sidebar
            userName={profile?.displayName ?? session.user.name}
            userImage={profile?.image ?? session.user.image}
          />
          <main className="flex-1 overflow-y-auto pb-24 md:pb-0 md:px-12 md:py-10 px-4 py-6">
            {children}
          </main>
          <MobileTabBar />
        </div>
      </TimezoneProvider>
    </Providers>
  );
}
