import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Store, Package, ShieldCheck, LogOut, Sprout, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useCurrency } from "@/lib/currency";
import { Toaster } from "@/components/ui/sonner";
import { NotificationsBell } from "./NotificationsBell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isSeller, isBuyer, profile } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function logout() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  const navItems = [
    { to: "/browse", label: "Market", icon: Store, show: true },
    { to: "/seller", label: "My Farm", icon: Sprout, show: isSeller },
    { to: "/seller/verify", label: "Verify", icon: BadgeCheck, show: isSeller && !isAdmin },
    { to: "/orders", label: "Orders", icon: Package, show: !!user },
    { to: "/admin", label: "Admin", icon: ShieldCheck, show: isAdmin },
  ].filter((i) => i.show);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto relative shadow-float">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/harvest-hub-logo.svg"
            alt="Harvest Hub"
            className="w-10 h-10 rounded-xl ring-1 ring-border"
          />
          <div>
            <div className="font-display font-bold text-base leading-tight">Harvest Hub</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5 tracking-widest">UGANDA</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-muted p-0.5 text-xs font-semibold">
            {(["UGX", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2.5 py-1 rounded-full transition ${currency === c ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {user && <NotificationsBell userId={user.id} />}
          {user ? (
            <Button size="icon" variant="ghost" onClick={logout} aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => router.navigate({ to: "/auth" })}>Sign in</Button>
          )}
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <footer className={`px-5 py-6 border-t bg-muted/40 text-center space-y-2 ${user && navItems.length > 0 ? "mb-20" : ""}`}>
        <div className="flex justify-center gap-4 text-xs font-semibold text-muted-foreground">
          <Link to="/about" className="hover:text-primary">About</Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-primary">Contact</Link>
          <span>·</span>
          <Link to="/browse" className="hover:text-primary">Market</Link>
        </div>
        <p className="text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Harvest Hub · Where harvests meet trusted buyers
        </p>
      </footer>

      {user && navItems.length > 0 && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/95 backdrop-blur border-t z-20">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
            {navItems.map((item) => {
              const active = path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center py-2.5 gap-0.5 transition ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      <Toaster richColors position="top-center" />
      {/* Hidden welcome strip for non-logged users */}
      {!user && profile === null ? null : null}
    </div>
  );
}
