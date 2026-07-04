// /app/moodboards/$id, детальный экран мудборда с загрузкой изображений.
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Upload,
  ImagePlus,
  Trash2,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMoodboard,
  addImagesToMoodboard,
  removeImageFromMoodboard,
  MAX_IMAGES,
  type Moodboard,
} from "@/lib/moodboard-store";

export const Route = createFileRoute("/app/moodboards/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Мудборд · ${params.id}, neeklo` }],
  }),
  component: MoodboardDetail,
  loader: ({ params }) => {
    if (typeof window === "undefined") return null;
    const b = getMoodboard(params.id);
    if (!b) throw notFound();
    return null;
  },
});

type Status = "idle" | "uploading";

function MoodboardDetail() {
  const { id } = Route.useParams();
  const [board, setBoard] = useState<Moodboard | null>(() =>
    typeof window === "undefined" ? null : getMoodboard(id) ?? null,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const refresh = () => setBoard(getMoodboard(id) ?? null);
    refresh();
    window.addEventListener("moodboard-store-changed", refresh);
    return () =>
      window.removeEventListener("moodboard-store-changed", refresh);
  }, [id]);

  if (!board) {
    return (
      <div className="rounded-tile border border-border bg-surface-1 p-6 text-center">
        <div className="text-[14px] font-semibold">Мудборд не найден</div>
        <Link
          to="/app/moodboards"
          className="text-[12.5px] text-accent hover:underline mt-1 inline-block"
        >
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const isPreset = !!board.isPreset;
  const remaining = MAX_IMAGES - board.images.length;

  const handleFiles = async (files: FileList | File[]) => {
    if (isPreset) {
      toast.info("Пресет-мудборды нельзя редактировать");
      return;
    }
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const slice = arr.slice(0, remaining);
    if (arr.length > remaining) {
      toast.info(`Можно добавить ещё ${remaining} (макс. ${MAX_IMAGES})`);
    }
    setStatus("uploading");
    setProgress(0);
    const dataUrls: string[] = [];
    for (let i = 0; i < slice.length; i++) {
      const f = slice[i];
      // eslint-disable-next-line no-await-in-loop
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      dataUrls.push(url);
      setProgress(Math.round(((i + 1) / slice.length) * 100));
    }
    addImagesToMoodboard(id, dataUrls);
    setStatus("idle");
    setProgress(0);
    toast.success(`Добавлено ${dataUrls.length} изображений`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* breadcrumb + header */}
      <header className="flex flex-col gap-3">
        <Link
          to="/app/moodboards"
          className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Все мудборды
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] sm:text-[22px] font-semibold leading-tight">
                {board.title}
              </h1>
              {isPreset && (
                <span
                  className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-semibold text-accent-foreground"
                  style={{ background: "var(--gradient-warm)" }}
                >
                  <Sparkles className="w-3 h-3" strokeWidth={2.2} /> Пресет
                </span>
              )}
            </div>
            {board.description && (
              <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
                {board.description}
              </p>
            )}
            <div className="text-[11.5px] text-muted-foreground tabular-nums mt-1.5">
              {board.images.length} / {MAX_IMAGES} изображений
            </div>
          </div>
          {!isPreset && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={status === "uploading" || remaining === 0}
              className="btn-primary inline-flex items-center gap-2 h-10 px-4 rounded-tile text-[13px] font-semibold disabled:opacity-50"
            >
              <Upload className="w-4 h-4" strokeWidth={2.2} />
              Загрузить
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </header>

      {/* upload progress */}
      {status === "uploading" && (
        <div className="rounded-tile border border-border bg-surface-1 p-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-accent animate-spin" strokeWidth={2} />
          <div className="flex-1">
            <div className="text-[12.5px] font-medium">Загружаем изображения…</div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full transition-[width] duration-200"
                style={{ width: `${progress}%`, background: "var(--gradient-warm)" }}
              />
            </div>
          </div>
          <div className="text-[11.5px] tabular-nums text-muted-foreground">
            {progress}%
          </div>
        </div>
      )}

      {/* grid */}
      {board.images.length === 0 && !isPreset ? (
        <DropZone onFiles={handleFiles} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {board.images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-tile overflow-hidden border border-border bg-surface-2"
            >
              <img
                src={img.src}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {!isPreset && (
                <button
                  type="button"
                  onClick={() => {
                    removeImageFromMoodboard(id, img.id);
                    toast.success("Удалено");
                  }}
                  aria-label="Удалить"
                  className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/65 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-studio"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          ))}
          {!isPreset && remaining > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-tile border border-dashed border-border bg-surface-1 hover:border-accent/60 hover:bg-surface-2 flex flex-col items-center justify-center gap-1.5 text-center transition-studio"
            >
              <ImagePlus className="w-5 h-5 text-accent" strokeWidth={1.8} />
              <span className="text-[11.5px] font-medium">Добавить</span>
              <span className="text-[10.5px] text-muted-foreground tabular-nums">
                ещё {remaining}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DropZone({ onFiles }: { onFiles: (files: FileList | File[]) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`rounded-tile border-2 border-dashed transition-studio min-h-[260px] flex flex-col items-center justify-center text-center gap-3 px-6 py-10 ${
        over ? "border-accent bg-surface-2" : "border-border bg-surface-1"
      }`}
    >
      <span
        className="inline-flex items-center justify-center w-12 h-12 rounded-full text-accent-foreground"
        style={{ background: "var(--gradient-warm)" }}
      >
        <Upload className="w-5 h-5" strokeWidth={1.8} />
      </span>
      <div>
        <div className="text-[14px] font-semibold">Перетащи изображения сюда</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          До {MAX_IMAGES} файлов · JPG, PNG, WebP
        </div>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-primary inline-flex items-center gap-2 h-10 px-4 rounded-tile text-[13px] font-semibold"
      >
        <ImagePlus className="w-4 h-4" strokeWidth={2.2} />
        Выбрать файлы
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <span className="sr-only">
        <X />
      </span>
    </div>
  );
}
