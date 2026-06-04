import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notif { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string; type: string; }

export function NotificationsBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`notif-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => {
          const n = p.new as Notif;
          toast.message(n.title, { description: n.body ?? undefined });
          setItems((prev) => [n, ...prev].slice(0, 30));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  async function load() {
    const { data } = await (supabase as any).from("notifications")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    setItems(data ?? []);
  }

  async function markAllRead() {
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v && unread) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-96 overflow-y-auto" align="end">
        <div className="p-3 border-b font-display font-bold text-sm">Notifications</div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">You're all caught up 🌾</p>
        ) : items.map((n) => (
          <div key={n.id} className={`p-3 border-b last:border-0 ${n.read ? "" : "bg-secondary/40"}`}>
            <div className="text-sm font-semibold">{n.title}</div>
            {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
            <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}