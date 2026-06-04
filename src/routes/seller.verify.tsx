import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { UGANDA_DISTRICTS } from "@/lib/uganda-districts";
import { BadgeCheck, Clock, AlertCircle, XCircle, Upload, ShieldX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/verify")({ component: VerifyPage });

const STATUS_META: Record<string, { label: string; color: string; icon: any; msg: string }> = {
  not_verified: { label: "Not Verified", color: "bg-muted text-muted-foreground", icon: AlertCircle, msg: "Submit your details to begin trading." },
  pending: { label: "Pending Review", color: "bg-accent/30 text-accent-foreground", icon: Clock, msg: "Our admins are reviewing your information." },
  info_required: { label: "Additional Info Required", color: "bg-warm text-primary-foreground", icon: AlertCircle, msg: "Please update the form with the requested information." },
  approved: { label: "Approved", color: "bg-success/30 text-primary", icon: BadgeCheck, msg: "You're verified! You can now post listings." },
  rejected: { label: "Rejected", color: "bg-destructive/20 text-destructive", icon: XCircle, msg: "Your verification was rejected. Contact support if needed." },
  suspended: { label: "Suspended", color: "bg-destructive/30 text-destructive", icon: ShieldX, msg: "Your account is suspended. Contact support." },
};

function VerifyPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [v, setV] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [parish, setParish] = useState("");
  const [village, setVillage] = useState("");
  const [crops, setCrops] = useState("");
  const [acres, setAcres] = useState("");
  const [estimate, setEstimate] = useState("");
  const [bags, setBags] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [timeline, setTimeline] = useState("Ready Now");
  const [customDate, setCustomDate] = useState("");
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");
  const [farmPhotos, setFarmPhotos] = useState<string[]>([]);
  const [cropPhotos, setCropPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [user, loading, router]);

  useEffect(() => { if (user) load(); }, [user?.id]);

  async function load() {
    const { data } = await (supabase as any).from("verifications").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setV(data);
      setFullName(data.full_legal_name ?? profile?.full_name ?? "");
      setPhone(data.contact_number ?? profile?.phone ?? "");
      setEmail(data.email ?? profile?.email ?? "");
      setDistrict(data.district ?? ""); setParish(data.parish ?? ""); setVillage(data.village ?? "");
      setCrops(data.crops ?? ""); setAcres(data.acres?.toString() ?? "");
      setEstimate(data.season_production_estimate ?? "");
      setBags(data.bags_available?.toString() ?? "");
      setHarvestDate(data.expected_harvest_date ?? "");
      setTimeline(data.availability_timeline ?? "Ready Now");
      setCustomDate(data.custom_availability_date ?? "");
      setMomoName(data.momo_name ?? ""); setMomoNumber(data.momo_number ?? ""); setMomoNetwork(data.momo_network ?? "MTN");
      setFarmPhotos(data.farm_photos ?? []); setCropPhotos(data.crop_photos ?? []);
    } else {
      setFullName(profile?.full_name ?? ""); setPhone(profile?.phone ?? ""); setEmail(profile?.email ?? user!.email ?? "");
    }
  }

  async function uploadPhoto(file: File, kind: "farm" | "crop") {
    const path = `${user!.id}/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g,"_")}`;
    const { error } = await supabase.storage.from("verifications").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("verifications").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) {
      if (kind === "farm") setFarmPhotos((p) => [...p, data.signedUrl]);
      else setCropPhotos((p) => [...p, data.signedUrl]);
    }
  }

  async function submit() {
    if (!user) return;
    if (!fullName || !phone || !district || !parish || !village || !crops || !momoNumber) {
      toast.error("Please fill all required fields"); return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id, status: "pending",
      full_legal_name: fullName, contact_number: phone, email,
      district, parish, village,
      crops, acres: acres ? Number(acres) : null,
      season_production_estimate: estimate,
      bags_available: bags ? Number(bags) : null,
      expected_harvest_date: harvestDate || null,
      availability_timeline: timeline,
      custom_availability_date: timeline === "Custom Date" ? (customDate || null) : null,
      momo_name: momoName, momo_number: momoNumber, momo_network: momoNetwork,
      farm_photos: farmPhotos, crop_photos: cropPhotos,
    };
    const { error } = v
      ? await (supabase as any).from("verifications").update(payload).eq("id", v.id)
      : await (supabase as any).from("verifications").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted for review");
    load();
  }

  const status = v?.status ?? "not_verified";
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const locked = status === "approved" || status === "pending";

  if (!user) return null;

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-6 rounded-b-[2.5rem]">
        <h1 className="font-display text-2xl font-bold">Verification Center</h1>
        <p className="text-xs text-primary-foreground/80">Verified farmers earn buyer trust</p>
      </section>

      <div className="px-5 pt-5">
        <Card className="p-4 shadow-card border-0 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.color}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-bold">{meta.label}</div>
            <p className="text-xs text-muted-foreground">{meta.msg}</p>
            {v?.admin_notes && status === "info_required" && (
              <p className="text-xs mt-2 p-2 rounded-lg bg-warm/20 text-foreground">📝 {v.admin_notes}</p>
            )}
          </div>
        </Card>

        {status === "approved" ? (
          <div className="mt-5 text-center">
            <Button onClick={() => router.navigate({ to: "/seller" })} className="rounded-full">Go to My Farm</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            <Section title="Identity">
              <Field label="Full Legal Name *"><Input value={fullName} onChange={(e)=>setFullName(e.target.value)} disabled={locked}/></Field>
              <Field label="Contact Number *"><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+256 …" disabled={locked}/></Field>
              <Field label="Email Address"><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} disabled={locked}/></Field>
            </Section>

            <Section title="Location">
              <Field label="District *">
                <Select value={district} onValueChange={setDistrict} disabled={locked}>
                  <SelectTrigger><SelectValue placeholder="Select district"/></SelectTrigger>
                  <SelectContent className="max-h-72">{UGANDA_DISTRICTS.map((d)=> <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Parish *"><Input value={parish} onChange={(e)=>setParish(e.target.value)} disabled={locked}/></Field>
              <Field label="Village *"><Input value={village} onChange={(e)=>setVillage(e.target.value)} disabled={locked}/></Field>
            </Section>

            <Section title="Farming Information">
              <Field label="Crops you grow *"><Input value={crops} onChange={(e)=>setCrops(e.target.value)} placeholder="Maize, beans, coffee…" disabled={locked}/></Field>
              <Field label="Acres farmed"><Input type="number" value={acres} onChange={(e)=>setAcres(e.target.value)} disabled={locked}/></Field>
              <Field label="Season production estimate"><Textarea rows={2} value={estimate} onChange={(e)=>setEstimate(e.target.value)} disabled={locked}/></Field>
            </Section>

            <Section title="Inventory">
              <Field label="Bags / sacks available"><Input type="number" value={bags} onChange={(e)=>setBags(e.target.value)} disabled={locked}/></Field>
              <Field label="Expected harvest date"><Input type="date" value={harvestDate} onChange={(e)=>setHarvestDate(e.target.value)} disabled={locked}/></Field>
              <Field label="Availability">
                <Select value={timeline} onValueChange={setTimeline} disabled={locked}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["Ready Now","Within 1 Week","Within 2 Weeks","Within 1 Month","Custom Date"].map((t)=>
                      <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {timeline === "Custom Date" && (
                <Field label="Custom date"><Input type="date" value={customDate} onChange={(e)=>setCustomDate(e.target.value)} disabled={locked}/></Field>
              )}
            </Section>

            <Section title="Mobile Money">
              <Field label="Account name *"><Input value={momoName} onChange={(e)=>setMomoName(e.target.value)} disabled={locked}/></Field>
              <Field label="MoMo number *"><Input value={momoNumber} onChange={(e)=>setMomoNumber(e.target.value)} disabled={locked}/></Field>
              <Field label="Network *">
                <Select value={momoNetwork} onValueChange={setMomoNetwork} disabled={locked}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{["MTN","Airtel","Other"].map(n=> <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </Section>

            <Section title="Supporting Photos">
              <PhotoUploader label="Farm photos" photos={farmPhotos} onAdd={(f)=>uploadPhoto(f,"farm")} disabled={locked} onRemove={(i)=>setFarmPhotos(p=>p.filter((_,x)=>x!==i))}/>
              <PhotoUploader label="Crop photos" photos={cropPhotos} onAdd={(f)=>uploadPhoto(f,"crop")} disabled={locked} onRemove={(i)=>setCropPhotos(p=>p.filter((_,x)=>x!==i))}/>
            </Section>

            {!locked && (
              <Button onClick={submit} disabled={busy} size="lg" className="w-full rounded-full">
                {busy ? "Submitting…" : v ? "Resubmit for Review" : "Submit Verification"}
              </Button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 shadow-card border-0 space-y-3">
      <h2 className="font-display font-bold text-sm">{title}</h2>
      {children}
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
function PhotoUploader({ label, photos, onAdd, onRemove, disabled }:{
  label: string; photos: string[]; onAdd: (f: File)=>void; onRemove:(i:number)=>void; disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {photos.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img src={src} alt="" className="w-full h-full object-cover"/>
            {!disabled && <button onClick={()=>onRemove(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px]">×</button>}
          </div>
        ))}
        {!disabled && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary">
            <Upload className="w-4 h-4 text-muted-foreground"/>
            <input type="file" accept="image/*" className="hidden" onChange={(e)=> e.target.files?.[0] && onAdd(e.target.files[0])}/>
          </label>
        )}
      </div>
    </div>
  );
}