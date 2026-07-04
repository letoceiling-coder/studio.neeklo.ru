import { Download, BookmarkPlus, Share2, RefreshCw, Check, Link as LinkIcon, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { addMedia, type MediaItem } from "@/lib/media-store";
import { createShareLink } from "@/lib/share-store";

type Props = {
  item: Omit<MediaItem, "id" | "createdAt">;
  onMore?: () => void;
  variant?: "row" | "stacked";
  saved?: boolean;
  onSaved?: () => void;
  /** When true, Save/Publish prompt signup instead of acting (used in landing demo). */
  requireAuth?: boolean;
};

export function MediaActions({ item, onMore, variant = "row", saved: savedProp, onSaved, requireAuth }: Props) {
  const [saved, setSaved] = useState(!!savedProp);
  const navigate = useNavigate();

  const gateOr = (fn: () => void) => {
    if (requireAuth) {
      toast("Зарегистрируйся, чтобы сохранить", {
        description: "Создай аккаунт за 10 секунд, результат не пропадёт.",
        action: { label: "Создать", onClick: () => navigate({ to: "/signup" }) },
      });
      return;
    }
    fn();
  };

  const download = () => gateOr(() => toast.success("Скачивание началось", { description: item.title }));

  const save = () => gateOr(() => {
    if (saved) { toast.info("Уже в медиатеке"); return; }
    addMedia(item);
    setSaved(true);
    onSaved?.();
    toast.success("Сохранено в медиатеку");
  });

  const share = () => {
    const { url } = createShareLink({
      title: item.title,
      kind: item.kind,
      ratio: item.ratio,
      gradient: item.gradient,
      duration: item.duration,
      src: item.src,
    });
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Ссылка скопирована", { description: url });
  };

  const publish = () => gateOr(() => {
    const { url } = createShareLink({
      title: item.title,
      kind: item.kind,
      ratio: item.ratio,
      gradient: item.gradient,
      duration: item.duration,
      src: item.src,
    });
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Опубликовано", { description: "Ссылка скопирована: " + url });
  });

  const base = "inline-flex items-center justify-center gap-1.5 h-10 rounded-full text-[12.5px] font-medium transition-colors";
  const ghost = `${base} bg-card border border-border/70 text-foreground hover:bg-muted/50`;
  const warm = `${base} bg-gradient-warm text-accent-foreground font-semibold active:scale-[0.99]`;

  const wrap = variant === "stacked" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2";

  return (
    <div className={wrap}>
      <button type="button" onClick={download} className={ghost}>
        <Download className="w-3.5 h-3.5" /> Скачать
      </button>
      <button type="button" onClick={save} className={ghost} aria-pressed={saved}>
        {requireAuth ? <Lock className="w-3.5 h-3.5" /> : saved ? <Check className="w-3.5 h-3.5 text-accent" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
        {saved ? "В медиатеке" : "Сохранить"}
      </button>
      <button type="button" onClick={share} className={ghost} aria-label="Поделиться короткой ссылкой">
        <LinkIcon className="w-3.5 h-3.5" /> Поделиться
      </button>
      <button type="button" onClick={publish} className={ghost}>
        <Share2 className="w-3.5 h-3.5" /> Опубликовать
      </button>
      {onMore && (
        <button type="button" onClick={onMore} className={warm}>
          <RefreshCw className="w-3.5 h-3.5" /> Сделать ещё
        </button>
      )}
    </div>
  );
}
