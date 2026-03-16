'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthProvider, useAuthContext } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  LayoutDashboardIcon,
  UtensilsIcon,
  UploadIcon,
  TargetIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  MenuIcon,
  XIcon,
  SunIcon,
} from 'lucide-react';

const navItems: { href: string; label: string; icon: typeof LayoutDashboardIcon; exact?: boolean }[] = [
  { href: '/admin', label: 'admin.dashboard', icon: LayoutDashboardIcon, exact: true },
  { href: '/admin/venues', label: 'admin.venues', icon: UtensilsIcon },
  { href: '/admin/import', label: 'admin.import', icon: UploadIcon },
  { href: '/admin/accuracy', label: 'admin.accuracy', icon: TargetIcon },
  { href: '/admin/verification', label: 'admin.verification', icon: ShieldCheckIcon },
  { href: '/admin/kpi', label: 'admin.kpi', icon: BarChart3Icon },
];

const navLabels: Record<string, string> = {
  'admin.dashboard': 'Dashboard',
  'admin.venues': 'Restauranger',
  'admin.import': 'Import',
  'admin.accuracy': 'Precision',
  'admin.verification': 'Verifiering',
  'admin.kpi': 'KPI',
};

function AdminSidebar() {
  const { user, logout } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace('/admin/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 z-50 flex h-14 w-full items-center border-b border-border bg-card px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Stäng meny' : 'Öppna meny'}
        >
          {sidebarOpen ? <XIcon /> : <MenuIcon />}
        </Button>
        <span className="ml-3 text-sm font-bold text-foreground">SunnySeat Admin</span>
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-full w-60 flex-col border-r border-border bg-card transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SunIcon className="size-5 text-amber-500" />
          <span className="text-base font-bold text-foreground">SunnySeat</span>
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-5 shrink-0" />
                {navLabels[item.label]}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border px-3 py-4">
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {user?.username} ({user?.role})
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            Logga ut
          </Button>
        </div>
      </aside>
    </>
  );
}

function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Laddar...</p>
      </div>
    );
  }

  // Login page is always accessible — no sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      {/* Main content: offset by sidebar width on desktop, top bar on mobile */}
      <main className="pt-14 md:pl-60 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </AuthProvider>
  );
}
