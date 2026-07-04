// /app/projects/$id, Доска-канвас пространства с собранными ассетами.
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronRight,
  FolderKanban,
  Plus,
  Share2,
  Download,
  Star,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/studio";
import {
  toggleFavorite,
  trashSpace,
  updateSpace,
  useSpace,
  type SpaceAsset,
} from "@/lib/spaces-store";
import preset1 from "@/assets/preset-1.jpg";
import preset2 from "@/assets/preset-2.jpg";
import preset3 from "@/assets/preset-3.jpg";
import preset4 from "@/assets/preset-4.jpg";
import preset5 from "@/assets/preset-5.jpg";
import preset6 from "@/assets/preset-6.jpg";
import { cn } from "@/lib/utils";

const PRESETS = [preset1, preset2, preset3, preset4, preset5, preset6];

export const Route = createFileRoute("/app/projects/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Пространство · ${params.id}, neeklo` }],
  }),
  component: SpaceBoard,
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center p-10 text-center">
      <div>
        <h2 className="text-xl font-semibold">Пространство не найдено</h2>
        <Link to="/app/projects" className="mt-3 inline-block text-accent text-sm">
          ← К списку
        </Link>
      </div>
    </div>
  ),
});

function SpaceBoard() {
  const { id } = Route.useParams();
  const space = useSpace(id);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ sx: number; sy: number; base: { x: number; y: number } } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const assets = space?.assets ?? [];

  if (!space) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-10 text-center">
        <div>
          <h2 className="text-xl font-semibold">Пространство не найдено</h2>
          <Link to="/app/projects" className="mt-3 inline-block text-accent text-sm">
            ← К списку
          </Link>
        </div>
      </div>
    );
  }

  const bounds = useMemo(() => {
    if (assets.length === 0) return { w: 1200, h: 600 };
    let maxX = 0;
    let maxY = 0;
    for (const a of assets) {
      maxX = Math.max(maxX, a.x + a.w);
      maxY = Math.max(maxY, a.y + a.h);
    }
    return { w: Math.max(1200, maxX + 80), h: Math.max(600, maxY + 80) };
  }, [assets]);

  const onAssetDown = (e: ReactPointerEvent<HTMLDivElement>, a: SpaceAsset) => {
    e.stopPropagation();
    setSelected(a.id);
    const rect = boardRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: a.id,
      ox: (e.clientX - rect.left) / zoom - pan.x / zoom - a.x,
      oy: (e.clientY - rect.top) / zoom - pan.y / zoom - a.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBoardMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const d = dragRef.current;
      const rect = boardRef.current!.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / zoom - pan.x / zoom - d.ox;
      const ny = (e.clientY - rect.top) / zoom - pan.y / zoom - d.oy;
      const next = assets.map((x) =>
        x.id === d.id ? { ...x, x: Math.max(0, nx), y: Math.max(0, ny) } : x,
      );
      updateSpace(space.id, { assets: next });
    } else if (panRef.current) {
      const p = panRef.current;
      setPan({ x: p.base.x + (e.clientX - p.sx), y: p.base.y + (e.clientY - p.sy) });
    }
  };

  const onBoardDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setSelected(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, base: { ...pan } };
  };

  const onBoardUp = () => {
    dragRef.current = null;
    panRef.current = null;
  };

  const addAsset = () => {
    const i = assets.length;
    const next: SpaceAsset = {
      id: `a_${Date.now().toString(36)}`,
      src: PRESETS[i % PRESETS.length],
      x: 80 + ((i * 60) % 400),
      y: 80 + ((i * 40) % 200),
      w: 240,
      h: 180,
      label: "Новый ассет",
    };
    updateSpace(space.id, { assets: [...assets, next] });
    toast.success("Ассет добавлен на доску");
  };

  const removeAsset = (assetId: string) => {
    updateSpace(space.id, { assets: assets.filter((a) => a.id !== assetId) });
    if (selected === assetId) setSelected(null);
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://neeklo.app/space/${space.id}`);
      toast.success("Ссылка скопирована");
    } catch {
      toast.success("Готово к шерингу");
    }
  };

  const onTrash = () => {
    trashSpace(space.id);
    toast.success("Перемещено в Корзину");
  };

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1500px] mx-auto">
      <nav className="flex items-center gap-1.5 text-xs text-foreground/55 mb-3">
        <Link to="/app" className="hover:text-foreground">Главная</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/app/projects" className="hover:text-foreground">Пространства</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground/85 truncate">{space.title}</span>
      </nav>

      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/app/projects"
            className="inline-flex items-center justify-center w-9 h-9 rounded-tile border border-border hover:bg-foreground/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-tile"
            style={{ background: "var(--gradient-warm-soft)" }}
          >
            <FolderKanban className="w-5 h-5 text-accent" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[18px] lg:text-[22px] font-semibold tracking-tight truncate">{space.title}</h1>
            <p className="text-xs text-foreground/55">{assets.length} ассетов на доске</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn icon={Star} active={!!space.favorite} title="В избранное" onClick={() => toggleFavorite(space.id)} />
          <IconBtn icon={Share2} title="Поделиться" onClick={onShare} />
          <IconBtn icon={Trash2} title="В корзину" onClick={onTrash} />
          <button
            type="button"
            onClick={addAsset}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Добавить ассет
          </button>
        </div>
      </header>

      <Panel className="p-0 overflow-hidden">
        <div
          ref={boardRef}
          className={cn(
            "relative w-full h-[calc(100dvh-220px)] min-h-[480px] overflow-hidden select-none",
            panRef.current ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 0)",
            backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onPointerDown={onBoardDown}
          onPointerMove={onBoardMove}
          onPointerUp={onBoardUp}
          onPointerCancel={onBoardUp}
        >
          {assets.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <div>
                <span
                  className="mx-auto inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <ImageIcon className="w-6 h-6 text-accent" />
                </span>
                <h2 className="text-[16px] font-semibold">Доска пуста</h2>
                <p className="mt-1.5 text-[13px] text-foreground/55 max-w-sm mx-auto">
                  Перетащи генерации или добавь ассет, всё, что соберёшь здесь, останется связанным.
                </p>
                <button
                  type="button"
                  onClick={addAsset}
                  className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
                >
                  <Plus className="w-4 h-4" /> Добавить ассет
                </button>
              </div>
            </div>
          ) : (
            <div
              className="absolute top-0 left-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                width: bounds.w,
                height: bounds.h,
              }}
            >
              {assets.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "absolute rounded-tile overflow-hidden border bg-card cursor-grab active:cursor-grabbing transition-shadow",
                    selected === a.id
                      ? "border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                      : "border-border hover:border-foreground/30",
                  )}
                  style={{ left: a.x, top: a.y, width: a.w, height: a.h }}
                  onPointerDown={(e) => onAssetDown(e, a)}
                >
                  <img src={a.src} alt={a.label ?? ""} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  {a.label && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/85 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium">
                      {a.label}
                    </span>
                  )}
                  {selected === a.id && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeAsset(a.id)}
                      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-background/90 backdrop-blur border border-border text-foreground/70 hover:text-[color:var(--destructive,_#ef4444)]"
                      title="Удалить с доски"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* zoom controls */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-tile border border-border bg-background/90 backdrop-blur p-1 shadow-lg">
            <IconBtn icon={ZoomOut} title="Уменьшить" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} />
            <span className="text-[11px] text-foreground/60 px-1 tabular-nums w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <IconBtn icon={ZoomIn} title="Увеличить" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} />
            <IconBtn icon={Maximize2} title="К центру" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
          </div>
        </div>
      </Panel>

      <p className="mt-3 text-xs text-foreground/50">
        Перетаскивай ассеты по доске · удерживай и тащи пустое место для панорамы · колесо зума справа
      </p>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-tile border transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <Icon className={cn("w-4 h-4", active && "fill-current")} strokeWidth={1.75} />
    </button>
  );
}
