import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Video, Globe, Bot } from "lucide-react";
import p1 from "@/assets/preset-1.jpg";
import p2 from "@/assets/preset-2.jpg";
import p3 from "@/assets/preset-3.jpg";
import p4 from "@/assets/preset-4.jpg";
import p5 from "@/assets/preset-5.jpg";
import p6 from "@/assets/preset-6.jpg";

type Kind = "video" | "site" | "assistant";

const kindMeta: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  video: { label: "Видео", icon: Video },
  site: { label: "Сайт", icon: Globe },
  assistant: { label: "Ассистент", icon: Bot },
};

type Template = { id: string; title: string; desc: string; kind: Kind; cover: string };

const templates: Template[] = [
  { id: "reels-services", title: "Reels для услуг", desc: "9:16 · 12 сек · хук + оффер", kind: "video", cover: p1 },
  { id: "landing-master", title: "Лендинг для мастера", desc: "1 экран · форма записи", kind: "site", cover: p2 },
  { id: "avito-assistant", title: "Ассистент для Avito", desc: "Отвечает и квалифицирует", kind: "assistant", cover: p3 },
  { id: "unboxing", title: "Распаковка товара", desc: "9:16 · 15 сек · крупный план", kind: "video", cover: p4 },
  { id: "expert-card", title: "Сайт-визитка эксперта", desc: "Био, кейсы, контакты", kind: "site", cover: p5 },
  { id: "sales-manager", title: "Менеджер по продажам", desc: "Ведёт диалог до оплаты", kind: "assistant", cover: p6 },
];

export function TemplatesDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();

  function pick() {
    onOpenChange(false);
    setTimeout(() => navigate({ to: "/app/create" }), 120);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] bg-background border-border rounded-t-3xl p-0 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl h-full flex flex-col">
          <SheetHeader className="px-5 pt-6 pb-3 text-left">
            <SheetTitle className="text-[22px] font-bold tracking-tight">Готовые шаблоны</SheetTitle>
            <SheetDescription className="text-[13.5px] text-muted-foreground">
              Выбери шаблон, получишь результат за минуту
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <div className="grid grid-cols-2 gap-3">
              {templates.map((t) => {
                const Meta = kindMeta[t.kind];
                const Icon = Meta.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={pick}
                    className="group flex flex-col gap-2.5 text-left active:scale-[0.99] transition-transform"
                  >
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-card">
                      <img loading="lazy" decoding="async" src={t.cover} alt={t.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <span className="absolute top-2.5 left-2.5 flex items-center gap-1 h-6 pl-1.5 pr-2 rounded-full bg-background/85 backdrop-blur-sm text-[11px] font-semibold text-accent">
                        <Icon className="w-3 h-3" />
                        {Meta.label}
                      </span>
                    </div>
                    <div className="px-0.5">
                      <div className="text-[14px] font-semibold leading-tight">{t.title}</div>
                      <div className="text-[12px] text-muted-foreground mt-1 truncate">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
