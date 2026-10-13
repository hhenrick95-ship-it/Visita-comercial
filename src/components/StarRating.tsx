import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  /** Rótulo de cada nota, do 1 ao 5 */
  labels: string[];
  max?: number;
  className?: string;
}

export const StarRating = ({ value, onChange, labels, max = 5, className }: StarRatingProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div role="radiogroup" className="flex gap-1" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${labels[n - 1] ?? ""}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "h-9 w-9 transition-colors",
                n <= shown ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground h-5">
        {shown > 0 ? `${shown} — ${labels[shown - 1]}` : `1 — ${labels[0]} · ${max} — ${labels[max - 1]}`}
      </p>
    </div>
  );
};
