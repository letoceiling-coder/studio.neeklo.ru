import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { getShareItem, type ShareItem } from "@/lib/share-store";

export const Route = createFileRoute("/s/$id")({
  head: () => ({
    meta: [
      { title: "Превью, neeklo" },
      { name: "description", content: "Результат, созданный в neeklo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<ShareItem | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setItem(getShareItem(id));
    setLoading(false);
  }, [id]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col items-center px-5 py-10">
      <Link to="/" className="text-[14px] font-semibold tracking-tight mb-8">
        neeklo
      </Link>
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div
            className={[
              "relative w-full bg-gradient-to-br",
              item?.gradient ?? "from-rose-500 via-orange-400 to-amber-300",
              item?.ratio === "9:16" ? "aspect-[9/16]" :
              item?.ratio === "16:9" ? "aspect-[16/9]" :
              item?.ratio === "3:4" ? "aspect-[3/4]" : "aspect-square",
            ].join(" ")}
          >
            {item?.src && (
              <img loading="lazy" decoding="async" src={item.src} alt={item.title}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.25),transparent_60%)]" />
            {item?.duration && (
              <span className="absolute bottom-2 right-2 h-6 px-2 inline-flex items-center rounded-md bg-black/60 backdrop-blur-md text-[11px] font-mono text-white tabular-nums">
                {item.duration}
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {loading ? "Загружаем" : item ? "Создано в neeklo" : "Ссылка не найдена"}
            </div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight truncate">
              {item?.title ?? (loading ? "…" : "Этот результат недоступен")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Sparkles className="w-4 h-4 text-accent" /> Сделай такое же за минуту
          </div>
          <Link
            to="/signup"
            className="h-12 rounded-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold"
            style={{ backgroundImage: "var(--gradient-warm)", color: "var(--accent-foreground)", boxShadow: "var(--shadow-warm)" }}
          >
            Создать своё бесплатно <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
