import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { UGANDA_DISTRICTS } from "@/lib/uganda-districts";

const schema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  price_ugx: z.coerce.number().min(0).max(1e10),
  price_usd: z.coerce.number().min(0).max(1e7),
  unit: z.string().trim().min(1).max(20),
  quantity_available: z.coerce.number().min(0).max(1e7),
  location: z.string().trim().min(2).max(120),
  category: z.string().trim().max(40).optional(),
});

export function ProductForm({
  open,
  onOpenChange,
  sellerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUgx, setPriceUgx] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [unit, setUnit] = useState("Bags");
  const [qty, setQty] = useState("10");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Cereals");
  const [variety, setVariety] = useState("");
  const [harvestSeason, setHarvestSeason] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [timeline, setTimeline] = useState("Ready Now");
  const [readyDate, setReadyDate] = useState("");
  const [moisture, setMoisture] = useState("");
  const [grade, setGrade] = useState("Grade A");
  const [organic, setOrganic] = useState("Conventional");
  const [storage, setStorage] = useState("");
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(false);
  const [transport, setTransport] = useState(false);
  const [district, setDistrict] = useState("");
  const [parish, setParish] = useState("");
  const [village, setVillage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function submit() {
    const composedLocation = [district, parish, village].filter(Boolean).join(", ") || location;
    const parsed = schema.safeParse({
      title, description, price_ugx: priceUgx, price_usd: priceUsd, unit,
      quantity_available: qty, location: composedLocation, category,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${sellerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: false });
      if (upErr) { toast.error(upErr.message); setLoading(false); return; }
      image_url = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await (supabase as any).from("products").insert({
      ...parsed.data,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      seller_id: sellerId,
      image_url,
      available: true,
      variety: variety || null,
      harvest_season: harvestSeason || null,
      negotiable,
      availability_timeline: timeline,
      ready_date: timeline === "Custom Date" && readyDate ? readyDate : null,
      moisture_content: moisture || null,
      grade, organic_status: organic, storage_method: storage || null,
      pickup_available: pickup, delivery_available: delivery, transport_assistance: transport,
      district: district || null, parish: parish || null, village: village || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Submitted for admin review");
    onSaved?.();
    onOpenChange(false);
    setTitle(""); setDescription(""); setPriceUgx(""); setPriceUsd("");
    setQty("10"); setLocation(""); setFile(null); setPreview(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Post a Crop Listing</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-2">
            Your listing goes live after admin review. We may polish wording, units & pricing for buyers.
          </p>
          <label className="block">
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Tap to add photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full"
              onClick={() => (document.querySelector('input[capture]') as HTMLInputElement)?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Camera
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-full"
              onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="image/*";
                i.onchange = (e: any) => pick(e.target.files?.[0] ?? null); i.click(); }}>
              <Upload className="w-4 h-4 mr-1" /> Gallery
            </Button>
          </div>

          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fresh Tomatoes" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["Cereals","Legumes","Vegetables","Fruits","Tubers","Coffee","Other"].map(c=> <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Variety</Label><Input value={variety} onChange={(e)=>setVariety(e.target.value)} placeholder="e.g. Longe 5"/></div>
          </div>
          <div><Label>Harvest season</Label><Input value={harvestSeason} onChange={(e)=>setHarvestSeason(e.target.value)} placeholder="e.g. Season A 2025"/></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Price (UGX)</Label><Input type="number" min="0" value={priceUgx} onChange={(e) => setPriceUgx(e.target.value)} /></div>
            <div><Label>Price (USD)</Label><Input type="number" min="0" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} /></div>
          </div>
          <label className="flex items-center justify-between text-sm">
            <span>Price negotiable</span>
            <Switch checked={negotiable} onCheckedChange={setNegotiable}/>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["Bags","Sacks","Kilograms","Tonnes"].map(u=> <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Qty available</Label><Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3"><Label>District</Label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger><SelectValue placeholder="Select district"/></SelectTrigger>
                <SelectContent className="max-h-72">{UGANDA_DISTRICTS.map(d=> <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Parish</Label><Input value={parish} onChange={(e)=>setParish(e.target.value)}/></div>
            <div className="col-span-2"><Label>Village</Label><Input value={village} onChange={(e)=>setVillage(e.target.value)}/></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["Grade A","Grade B","Grade C","Mixed"].map(g=> <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Organic status</Label>
              <Select value={organic} onValueChange={setOrganic}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{["Organic","Conventional","In Transition"].map(o=> <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Moisture %</Label><Input value={moisture} onChange={(e)=>setMoisture(e.target.value)} placeholder="e.g. 13.5%"/></div>
            <div><Label>Storage</Label><Input value={storage} onChange={(e)=>setStorage(e.target.value)} placeholder="Sacks / silo"/></div>
          </div>

          <div><Label>Availability</Label>
            <Select value={timeline} onValueChange={setTimeline}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{["Ready Now","Within 1 Week","Within 2 Weeks","Within 1 Month","Custom Date"].map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {timeline === "Custom Date" && (
            <div><Label>Ready date</Label><Input type="date" value={readyDate} onChange={(e)=>setReadyDate(e.target.value)}/></div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col items-start gap-1"><span>Pickup</span><Switch checked={pickup} onCheckedChange={setPickup}/></label>
            <label className="flex flex-col items-start gap-1"><span>Delivery</span><Switch checked={delivery} onCheckedChange={setDelivery}/></label>
            <label className="flex flex-col items-start gap-1"><span>Transport help</span><Switch checked={transport} onCheckedChange={setTransport}/></label>
          </div>

          <Button onClick={submit} disabled={loading} className="w-full rounded-full">
            {loading ? "Submitting…" : "Submit for Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
