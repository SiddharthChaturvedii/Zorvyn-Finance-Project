"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, ShieldAlert, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Records", href: "/dashboard/records", icon: FileText },
  ];

  // Only show Admin pages if role is ADMIN
  if (user?.role === "ADMIN") {
    navItems.push(
      { label: "Users", href: "/dashboard/users", icon: Users },
      { label: "Audit Log", href: "/dashboard/audit", icon: ShieldAlert }
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!user) return null; // Prevent flash of content during redirect

  return (
    <div className="flex h-screen w-full bg-obsidian text-text-main overflow-hidden selection:bg-accent selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-sculpted bg-surface h-full flex flex-col justify-between">
        <div className="p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent-gradient shadow-neon flex-shrink-0" />
            <span className="font-sans font-bold tracking-widest text-sm uppercase">Zorvyn</span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all font-sans text-sm font-medium ${
                    isActive
                      ? "bg-surface-raised border border-sculpted text-accent shadow-[inset_2px_0_0_0_var(--color-accent)]"
                      : "text-text-dim hover:text-text-main hover:bg-surface-raised/50 border border-transparent"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-accent" : "text-text-dim"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Chip */}
        <div className="p-4 border-t border-sculpted bg-surface-raised/30 flex items-center justify-between">
          <div className="flex flex-col max-w-[120px]">
            <span className="text-xs font-semibold truncate text-text-main">{user?.fullName || "Operator"}</span>
            <span className={`text-[10px] font-mono uppercase ${
              user?.role === 'ADMIN' ? 'text-accent' : 
              user?.role === 'ANALYST' ? 'text-[#a460ff]' : 
              'text-positive'
            }`}>
              {user?.role}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-text-dim hover:text-negative transition-colors p-2 rounded hover:bg-negative/10"
            title="Secure Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto p-8 relative">
        <div className="max-w-7xl mx-auto space-y-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
