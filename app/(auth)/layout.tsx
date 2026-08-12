import { redirect } from "next/navigation";

import { AppLogo } from "@/components/app-logo";
import { getCurrentUser } from "@/lib/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <AppLogo />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
