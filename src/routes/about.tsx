import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Sprout, Truck, Users, BarChart3, Leaf, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Harvest Hub — Trusted Agricultural Marketplace" },
      { name: "description", content: "Harvest Hub connects verified farmers directly to buyers and modernises post-harvest handling across Africa." },
    ],
  }),
});

function AboutPage() {
  const pillars = [
    { icon: Users, title: "Direct market access", body: "Farmers reach reliable buyers without losing margin to middlemen." },
    { icon: Truck, title: "Post-harvest support", body: "Better drying & storage so quality survives the journey to market." },
    { icon: BarChart3, title: "Transparent pricing", body: "Live UGX & USD prices help farmers earn what their crop is worth." },
    { icon: ShieldCheck, title: "Trusted coordination", body: "Our team verifies every order and handles logistics privately." },
  ];

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-8 rounded-b-[2.5rem]">
        <span className="inline-flex items-center gap-1 bg-primary-foreground/15 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur">
          <Leaf className="w-3 h-3" /> Our story
        </span>
        <h1 className="font-display text-3xl font-bold mt-3 leading-tight">Agriculture, reimagined for Africa.</h1>
        <p className="text-sm text-primary-foreground/85 mt-2">
          An agricultural technology initiative transforming the maize trade — and beyond.
        </p>
      </section>

      <div className="px-5 pt-6 space-y-5">
        <div className="bg-card rounded-3xl p-5 shadow-card space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            <strong>Harvest Hub</strong> is an agricultural technology initiative focused on transforming the maize trade
            sector by connecting farmers directly to reliable buyers and improving post-harvest handling systems.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We were established to solve major challenges affecting maize farmers, including limited market access, limited drying
            facilities and difficulties in connecting with local and international buyers.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Our platform creates a more efficient agricultural marketplace where farmers, buyers, transporters, and agro-partners
            can interact in a transparent and organized system.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Through digital solutions, we simplify the buying and selling process while helping farmers increase profitability
            and reduce losses after harvest.
          </p>
          <p className="text-sm leading-relaxed font-medium text-foreground border-l-2 border-primary pl-3 italic">
            We believe agriculture should not only feed communities but also create sustainable economic opportunities for
            farmers across Africa.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold mb-3">What we stand for</h2>
          <div className="grid grid-cols-2 gap-2">
            {pillars.map((p) => (
              <div key={p.title} className="bg-card rounded-2xl p-3 shadow-card">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center mb-2">
                  <p.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm leading-tight">{p.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-hero text-primary-foreground rounded-3xl p-5 text-center">
          <Sprout className="w-7 h-7 mx-auto mb-2" />
          <h3 className="font-display font-bold text-lg">Grow with us</h3>
          <p className="text-xs opacity-90 mt-1">Join thousands of farmers and buyers building a fairer food economy.</p>
          <div className="mt-4 flex gap-2 justify-center">
            <Button asChild variant="secondary" className="rounded-full"><Link to="/auth">Get started</Link></Button>
            <Button asChild variant="outline" className="rounded-full bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"><Link to="/contact">Contact us</Link></Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}