import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Play, Pause } from "lucide-react";
import { tryGenerate } from "@/lib/mock-credits";
import { CreditCost } from "@/components/credit-cost";

export const Route = createFileRoute("/app/studio/voices")({
  head: () => ({ meta: [{ title: "Студия голосов" }] }),
  component: VoicesStudio,
});

type Voice = {
  id: string;
  name: string;
  lang: string;
  duration: string;
  tag?: "Свой" | "Pro";
  // amplitude profile for waveform (16 bars, 0..1)
  wave: number[];
  hue: string; // tailwind gradient pair
};

const VOICES: Voice[] = [
  { id: "v1", name: "Алекс, спокойный", lang: "RU · мужской", duration: "0:08", wave: [0.3,0.6,0.8,0.5,0.9,0.4,0.7,0.95,0.6,0.85,0.45,0.7,0.55,0.9,0.5,0.4], hue: "from-rose-400 to-orange-400" },
  { id: "v2", name: "Мила, дружелюбный", lang: "RU · женский", duration: "0:06", tag: "Свой", wave: [0.5,0.8,0.4,0.7,0.6,0.95,0.5,0.7,0.85,0.4,0.6,0.9,0.5,0.75,0.45,0.6], hue: "from-fuchsia-400 to-pink-400" },
  { id: "v3", name: "Nova, energetic", lang: "EN · female", duration: "0:09", tag: "Pro", wave: [0.7,0.9,0.5,0.85,0.95,0.6,0.75,0.5,0.9,0.65,0.8,0.95,0.55,0.7,0.85,0.5], hue: "from-amber-400 to-yellow-300" },
  { id: "v4", name: "Грей, диктор", lang: "RU · мужской", duration: "0:10", wave: [0.4,0.6,0.45,0.7,0.5,0.65,0.4,0.55,0.7,0.5,0.6,0.45,0.65,0.5,0.7,0.4], hue: "from-sky-400 to-cyan-300" },
  { id: "v5", name: "Юна, мягкий", lang: "RU · женский", duration: "0:07", wave: [0.3,0.5,0.35,0.6,0.4,0.55,0.3,0.5,0.65,0.4,0.55,0.35,0.5,0.4,0.6,0.35], hue: "from-violet-400 to-indigo-400" },
  { id: "v6", name: "Tariq, narrator", lang: "EN · male", duration: "0:11", tag: "Pro", wave: [0.6,0.85,0.5,0.95,0.7,0.55,0.9,0.45,0.8,0.6,0.95,0.5,0.75,0.85,0.55,0.7], hue: "from-emerald-400 to-teal-300" },
];

function VoicesStudio() {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 pt-8 pb-16">
        <Link to="/app/studio/video" className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> К студии
        </Link>

        <header className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h1 className="text-[26px] lg:text-[30px] leading-tight font-bold tracking-tight">Студия голосов</h1>
            <p className="text-[13.5px] text-muted-foreground mt-1">Готовые голоса и твои клоны для озвучки</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!tryGenerate()) return;
              toast("Запиши 30 секунд речи", { description: "Клон голоса будет готов за ~5 минут" });
            }}
            className="shrink-0 h-11 px-4 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Клонировать голос</span>
            <CreditCost />
          </button>
        </header>

        <ul className="flex flex-col gap-2">
          {VOICES.map((v) => (
            <VoiceRow
              key={v.id}
              voice={v}
              playing={playing === v.id}
              onToggle={() => setPlaying((p) => (p === v.id ? null : v.id))}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function VoiceRow({ voice, playing, onToggle }: { voice: Voice; playing: boolean; onToggle: () => void }) {
  return (
    <li className="rounded-2xl bg-card border border-border/60 p-3 flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        className="shrink-0 w-11 h-11 rounded-full bg-background border border-border/60 hover:border-accent/60 hover:text-accent flex items-center justify-center transition-colors"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{voice.name}</div>
          {voice.tag && (
            <span className={`shrink-0 h-4.5 px-1.5 inline-flex items-center rounded-full text-[9.5px] font-semibold ${
              voice.tag === "Свой"
                ? "bg-accent/15 border border-accent/40 text-accent"
                : "bg-background border border-border/60 text-muted-foreground"
            }`}>
              {voice.tag}
            </span>
          )}
        </div>

        {/* Waveform */}
        <div className="flex items-center gap-[3px] h-7">
          {voice.wave.map((a, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full bg-gradient-to-b ${voice.hue} ${playing ? "opacity-100" : "opacity-70"}`}
              style={{ height: `${Math.max(15, a * 100)}%` }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{voice.lang}</span>
          <span className="font-mono">{voice.duration}</span>
        </div>
      </div>
    </li>
  );
}
