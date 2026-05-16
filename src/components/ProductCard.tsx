import { MapPin, ShoppingBasket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, type Currency } from "@/lib/currency";

export interface ProductRow {
  id: string;
  title: string;
  description: string | null;
  price_ugx: number;
  price_usd: number;
  unit: string;
  quantity_available: number;
  image_url: string | null;
  location: string;
  category: string | null;
  available: boolean;
  seller_id: string;
}

export function ProductCard({
  product,
  currency,
  onOrder,
}: {
  product: ProductRow;
  currency: Currency;
  onOrder?: (p: ProductRow) => void;
}) {
  return (
    <Card className="overflow-hidden shadow-card border-0 bg-card p-0">
      <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-hero flex items-center justify-center text-primary-foreground font-display text-3xl">
            {product.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wide bg-background/90 backdrop-blur px-2 py-0.5 rounded-full">
            {product.category}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-base leading-tight">{product.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{product.location}</span>
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-lg font-bold text-primary leading-none">
              {formatPrice(product.price_ugx, product.price_usd, currency)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">per {product.unit}</div>
          </div>
          {onOrder && (
            <Button size="sm" onClick={() => onOrder(product)} className="rounded-full">
              <ShoppingBasket className="w-4 h-4 mr-1" /> Order
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
