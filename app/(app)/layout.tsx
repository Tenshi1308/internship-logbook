import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-h-screen flex-col md:pl-64 print:md:pl-0">
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 print:p-0 md:pb-10 md:pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-5xl print:max-w-none">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
