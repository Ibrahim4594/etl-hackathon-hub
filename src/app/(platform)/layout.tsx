import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { PlatformFab } from "@/components/layout/platform-fab";
import { serverAuth } from "@/lib/auth/server-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await serverAuth();
  let dbUserId: string | undefined;

  if (userId) {
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, userId));
    dbUserId = dbUser?.id;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <SidebarNav />
        <div className="flex flex-1 flex-col">
          <Topbar userId={dbUserId} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <PlatformFab />
    </SidebarProvider>
  );
}
