import { Sparkles } from "lucide-react";

/**
 * Compact "1 кредит" badge shown on every generation CTA so the user knows
 * the cost before clicking. Two visual variants:
 *  - "on-warm" (default): sits inside a gradient/coral button.
 *  - "on-surface": sits on a dark surface (card / outline button).
 */
export function CreditCost({
  cost = 1,
  variant = "on-warm",
  className = "",
}: {
  cost?: number;
  variant?: "on-warm" | "on-surface";
  className?: string;
}) {
  const label = creditWord(cost);
  const base =
    "inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10.5px] font-semibold tabular-nums shrink-0";
  const skin =
    variant === "on-warm"
      ? "bg-black/20 text-current"
      : "bg-accent/12 text-accent border border-accent/25";
  return (
    <span className={`${base} ${skin} ${className}`} aria-label={`Стоимость: ${cost} ${label}`}>
      <Sparkles className="w-2.5 h-2.5" strokeWidth={2.75} />
      {cost} {label}
    </span>
  );
}

function creditWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "кредит";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "кредита";
  return "кредитов";
}
