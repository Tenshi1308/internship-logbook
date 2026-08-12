import { GitBranch, LayoutDashboard, FileText, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/github", label: "GitHub", icon: GitBranch },
  { href: "/profile", label: "Profile", icon: User },
] as const;
