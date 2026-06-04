import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact Harvest Hub" },
      { name: "description", content: "Get in touch with the Harvest Hub team — farmers, buyers and partners welcome." },
    ],
  }),
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Harvest Hub — message from ${name || "a visitor"}`);
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    window.location.href = `mailto:ionmasters14@gmail.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  }

  const channels = [
    { icon: Mail, label: "Email", value: "ionmasters14@gmail.com", href: "mailto:ionmasters14@gmail.com" },
    { icon: Phone, label: "Phone / WhatsApp", value: "+256 778 099 000", href: "tel:+256778099000" },
    { icon: MapPin, label: "Head office", value: "Kampala, Uganda" },
    { icon: MessageCircle, label: "Support hours", value: "Mon–Sat · 8am – 7pm EAT" },
  ];

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-7 rounded-b-[2.5rem]">
        <h1 className="font-display text-3xl font-bold leading-tight">Let's talk.</h1>
        <p className="text-sm text-primary-foreground/85 mt-1">
          We'd love to hear from farmers, buyers, transporters and partners.
        </p>
      </section>

      <div className="px-5 pt-6 space-y-2">
        {channels.map((c) => {
          const Inner = (
            <div className="bg-card rounded-2xl p-3 shadow-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <c.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">{c.label}</div>
                <div className="text-sm font-semibold truncate">{c.value}</div>
              </div>
            </div>
          );
          return c.href ? <a key={c.label} href={c.href}>{Inner}</a> : <div key={c.label}>{Inner}</div>;
        })}
      </div>

      <form onSubmit={send} className="px-5 pt-6 pb-10 space-y-3">
        <h2 className="font-display text-xl font-bold">Send us a message</h2>
        <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={1000} /></div>
        <Button type="submit" className="w-full rounded-full" size="lg">
          <Send className="w-4 h-4 mr-2" /> Send message
        </Button>
      </form>
    </AppShell>
  );
}