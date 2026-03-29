import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { TimezoneProvider } from "@/lib/timezone";
import { Providers } from "../providers";
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
  const person = await queryClient.fetchQuery(trpc.people.me.queryOptions()).catch(() => null);

  const cookieStore = await cookies();
  const serverTimezone = cookieStore.get("tz")?.value ?? "UTC";

  return (
    <Providers>
      <TimezoneProvider serverTimezone={serverTimezone}>
        <div className="flex h-full min-h-screen">
          <Sidebar
            userName={person?.fullName ?? session.user.name}
            userImage={person?.image ?? session.user.image}
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
