import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ImagePlus,
  Wand2,
  Maximize2,
  Eraser,
  Film,
  Scissors,
  Wrench,
  Camera,
  Sparkles,
  Zap,
  Mic2,
  Move3d,
  Boxes,
  Shuffle,
  Banana,
  type LucideIcon,
} from "lucide-react";


export const Route = createFileRoute("/app/tools/")({
  head: () => ({
    meta: [
      { title: "AI-инструменты" },
      { name: "description", content: "Набор AI-инструментов для фото и видео." },
    ],
  }),
  component: ToolsPage,
});

type Tool = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

export const tools: Tool[] = [
  { id: "generate-photo", title: "Сгенерировать фото", desc: "Фото из текста", icon: ImagePlus },
  { id: "edit-photo", title: "Редактор фото", desc: "Правка по AI", icon: Wand2 },
  { id: "upscale", title: "Апскейл", desc: "Поднять качество", icon: Maximize2 },
  { id: "remove-bg", title: "Убрать фон", desc: "Чистый вырез объекта", icon: Eraser },
  { id: "generate-video", title: "Сгенерировать видео", desc: "Видео из текста", icon: Film },
  { id: "edit-video", title: "Монтаж", desc: "Нарезка и склейка", icon: Scissors },
  { id: "photo", title: "Фото", desc: "Студия фото-генерации", icon: Camera },
  { id: "video", title: "Видео", desc: "Студия видео-генерации", icon: Film },
  { id: "enhancer", title: "Энхансер", desc: "Улучшение качества и деталей", icon: Sparkles },
  { id: "realtime", title: "Realtime", desc: "Живая генерация на лету", icon: Zap },
  { id: "editor", title: "Редактор", desc: "Точечные правки изображения", icon: Wand2 },
  { id: "lipsync", title: "Липсинк", desc: "Синхронизация губ с речью", icon: Mic2 },
  { id: "motion", title: "Перенос движения", desc: "Анимация по референсу", icon: Move3d },
  { id: "3d", title: "3D-объекты", desc: "Генерация 3D-моделей", icon: Boxes },
  { id: "restyle", title: "Рестайл видео", desc: "Новый стиль для ролика", icon: Shuffle },
  { id: "nano-banana", title: "Nano Banana", desc: "Быстрая мульти-правка фото", icon: Banana },
];


function ToolsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex justify-center">
      <div className="w-full app-screen min-h-dvh px-5 pt-14 pb-12">
        <header className="mb-7">
          <Link
            to="/app/factory"
            className="text-[13px] text-muted-foreground inline-flex items-center mb-3 hover:text-foreground"
          >
            ← Завод
          </Link>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-2 border border-border">
              <Wrench className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Микро-инструменты</span>
          </div>
          <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.02em]">
            AI-инструменты
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[32ch]">
            Точечные операции: апскейл, фон, генерация фото и видео.
          </p>
        </header>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                to="/app/tools/$toolId"
                params={{ toolId: t.id }}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 min-h-[140px] active:scale-[0.98] transition-transform"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px]"
                    strokeWidth={1.6}
                    style={{ color: "var(--accent)" }}
                  />
                </div>
                <div className="mt-auto">
                  <div className="text-[15px] font-semibold leading-tight">
                    {t.title}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1 truncate">
                    {t.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
