import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Check, Sparkles } from "lucide-react";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";

export const Route = createFileRoute("/app/studio/avatars")({
  head: () => ({ meta: [{ title: "Студия аватаров" }] }),
  component: AvatarsStudio,
});

type Avatar = {
  id: string;
  name: string;
  role: string;
  tag?: "Новый" | "Pro";
  gradient: string;
  selected?: boolean;
};

const AVATARS: Avatar[] = [
  { id: "a1", name: "Лина", role: "Презентер · ru", gradient: "from-rose-400 via-orange-400 to-amber-300", selected: true },
  { id: "a2", name: "Марк", role: "Бизнес · en/ru", tag: "Pro", gradient: "from-sky-400 via-cyan-300 to-emerald-300" },
  { id: "a3", name: "Ева", role: "Лайфстайл · ru", gradient: "from-violet-400 via-fuchsia-400 to-pink-300" },
  { id: "a4", name: "Артур", role: "Эксперт · ru", gradient: "from-amber-400 via-orange-400 to-rose-400" },
  { id: "a5", name: "Соня", role: "Tutor · en", tag: "Новый", gradient: "from-emerald-400 via-teal-400 to-cyan-300" },
  { id: "a6", name: "Кирилл", role: "Новости · ru", gradient: "from-indigo-400 via-blue-400 to-sky-300" },
  { id: "a7", name: "Юна", role: "ASMR · multi", gradient: "from-pink-400 via-rose-300 to-orange-300" },
  { id: "a8", name: "Олег", role: "Спорт · ru", tag: "Pro", gradient: "from-lime-400 via-emerald-400 to-teal-300" },
];

function AvatarsStudio() {
  const [selectedId, setSelectedId] = useState<string>(
    AVATARS.find((a) => a.selected)?.id ?? AVATARS[0].id
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16">
        <Link to="/app/studio/video" className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> К студии
        </Link>

        <header className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h1 className="text-[26px] lg:text-[30px] leading-tight font-bold tracking-tight">Студия аватаров</h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">Выбери говорящего аватара для своих роликов</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!tryGenerate()) return;
              toast("Загрузи 30 секунд видео себя", { description: "Создание аватара займёт ~10 минут" });
            }}
            className="shrink-0 h-11 px-4 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Создать аватар</span>
            <CreditCost />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AVATARS.map((a) => (
            <AvatarCard
              key={a.id}
              avatar={{ ...a, selected: a.id === selectedId }}
              onSelect={() => {
                setSelectedId(a.id);
                toast.success("Аватар «" + a.name + "» выбран");
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AvatarCard({ avatar, onSelect }: { avatar: Avatar; onSelect: () => void }) {
  return (
    <div className={`rounded-2xl bg-card border ${avatar.selected ? "border-accent/60" : "border-border/60"} overflow-hidden flex flex-col transition-colors`}>
      <div className={`relative aspect-[3/4] bg-gradient-to-br ${avatar.gradient} overflow-hidden`}>
        <svg viewBox="0 0 100 130" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <radialGradient id={`s-${avatar.id}`} cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          <rect width="100" height="130" fill={`url(#s-${avatar.id})`} />
          <path d="M5 130 C 15 95, 35 85, 50 85 C 65 85, 85 95, 95 130 Z" fill="rgba(0,0,0,0.28)" />
          <circle cx="50" cy="55" r="22" fill="rgba(0,0,0,0.25)" />
          <circle cx="50" cy="55" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        </svg>

        {avatar.tag && (
          <span className="absolute top-2 left-2 h-5 px-2 inline-flex items-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white">
            {avatar.tag}
          </span>
        )}
        {avatar.selected && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{avatar.name}</div>
          <div className="text-[11.5px] text-muted-foreground truncate">{avatar.role}</div>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className={`h-9 rounded-full text-[12.5px] font-semibold transition-colors ${
            avatar.selected
              ? "bg-accent/15 border border-accent/40 text-accent"
              : "bg-background border border-border/60 text-foreground hover:border-border"
          }`}
        >
          {avatar.selected ? (
            <span className="inline-flex items-center gap-1.5 justify-center">
              <Sparkles className="w-3.5 h-3.5" /> Выбран
            </span>
          ) : (
            "Выбрать"
          )}
        </button>
      </div>
    </div>
  );
}
