import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Sprout, ShoppingBasket, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, isAdmin, isSeller, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) router.navigate({ to: "/admin" });
    else if (isSeller) router.navigate({ to: "/seller" });
    else router.navigate({ to: "/browse" });
  }, [user, isAdmin, isSeller, loading, router]);

  return (
    <AppShell>
      <section className="relative px-5 pt-6 pb-10 bg-hero text-primary-foreground rounded-b-[2.5rem] overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-warm opacity-30 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1 bg-primary-foreground/15 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur">
            <Sparkles className="w-3 h-3" /> Trusted across Uganda
          </span>
          <h1 className="font-display text-4xl font-bold mt-4 leading-tight">
            From the farm.<br />Straight to you.
          </h1>
          <p className="mt-2 text-primary-foreground/80 text-sm">
            Real-time marketplace connecting African farmers with buyers — fair prices in UGX & USD.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold flex-1">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full flex-1 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/browse">Browse</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-5 mt-8 space-y-3">
        <h2 className="font-display text-xl font-bold">Why farmers love it</h2>
        {[
          { icon: Sprout, title: "Post in seconds", body: "Snap a photo, set your price — your produce is live." },
          { icon: ShoppingBasket, title: "Buyers come to you", body: "Get real-time order notifications, no chasing." },
          { icon: ShieldCheck, title: "Privacy guaranteed", body: "Buyer details stay private. Admin handles logistics." },
        ].map((f) => (
          <div key={f.title} className="bg-card rounded-2xl p-4 shadow-card flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{f.body}</p>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
