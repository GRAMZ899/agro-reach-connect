import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sprout, ShoppingBasket } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(100),
  phone: z.string().trim().min(7).max(20),
  location: z.string().trim().min(2).max(120),
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      router.navigate({ to: "/" });
    } else {
      const parsed = signupSchema.safeParse({ full_name: fullName, email, password, phone, location });
      if (!parsed.success) { setLoading(false); return toast.error(parsed.error.issues[0].message); }
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: parsed.data.full_name,
            phone: parsed.data.phone,
            location: parsed.data.location,
            account_type: accountType,
          },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created!");
      router.navigate({ to: "/" });
    }
  }

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-12">
        <h1 className="font-display text-3xl font-bold">{mode === "login" ? "Welcome back" : "Join the harvest"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "login" ? "Sign in to your account" : "Create your account to start trading"}
        </p>

        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-2 mt-6">
            {([
              { v: "buyer", label: "I'm a Buyer", icon: ShoppingBasket },
              { v: "seller", label: "I'm a Farmer", icon: Sprout },
            ] as const).map((opt) => {
              const active = accountType === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAccountType(opt.v)}
                  className={`p-4 rounded-2xl border-2 text-left transition ${
                    active ? "border-primary bg-secondary shadow-card" : "border-border bg-card"
                  }`}
                >
                  <opt.icon className={`w-6 h-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="font-semibold text-sm">{opt.label}</div>
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3 mt-6">
          {mode === "signup" && (
            <>
              <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256 7…" required /></div>
              <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="District, Town" required /></div>
            </>
          )}
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <Button type="submit" disabled={loading} className="w-full rounded-full" size="lg">
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="block w-full text-center mt-4 text-sm text-muted-foreground"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </AppShell>
  );
}
