// /app/nodes — Нодовый холст (§6): визуальные пайплайны из инструментов.
// Лендинг с вкладками + полноценный редактор: зум/пан, типизированные порты,
// статусы выполнения, правая панель настроек, undo/redo, ветки, история версий,
// каталог нод по категориям, миникарта. gen-image/gen-video/tts/avatar подключены
// к реальному job API (тот же контракт, что и студии).
import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Workflow,
  Plus,
  Image as ImageIcon,
  ImagePlus,
  Type as TypeIcon,
  Video,
  AudioLines,
  Wand2,
  Sparkles,
  Film,
  MessageSquare,
  Bot,
  Mic,
  FileText,
  FileAudio,
  Scissors,
  Shuffle,
  SquareStack,
  Archive,
  Repeat2,
  Upload,
  Download,
  ArrowRightLeft,
  Captions,
  Share2,
  Rocket,
  MousePointer2,
  Hand,
  StickyNote,
  Frame,
  Smile,
  Boxes,
  Play,
  ArrowLeft,
  Trash2,
  Copy,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  CircleDot,
  MoreVertical,
  FolderOpen,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Save,
  History,
  GitBranch,
  ChevronDown,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { tryGenerate, refundCredits } from "@/lib/mock-credits";
import { runJob, type JobKind } from "@/lib/api/generate";
import { addMedia, pickGradient, listMedia, type MediaItem } from "@/lib/media-store";
import { imageModels, videoModels, getModel } from "@/lib/media-models";
import { Panel, ToolHeader, SegmentedTabs, type ToolTab } from "@/components/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/nodes")({
  head: () => ({
    meta: [
      { title: "Нодовый редактор, neeklo" },
      { name: "description", content: "Собирай визуальные пайплайны из инструментов: вход → обработка → выход." },
    ],
  }),
  component: NodesPage,
});

/* ───────────────────────── типы ───────────────────────── */

type PortType = "text" | "image" | "video" | "audio" | "any";
type NodeCategory = "basic" | "integration" | "audio" | "media" | "compositions" | "utility" | "io";
type NodeStatus = "idle" | "queued" | "running" | "done" | "error";
type Tool = "select" | "hand";

type Port = { id: string; type: PortType; label: string };

type NodeDef = {
  kind: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  category: NodeCategory;
  inputs: Port[];
  outputs: Port[];
  runnable?: boolean;
  jobKind?: JobKind;
  modelKind?: "image" | "video";
  cost?: number;
};

type NodeData = {
  text?: string;
  system?: string;
  modelId?: string;
  format?: string;
  src?: string;
  note?: string;
  w?: number;
  h?: number;
};

type WFNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  title?: string;
  status: NodeStatus;
  progress?: number;
  error?: string;
  data: NodeData;
};

type WFEdge = { id: string; from: string; fromPort: string; to: string; toPort: string };

type Graph = { nodes: WFNode[]; edges: WFEdge[] };
type Snap = Graph & { name: string; view?: { pan: { x: number; y: number }; scale: number } };

/* ───────────────────────── типы портов ───────────────────────── */

const TYPE_META: Record<PortType, { color: string; label: string }> = {
  text: { color: "#7CC4A3", label: "Текст" },
  image: { color: "var(--accent)", label: "Изображение" },
  video: { color: "#5A8DEE", label: "Видео" },
  audio: { color: "#F4B03A", label: "Аудио" },
  any: { color: "#9aa0a6", label: "Любой" },
};

function typesCompatible(a: PortType, b: PortType) {
  return a === b || a === "any" || b === "any";
}

const P = (id: string, type: PortType, label: string): Port => ({ id, type, label });

/* ───────────────────────── каталог нод (§6.3) ───────────────────────── */

const CATALOG: NodeDef[] = [
  // BASIC
  { kind: "text", label: "Текст", desc: "Текстовый ввод / промпт", icon: TypeIcon, accent: "#7CC4A3", category: "basic", inputs: [], outputs: [P("out", "text", "Текст")] },
  { kind: "image", label: "Изображение", desc: "Источник: загрузка или ассет", icon: ImageIcon, accent: "var(--accent)", category: "basic", inputs: [], outputs: [P("out", "image", "Изобр.")] },
  { kind: "video", label: "Видео", desc: "Источник видео", icon: Video, accent: "#5A8DEE", category: "basic", inputs: [], outputs: [P("out", "video", "Видео")] },
  { kind: "audio", label: "Аудио", desc: "Источник аудио", icon: AudioLines, accent: "#F4B03A", category: "basic", inputs: [], outputs: [P("out", "audio", "Аудио")] },

  // INTEGRATION
  { kind: "gen-image", label: "Создать изображение", desc: "Генерация по промпту", icon: Sparkles, accent: "var(--accent)", category: "integration", runnable: true, jobKind: "image", modelKind: "image", inputs: [P("prompt", "text", "Промпт"), P("ref", "image", "Референс")], outputs: [P("out", "image", "Изобр.")] },
  { kind: "gen-video", label: "Создать видео", desc: "Генерация видео", icon: Film, accent: "#5A8DEE", category: "integration", runnable: true, jobKind: "video", modelKind: "video", inputs: [P("prompt", "text", "Промпт"), P("frame", "image", "Кадр")], outputs: [P("out", "video", "Видео")] },
  { kind: "llm", label: "OpenAI / Claude", desc: "Чат-модель, текст → текст", icon: MessageSquare, accent: "#A78BFA", category: "integration", runnable: true, cost: 1, inputs: [P("prompt", "text", "Промпт"), P("system", "text", "System")], outputs: [P("out", "text", "Ответ")] },
  { kind: "heygen", label: "HeyGen аватар", desc: "Говорящий аватар", icon: Bot, accent: "#EC4899", category: "integration", runnable: true, jobKind: "avatar", cost: 20, inputs: [P("script", "text", "Скрипт"), P("audio", "audio", "Аудио")], outputs: [P("out", "video", "Видео")] },
  { kind: "fal", label: "fal.ai", desc: "Произвольная модель fal", icon: Boxes, accent: "#22D3EE", category: "integration", runnable: true, cost: 4, inputs: [P("in", "any", "Вход")], outputs: [P("out", "any", "Выход")] },

  // AUDIO
  { kind: "tts", label: "ElevenLabs Voiceover", desc: "Текст → озвучка", icon: Mic, accent: "#F4B03A", category: "audio", runnable: true, jobKind: "voice", cost: 6, inputs: [P("text", "text", "Текст")], outputs: [P("out", "audio", "Аудио")] },
  { kind: "transcribe", label: "ElevenLabs Transcribe", desc: "Аудио → текст", icon: FileAudio, accent: "#F4B03A", category: "audio", runnable: true, cost: 3, inputs: [P("audio", "audio", "Аудио")], outputs: [P("out", "text", "Текст")] },
  { kind: "stt-openai", label: "OpenAI Transcribe", desc: "Аудио → текст", icon: FileText, accent: "#A78BFA", category: "audio", runnable: true, cost: 3, inputs: [P("audio", "audio", "Аудио")], outputs: [P("out", "text", "Текст")] },

  // MEDIA
  { kind: "image-editor", label: "Image Editor", desc: "Апскейл, ретушь, фон", icon: Wand2, accent: "var(--accent)", category: "media", runnable: true, cost: 4, inputs: [P("image", "image", "Изобр.")], outputs: [P("out", "image", "Изобр.")] },
  { kind: "video-editor", label: "Video Editor", desc: "Обрезка, склейка, экспорт", icon: Film, accent: "#5A8DEE", category: "media", runnable: true, cost: 6, inputs: [P("video", "video", "Видео")], outputs: [P("out", "video", "Видео")] },

  // COMPOSITIONS
  { kind: "captions", label: "Captions", desc: "Субтитры на видео", icon: Captions, accent: "#7CC4A3", category: "compositions", runnable: true, cost: 4, inputs: [P("video", "video", "Видео")], outputs: [P("out", "video", "Видео")] },

  // UTILITY
  { kind: "split-text", label: "Split Text", desc: "Разбить текст на части", icon: Scissors, accent: "#9aa0a6", category: "utility", runnable: true, inputs: [P("in", "text", "Текст")], outputs: [P("out", "text", "Части")] },
  { kind: "random", label: "Random", desc: "Случайный выбор / сид", icon: Shuffle, accent: "#9aa0a6", category: "utility", runnable: true, inputs: [], outputs: [P("out", "text", "Значение")] },
  { kind: "extract-frame", label: "Extract Frame", desc: "Кадр из видео", icon: SquareStack, accent: "#5A8DEE", category: "utility", runnable: true, inputs: [P("video", "video", "Видео")], outputs: [P("out", "image", "Кадр")] },
  { kind: "archive", label: "Archive", desc: "Упаковать результаты", icon: Archive, accent: "#9aa0a6", category: "utility", runnable: true, inputs: [P("in", "any", "Вход")], outputs: [P("out", "any", "Архив")] },
  { kind: "batch", label: "Batch / Loop", desc: "Пакетная обработка", icon: Repeat2, accent: "#9aa0a6", category: "utility", runnable: true, inputs: [P("in", "any", "Список")], outputs: [P("out", "any", "Итерации")] },

  // INPUT / OUTPUT
  { kind: "import", label: "Import", desc: "Импорт из файла / URL", icon: Upload, accent: "#7CC4A3", category: "io", inputs: [], outputs: [P("out", "any", "Данные")] },
  { kind: "export", label: "Export", desc: "Сохранить в медиабанк", icon: Download, accent: "#5A8DEE", category: "io", runnable: true, inputs: [P("in", "any", "Вход")], outputs: [] },
  { kind: "use-in", label: "Использовать в", desc: "Передать в другой инструмент", icon: ArrowRightLeft, accent: "#A78BFA", category: "io", runnable: true, inputs: [P("image", "image", "Изобр."), P("video", "video", "Видео")], outputs: [] },
];

const STICKY_DEF: NodeDef = {
  kind: "sticky",
  label: "Заметка",
  desc: "Стикер",
  icon: StickyNote,
  accent: "#F4B03A",
  category: "utility",
  inputs: [],
  outputs: [],
};

const FRAME_DEF: NodeDef = {
  kind: "frame",
  label: "Фрейм",
  desc: "Группа нод",
  icon: Frame,
  accent: "#9aa0a6",
  category: "utility",
  inputs: [],
  outputs: [],
};

const DEF_MAP: Record<string, NodeDef> = Object.fromEntries(
  [...CATALOG, STICKY_DEF, FRAME_DEF].map((d) => [d.kind, d]),
);

function getDef(kind: string): NodeDef {
  return DEF_MAP[kind] ?? STICKY_DEF;
}

const CATEGORY_LABEL: Record<NodeCategory, string> = {
  basic: "Базовые",
  integration: "Интеграции",
  audio: "Аудио",
  media: "Медиа",
  compositions: "Композиции",
  utility: "Утилиты",
  io: "Ввод / Вывод",
};

const CATEGORY_ORDER: NodeCategory[] = [
  "basic",
  "integration",
  "audio",
  "media",
  "compositions",
  "utility",
  "io",
];

/* ───────────────────────── геометрия ───────────────────────── */

const NODE_W = 220;
const HEADER_H = 42;
const ROW = 26;
const BODY_PAD = 8;
const PREVIEW_H = 92;

function nodeRows(def: NodeDef) {
  return Math.max(def.inputs.length, def.outputs.length, 1);
}

function hasPreview(node: WFNode) {
  return node.kind !== "sticky" && !!node.data.src;
}

function nodeBodyHeight(def: NodeDef) {
  return nodeRows(def) * ROW + BODY_PAD * 2;
}

function nodeHeight(node: WFNode) {
  if (node.kind === "frame") return node.data.h ?? 240;
  if (node.kind === "sticky") return 120;
  const def = getDef(node.kind);
  return HEADER_H + nodeBodyHeight(def) + (hasPreview(node) ? PREVIEW_H : 0);
}

function nodeWidth(node: WFNode) {
  if (node.kind === "frame") return node.data.w ?? 340;
  return NODE_W;
}

function portY(node: WFNode, def: NodeDef, side: "in" | "out", portId: string) {
  const list = side === "in" ? def.inputs : def.outputs;
  const i = Math.max(0, list.findIndex((p) => p.id === portId));
  return node.y + HEADER_H + BODY_PAD + (i + 0.5) * ROW;
}

function portX(node: WFNode, side: "in" | "out") {
  return side === "in" ? node.x : node.x + NODE_W;
}

/* ───────────────────────── стоимость ───────────────────────── */

function nodeCost(node: WFNode): number {
  const def = getDef(node.kind);
  if (def.modelKind) {
    const list = def.modelKind === "image" ? imageModels() : videoModels();
    const model = (node.data.modelId && getModel(node.data.modelId)) || list[0];
    return model?.costCredits ?? def.cost ?? 0;
  }
  return def.cost ?? 0;
}

/* ───────────────────────── хранилище / ветки / версии ───────────────────────── */

const SKEY = "neeklo.nodes.v1";

type NodesStore = {
  active: string;
  branches: Record<string, Snap>;
  versions: Record<string, { id: string; ts: number; label: string; snap: Snap }[]>;
};

function loadStore(): NodesStore {
  if (typeof window === "undefined") return { active: "Master", branches: {}, versions: {} };
  try {
    const raw = localStorage.getItem(SKEY);
    if (raw) {
      const s = JSON.parse(raw) as NodesStore;
      return { active: s.active || "Master", branches: s.branches || {}, versions: s.versions || {} };
    }
  } catch {
    /* ignore */
  }
  return { active: "Master", branches: {}, versions: {} };
}

function saveStore(s: NodesStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

/* ───────────────────────── сниппеты (§6.7) ───────────────────────── */

let seedCounter = 0;
function nid() {
  seedCounter += 1;
  return `n_${Date.now().toString(36)}_${seedCounter}`;
}
function eid() {
  seedCounter += 1;
  return `e_${Date.now().toString(36)}_${seedCounter}`;
}

function mk(kind: string, x: number, y: number, data: NodeData = {}, title?: string): WFNode {
  return { id: nid(), kind, x, y, title, status: "idle", data };
}
function link(a: WFNode, ap: string, b: WFNode, bp: string): WFEdge {
  return { id: eid(), from: a.id, fromPort: ap, to: b.id, toPort: bp };
}

type Snippet = { id: string; title: string; desc: string; build: () => Graph };

const SNIPPETS: Snippet[] = [
  {
    id: "portrait-4k",
    title: "Портрет → стиль → 4K",
    desc: "Промпт + референс → изображение → энхансер → экспорт",
    build: () => {
      const prompt = mk("text", 60, 90, { text: "Киношный портрет, мягкий свет" }, "Промпт");
      const ref = mk("image", 60, 230, {}, "Референс");
      const gen = mk("gen-image", 340, 150, { modelId: imageModels()[0]?.id });
      const enh = mk("image-editor", 620, 150);
      const out = mk("export", 900, 150);
      return {
        nodes: [prompt, ref, gen, enh, out],
        edges: [
          link(prompt, "out", gen, "prompt"),
          link(ref, "out", gen, "ref"),
          link(gen, "out", enh, "image"),
          link(enh, "out", out, "in"),
        ],
      };
    },
  },
  {
    id: "reels",
    title: "Reels с озвучкой и субтитрами",
    desc: "Сценарий → видео + озвучка → субтитры → экспорт",
    build: () => {
      const script = mk("text", 60, 120, { text: "Динамичный рекламный ролик о продукте" }, "Сценарий");
      const gen = mk("gen-video", 340, 60, { modelId: videoModels()[0]?.id });
      const tts = mk("tts", 340, 240);
      const cap = mk("captions", 620, 90);
      const out = mk("export", 900, 90);
      return {
        nodes: [script, gen, tts, cap, out],
        edges: [
          link(script, "out", gen, "prompt"),
          link(script, "out", tts, "text"),
          link(gen, "out", cap, "video"),
          link(cap, "out", out, "in"),
        ],
      };
    },
  },
  {
    id: "talking-avatar",
    title: "Говорящий аватар",
    desc: "Скрипт → HeyGen → экспорт",
    build: () => {
      const script = mk("text", 60, 140, { text: "Здравствуйте! Сегодня расскажу о новинке." }, "Скрипт");
      const avatar = mk("heygen", 340, 120);
      const out = mk("export", 620, 120);
      return {
        nodes: [script, avatar, out],
        edges: [link(script, "out", avatar, "script"), link(avatar, "out", out, "in")],
      };
    },
  },
];

const TABS: ToolTab[] = [
  { id: "projects", label: "Проекты" },
  { id: "apps", label: "Приложения" },
  { id: "examples", label: "Примеры" },
  { id: "templates", label: "Шаблоны" },
];

/* ───────────────────────── page (landing) ───────────────────────── */

function NodesPage() {
  const [mode, setMode] = useState<"landing" | "editor">("landing");
  const [tab, setTab] = useState<string>("projects");
  const [initial, setInitial] = useState<Graph | undefined>();

  if (mode === "editor") {
    return <Editor initial={initial} onBack={() => setMode("landing")} />;
  }

  const openNew = () => {
    setInitial(undefined);
    setMode("editor");
  };
  const openSnippet = (s: Snippet) => {
    setInitial(s.build());
    setMode("editor");
  };

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1500px] mx-auto">
      <ToolHeader
        icon={Workflow}
        title="Нодовый редактор"
        subtitle="Собирай визуальные пайплайны: вход → обработка → выход. Превращай их в приложения."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Новый воркфлоу
          </button>
        }
      />

      <SegmentedTabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

      {tab === "projects" && (
        <EmptyState
          icon={FolderOpen}
          title="Пока нет воркфлоу"
          desc="Создай свой первый визуальный пайплайн. Соедини источник, обработку и выход."
          action={
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Новый воркфлоу
            </button>
          }
        />
      )}

      {tab === "apps" && (
        <EmptyState
          icon={Rocket}
          title="Пока нет приложений"
          desc="Превращай готовые воркфлоу в простые приложения для команды или клиентов."
        />
      )}

      {tab === "examples" && (
        <CardGrid>
          {SNIPPETS.map((ex) => (
            <SnippetCard key={ex.id} title={ex.title} desc={ex.desc} label="Пример" icon={Workflow} onClick={() => openSnippet(ex)} cta="Открыть в редакторе →" />
          ))}
        </CardGrid>
      )}

      {tab === "templates" && (
        <CardGrid>
          {SNIPPETS.map((t) => (
            <SnippetCard key={t.id} title={t.title} desc={t.desc} label="Шаблон" icon={LayoutGrid} onClick={() => openSnippet(t)} cta="Использовать →" />
          ))}
        </CardGrid>
      )}
    </div>
  );
}

function SnippetCard({
  title,
  desc,
  label,
  icon: Icon,
  onClick,
  cta,
}: {
  title: string;
  desc: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  cta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-tile border border-border bg-foreground/[0.03] hover:border-accent/60 transition-colors p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md" style={{ background: "var(--gradient-warm-soft)" }}>
          <Icon className="w-4 h-4 text-accent" />
        </span>
        <span className="text-xs uppercase tracking-wider text-foreground/55">{label}</span>
      </div>
      <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
      <p className="text-[13px] text-foreground/65">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs text-accent">{cta}</div>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="p-10 lg:p-14 flex flex-col items-center text-center">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4" style={{ background: "var(--gradient-warm-soft)" }}>
        <Icon className="w-6 h-6 text-accent" />
      </span>
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <p className="mt-1.5 text-[13.5px] text-foreground/65 max-w-md">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </Panel>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/* ───────────────────────── editor ───────────────────────── */

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function Editor({ initial, onBack }: { initial?: Graph; onBack: () => void }) {
  const [nodes, setNodes] = useState<WFNode[]>(initial?.nodes ?? []);
  const [edges, setEdges] = useState<WFEdge[]>(initial?.edges ?? []);
  const [name, setName] = useState("Новый воркфлоу");
  const [tool, setTool] = useState<Tool>("select");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [connectFrom, setConnectFrom] = useState<{ nodeId: string; portId: string; type: PortType } | null>(null);
  const [hoverIn, setHoverIn] = useState<{ nodeId: string; portId: string; type: PortType } | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [exec, setExec] = useState<"idle" | "running" | "done">("idle");

  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [scale, setScale] = useState(1);

  const [catalog, setCatalog] = useState<{ tab: "nodes" | "assets" | "snippets"; at?: { x: number; y: number } } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [branches, setBranches] = useState<string[]>(["Master"]);
  const [activeBranch, setActiveBranch] = useState("Master");
  const [versions, setVersions] = useState<{ id: string; ts: number; label: string }[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const spaceRef = useRef(false);
  const dragRef = useRef<{ startWorld: { x: number; y: number }; base: Map<string, { x: number; y: number }> } | null>(null);
  const resizeRef = useRef<{ id: string; startWorld: { x: number; y: number }; baseW: number; baseH: number } | null>(null);
  const panGestureRef = useRef<{ sx: number; sy: number; base: { x: number; y: number } } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number } | null>(null);
  const undoRef = useRef<Graph[]>([]);
  const redoRef = useRef<Graph[]>([]);
  const storeRef = useRef<NodesStore | null>(null);
  const hasLoaded = useRef(false);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  panRef.current = pan;
  scaleRef.current = scale;

  /* ───── coordinate transform ───── */
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const p = panRef.current;
    const s = scaleRef.current;
    const sx = clientX - (rect?.left ?? 0);
    const sy = clientY - (rect?.top ?? 0);
    return { x: (sx - p.x) / s, y: (sy - p.y) / s };
  }, []);

  /* ───── persistence: load ───── */
  useEffect(() => {
    const store = loadStore();
    storeRef.current = store;
    const list = Object.keys(store.branches);
    const branchList = list.length ? list : ["Master"];
    const active = branchList.includes(store.active) ? store.active : branchList[0];
    setBranches(branchList);
    setActiveBranch(active);
    setVersions((store.versions[active] ?? []).map((v) => ({ id: v.id, ts: v.ts, label: v.label })));

    if (initial) {
      // сниппет/пример: загружаем как есть, не трогаем сохранённую ветку
      hasLoaded.current = true;
      return;
    }
    const snap = store.branches[active];
    if (snap) {
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setName(snap.name);
      if (snap.view) {
        setPan(snap.view.pan);
        setScale(snap.view.scale);
      }
    }
    hasLoaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── persistence: autosave ───── */
  useEffect(() => {
    if (!hasLoaded.current) return;
    const t = window.setTimeout(() => {
      const s = storeRef.current;
      if (!s) return;
      s.branches[activeBranch] = { nodes, edges, name, view: { pan, scale } };
      s.active = activeBranch;
      saveStore(s);
    }, 600);
    return () => window.clearTimeout(t);
  }, [nodes, edges, name, pan, scale, activeBranch]);

  /* ───── history ───── */
  const pushHistory = useCallback(() => {
    undoRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (undoRef.current.length > 60) undoRef.current.shift();
    redoRef.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (!undoRef.current.length) return;
    redoRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const prev = undoRef.current.pop()!;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    undoRef.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const next = redoRef.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryTick((t) => t + 1);
  }, []);

  const canUndo = undoRef.current.length > 0;
  const canRedo = redoRef.current.length > 0;
  void historyTick;

  /* ───── node mutations ───── */
  const patchNode = useCallback((id: string, patch: Partial<WFNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);
  const patchNodeData = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);

  const addNode = useCallback(
    (kind: string, at?: { x: number; y: number }) => {
      pushHistory();
      const rect = canvasRef.current?.getBoundingClientRect();
      const world = at ?? screenToWorld((rect?.left ?? 0) + (rect?.width ?? 400) / 2, (rect?.top ?? 0) + (rect?.height ?? 300) / 2);
      const n: WFNode = {
        id: nid(),
        kind,
        x: world.x - NODE_W / 2,
        y: world.y - 40,
        status: "idle",
        data:
          kind === "sticky"
            ? { note: "Заметка…" }
            : kind === "frame"
              ? { note: "Фрейм", w: 360, h: 260 }
              : kind.startsWith("gen-")
                ? { modelId: (kind === "gen-image" ? imageModels() : videoModels())[0]?.id }
                : {},
      };
      setNodes((prev) => [...prev, n]);
      setSelectedIds([n.id]);
      toast.success(`Нода добавлена · ${getDef(kind).label}`);
    },
    [pushHistory, screenToWorld],
  );

  const deleteNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      pushHistory();
      const set = new Set(ids);
      setNodes((prev) => prev.filter((n) => !set.has(n.id)));
      setEdges((prev) => prev.filter((e) => !set.has(e.from) && !set.has(e.to)));
      setSelectedIds((prev) => prev.filter((id) => !set.has(id)));
    },
    [pushHistory],
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const n = nodesRef.current.find((x) => x.id === id);
      if (!n) return;
      pushHistory();
      const copy: WFNode = { ...n, id: nid(), x: n.x + 28, y: n.y + 28, status: "idle", data: { ...n.data } };
      setNodes((prev) => [...prev, copy]);
      setSelectedIds([copy.id]);
    },
    [pushHistory],
  );

  const connect = useCallback(
    (from: string, fromPort: string, to: string, toPort: string) => {
      if (from === to) return;
      const dup = edgesRef.current.some((e) => e.from === from && e.fromPort === fromPort && e.to === to && e.toPort === toPort);
      if (dup) return;
      pushHistory();
      setEdges((prev) => [...prev, { id: eid(), from, fromPort, to, toPort }]);
      toast.success("Соединение создано");
    },
    [pushHistory],
  );

  const deleteEdge = useCallback(
    (id: string) => {
      pushHistory();
      setEdges((prev) => prev.filter((e) => e.id !== id));
    },
    [pushHistory],
  );

  /* ───── keyboard ───── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      if (e.code === "Space" && !typing) spaceRef.current = true;
      if (typing) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCatalog({ tab: "nodes" });
      } else if (e.key === "Escape") {
        setConnectFrom(null);
        setCatalog(null);
        setSelectedIds([]);
        setShowHelp(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        deleteNodes(selectedIds);
      } else if (e.key === "=" || e.key === "+") {
        zoomAt(1.2);
      } else if (e.key === "-" || e.key === "_") {
        zoomAt(1 / 1.2);
      } else if (e.key === "0") {
        resetView();
      } else if (e.key.toLowerCase() === "f") {
        fitToView();
      } else if (e.key.toLowerCase() === "v") {
        setTool("select");
      } else if (e.key.toLowerCase() === "h") {
        setTool("hand");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, undo, redo, deleteNodes]);

  /* ───── wheel zoom (native, non-passive) ───── */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const old = scaleRef.current;
      const p = panRef.current;
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const ns = clamp(old * factor, MIN_SCALE, MAX_SCALE);
        const wx = (sx - p.x) / old;
        const wy = (sy - p.y) / old;
        setScale(ns);
        setPan({ x: sx - wx * ns, y: sy - wy * ns });
      } else {
        setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomAt = useCallback((factor: number, center?: { x: number; y: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = center?.x ?? (rect?.width ?? 400) / 2;
    const cy = center?.y ?? (rect?.height ?? 300) / 2;
    const old = scaleRef.current;
    const p = panRef.current;
    const ns = clamp(old * factor, MIN_SCALE, MAX_SCALE);
    const wx = (cx - p.x) / old;
    const wy = (cy - p.y) / old;
    setScale(ns);
    setPan({ x: cx - wx * ns, y: cy - wy * ns });
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 40, y: 40 });
  }, []);

  const fitToView = useCallback(() => {
    const ns = nodesRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!ns.length || !rect) {
      resetView();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of ns) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + nodeWidth(n));
      maxY = Math.max(maxY, n.y + nodeHeight(n));
    }
    const pad = 80;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const s = clamp(Math.min(rect.width / w, rect.height / h), MIN_SCALE, 1);
    setScale(s);
    setPan({ x: rect.width / 2 - ((minX + maxX) / 2) * s, y: rect.height / 2 - ((minY + maxY) / 2) * s });
  }, [resetView]);

  /* ───── pointer: node drag ───── */
  const onNodePointerDown = (e: ReactPointerEvent<HTMLDivElement>, n: WFNode) => {
    if (tool === "hand" || spaceRef.current) return;
    e.stopPropagation();
    let selection = selectedIds;
    if (e.shiftKey) {
      selection = selectedIds.includes(n.id) ? selectedIds.filter((id) => id !== n.id) : [...selectedIds, n.id];
      setSelectedIds(selection);
    } else if (!selectedIds.includes(n.id)) {
      selection = [n.id];
      setSelectedIds(selection);
    }
    pushHistory();
    const startWorld = screenToWorld(e.clientX, e.clientY);
    const base = new Map<string, { x: number; y: number }>();
    for (const node of nodesRef.current) {
      if (selection.includes(node.id)) base.set(node.id, { x: node.x, y: node.y });
    }
    if (!base.has(n.id)) base.set(n.id, { x: n.x, y: n.y });
    // фреймы тянут за собой вложенные ноды
    for (const fr of nodesRef.current) {
      if (fr.kind !== "frame" || !base.has(fr.id)) continue;
      const fw = nodeWidth(fr);
      const fh = nodeHeight(fr);
      for (const child of nodesRef.current) {
        if (child.kind === "frame" || base.has(child.id)) continue;
        const cx = child.x + nodeWidth(child) / 2;
        const cy = child.y + nodeHeight(child) / 2;
        if (cx >= fr.x && cx <= fr.x + fw && cy >= fr.y && cy <= fr.y + fh) base.set(child.id, { x: child.x, y: child.y });
      }
    }
    dragRef.current = { startWorld, base };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  /* ───── pointer: canvas ───── */
  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const middle = e.button === 1;
    if (tool === "hand" || spaceRef.current || middle) {
      panGestureRef.current = { sx: e.clientX, sy: e.clientY, base: { ...panRef.current } };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    // select tool on empty canvas → marquee
    if (!e.shiftKey) setSelectedIds([]);
    setCatalog(null);
    const w = screenToWorld(e.clientX, e.clientY);
    marqueeRef.current = { x0: w.x, y0: w.y };
    setMarquee({ x0: w.x, y0: w.y, x1: w.x, y1: w.y });
  };

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const w = screenToWorld(e.clientX, e.clientY);
    setMouseWorld(w);

    if (resizeRef.current) {
      const r = resizeRef.current;
      const nw = Math.max(180, r.baseW + (w.x - r.startWorld.x));
      const nh = Math.max(120, r.baseH + (w.y - r.startWorld.y));
      setNodes((prev) => prev.map((n) => (n.id === r.id ? { ...n, data: { ...n.data, w: nw, h: nh } } : n)));
      return;
    }
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = w.x - d.startWorld.x;
      const dy = w.y - d.startWorld.y;
      setNodes((prev) =>
        prev.map((n) => {
          const b = d.base.get(n.id);
          return b ? { ...n, x: b.x + dx, y: b.y + dy } : n;
        }),
      );
      return;
    }
    if (panGestureRef.current) {
      const g = panGestureRef.current;
      setPan({ x: g.base.x + (e.clientX - g.sx), y: g.base.y + (e.clientY - g.sy) });
      return;
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      setMarquee({ x0: m.x0, y0: m.y0, x1: w.x, y1: w.y });
    }
  };

  const onCanvasPointerUp = () => {
    dragRef.current = null;
    panGestureRef.current = null;
    resizeRef.current = null;

    if (connectFrom && hoverIn) {
      if (typesCompatible(connectFrom.type, hoverIn.type)) {
        connect(connectFrom.nodeId, connectFrom.portId, hoverIn.nodeId, hoverIn.portId);
      } else {
        toast.error("Несовместимые порты", { description: `${TYPE_META[connectFrom.type].label} → ${TYPE_META[hoverIn.type].label}` });
      }
    }
    setConnectFrom(null);

    if (marqueeRef.current && marquee) {
      const x0 = Math.min(marquee.x0, marquee.x1);
      const x1 = Math.max(marquee.x0, marquee.x1);
      const y0 = Math.min(marquee.y0, marquee.y1);
      const y1 = Math.max(marquee.y0, marquee.y1);
      if (Math.abs(x1 - x0) > 6 || Math.abs(y1 - y0) > 6) {
        const hit = nodesRef.current
          .filter((n) => n.x + nodeWidth(n) > x0 && n.x < x1 && n.y + nodeHeight(n) > y0 && n.y < y1)
          .map((n) => n.id);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...hit])));
      }
    }
    marqueeRef.current = null;
    setMarquee(null);
  };

  const onCanvasDoubleClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    const w = screenToWorld(e.clientX, e.clientY);
    setCatalog({ tab: "nodes", at: w });
  };

  /* ───── ports ───── */
  const onPortOutDown = (e: ReactPointerEvent<HTMLDivElement>, node: WFNode, port: Port) => {
    e.stopPropagation();
    setConnectFrom({ nodeId: node.id, portId: port.id, type: port.type });
  };

  /* ───── frame resize ───── */
  const onFrameResizeDown = (e: ReactPointerEvent<HTMLDivElement>, node: WFNode) => {
    e.stopPropagation();
    pushHistory();
    resizeRef.current = { id: node.id, startWorld: screenToWorld(e.clientX, e.clientY), baseW: nodeWidth(node), baseH: nodeHeight(node) };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  /* ───── execution (§6.5) ───── */
  const setStatus = (id: string, status: NodeStatus, progress?: number, error?: string) =>
    patchNode(id, { status, progress, error });

  const gatherInputs = (node: WFNode) => {
    const incoming = edgesRef.current.filter((e) => e.to === node.id);
    const prompts: string[] = [];
    let src: string | undefined;
    let srcType: PortType | undefined;
    for (const e of incoming) {
      const s = nodesRef.current.find((n) => n.id === e.from);
      if (!s) continue;
      const sdef = getDef(s.kind);
      const outPort = sdef.outputs.find((p) => p.id === e.fromPort);
      if (outPort?.type === "text" && s.data.text) prompts.push(s.data.text);
      if ((outPort?.type === "image" || outPort?.type === "video") && s.data.src && !src) {
        src = s.data.src;
        srcType = outPort.type;
      }
    }
    return { prompt: prompts.join("\n") || undefined, src, srcType };
  };

  const buildInput = (node: WFNode, jobKind: JobKind, prompt: string, src?: string): Record<string, unknown> => {
    const cost = nodeCost(node);
    switch (jobKind) {
      case "image":
        return { prompt, model: node.data.modelId, format: node.data.format || "1:1", count: 1, cost };
      case "video":
        return { prompt, model: node.data.modelId, format: node.data.format || "9:16", duration: 5, resolution: "720p", startFrame: src, cost };
      case "voice":
        return { text: prompt || node.data.text || "", cost };
      case "avatar":
        return { script: prompt || node.data.text || "", audioUrl: src, cost };
      default:
        return { prompt, src, cost };
    }
  };

  const animateMock = (id: string, ms: number) =>
    new Promise<void>((resolve) => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - start) / ms);
        setStatus(id, "running", Math.round(p * 100));
        if (p >= 1) resolve();
        else window.setTimeout(tick, 90);
      };
      tick();
    });

  const runNode = useCallback(async (id: string): Promise<boolean> => {
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return false;
    const def = getDef(node.kind);
    if (!def.runnable || node.kind === "sticky") return true;

    const inputs = gatherInputs(node);

    // терминальные ноды ввода/вывода — без кредитов, с реальным эффектом
    if (node.kind === "export" || node.kind === "use-in") {
      if (!inputs.src) {
        toast.error(`${def.label}: нет входного ассета`);
        setStatus(id, "error", 0, "Нет входа");
        return false;
      }
      setStatus(id, "running", 40);
      await new Promise((r) => window.setTimeout(r, 280));
      if (node.kind === "export") {
        addMedia({
          kind: inputs.srcType === "video" ? "video" : "photo",
          title: node.title || "Экспорт",
          ratio: (node.data.format as MediaItem["ratio"]) || "1:1",
          gradient: pickGradient(),
          src: inputs.src.startsWith("http") ? inputs.src : undefined,
        });
        toast.success("Сохранено в медиабанк");
      } else {
        try {
          sessionStorage.setItem("neeklo:handoff", JSON.stringify({ src: inputs.src, type: inputs.srcType }));
        } catch {
          /* ignore */
        }
        if (inputs.src.startsWith("http")) {
          try {
            await navigator.clipboard.writeText(inputs.src);
            toast.success("Ссылка на ассет скопирована");
          } catch {
            toast.success("Ассет подготовлен к передаче");
          }
        } else {
          toast.success("Ассет подготовлен к передаче");
        }
      }
      patchNode(id, { status: "done", progress: 100, error: undefined });
      patchNodeData(id, { src: inputs.src });
      return true;
    }

    const prompt = inputs.prompt ?? node.data.text ?? "";
    if ((node.kind === "gen-image" || node.kind === "gen-video") && !prompt && !inputs.src) {
      toast.error(`${def.label}: нужен промпт или входной ассет`);
      setStatus(id, "error", 0, "Нет входных данных");
      return false;
    }

    const cost = nodeCost(node);
    if (cost > 0 && !tryGenerate(cost)) {
      setStatus(id, "error", 0, "Недостаточно кредитов");
      return false;
    }

    setStatus(id, "running", 0);
    try {
      if (def.jobKind) {
        const input = buildInput(node, def.jobKind, prompt, inputs.src);
        const res = await runJob(def.jobKind, input, {
          title: node.title || def.label,
          onProgress: (p) => setStatus(id, "running", Math.round(p * 100)),
        });
        if (res.status === "completed") {
          patchNode(id, { status: "done", progress: 100, error: undefined });
          if (res.assetUrl) {
            patchNodeData(id, { src: res.assetUrl });
            const isVideo = def.outputs.some((o) => o.type === "video");
            addMedia({ kind: isVideo ? "video" : "photo", title: node.title || def.label, ratio: (node.data.format as MediaItem["ratio"]) || "1:1", gradient: pickGradient(), src: res.assetUrl });
          }
          return true;
        }
        if (cost > 0) refundCredits(cost);
        setStatus(id, "error", 0, friendlyError(res.error));
        return false;
      }

      // мок-обработка для нод без реального job API
      await animateMock(id, 900 + Math.random() * 700);
      const outText = def.outputs.some((o) => o.type === "text");
      const outMedia = def.outputs.find((o) => o.type === "image" || o.type === "video");
      patchNode(id, { status: "done", progress: 100, error: undefined });
      if (outText) patchNodeData(id, { text: mockText(def, prompt) });
      if (outMedia) patchNodeData(id, { src: inputs.src || node.data.src || `mock://${node.id}` });
      return true;
    } catch (err) {
      if (cost > 0) refundCredits(cost);
      setStatus(id, "error", 0, friendlyError(err instanceof Error ? err.message : String(err)));
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchNode, patchNodeData]);

  const runGraph = useCallback(async () => {
    const order = topoOrder(nodesRef.current, edgesRef.current).filter((id) => {
      const n = nodesRef.current.find((x) => x.id === id);
      return n && getDef(n.kind).runnable && n.kind !== "sticky";
    });
    if (!order.length) {
      toast.error("Нет исполняемых нод");
      return;
    }
    setExec("running");
    for (const id of order) setStatus(id, "queued");
    let ok = true;
    for (const id of order) {
      const success = await runNode(id);
      if (!success) {
        ok = false;
        break;
      }
    }
    setExec(ok ? "done" : "idle");
    if (ok) {
      toast.success("Воркфлоу выполнен", { description: "Результаты сохранены в медиабанк" });
      window.setTimeout(() => setExec("idle"), 1800);
    }
  }, [runNode]);

  /* ───── save / branches / versions ───── */
  const saveVersion = useCallback(() => {
    const s = storeRef.current;
    if (!s) return;
    const snap: Snap = { nodes: nodesRef.current, edges: edgesRef.current, name, view: { pan: panRef.current, scale: scaleRef.current } };
    const arr = s.versions[activeBranch] ?? [];
    const entry = { id: `ver_${Date.now().toString(36)}`, ts: Date.now(), label: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), snap };
    s.versions[activeBranch] = [entry, ...arr].slice(0, 20);
    s.branches[activeBranch] = snap;
    saveStore(s);
    setVersions(s.versions[activeBranch].map((v) => ({ id: v.id, ts: v.ts, label: v.label })));
    setSavedAt(Date.now());
    toast.success("Версия сохранена");
  }, [activeBranch, name]);

  const restoreVersion = useCallback(
    (id: string) => {
      const s = storeRef.current;
      const entry = s?.versions[activeBranch]?.find((v) => v.id === id);
      if (!entry) return;
      pushHistory();
      setNodes(entry.snap.nodes);
      setEdges(entry.snap.edges);
      setName(entry.snap.name);
      setShowHistory(false);
      toast.success("Версия восстановлена");
    },
    [activeBranch, pushHistory],
  );

  const switchBranch = useCallback(
    (nm: string) => {
      if (nm === activeBranch) {
        setShowBranches(false);
        return;
      }
      const s = storeRef.current;
      if (!s) return;
      s.branches[activeBranch] = { nodes: nodesRef.current, edges: edgesRef.current, name, view: { pan: panRef.current, scale: scaleRef.current } };
      saveStore(s);
      const snap = s.branches[nm];
      setActiveBranch(nm);
      setNodes(snap?.nodes ?? []);
      setEdges(snap?.edges ?? []);
      setName(snap?.name ?? nm);
      if (snap?.view) {
        setPan(snap.view.pan);
        setScale(snap.view.scale);
      }
      setVersions((s.versions[nm] ?? []).map((v) => ({ id: v.id, ts: v.ts, label: v.label })));
      undoRef.current = [];
      redoRef.current = [];
      setSelectedIds([]);
      setShowBranches(false);
    },
    [activeBranch, name],
  );

  const createBranch = useCallback(() => {
    const nm = window.prompt("Название ветки")?.trim();
    if (!nm) return;
    if (branches.includes(nm)) {
      toast.error("Ветка уже существует");
      return;
    }
    const s = storeRef.current;
    if (!s) return;
    s.branches[nm] = { nodes: nodesRef.current, edges: edgesRef.current, name, view: { pan: panRef.current, scale: scaleRef.current } };
    saveStore(s);
    setBranches((prev) => [...prev, nm]);
    switchBranch(nm);
    toast.success(`Ветка «${nm}» создана`);
  }, [branches, name, switchBranch]);

  /* ───── share / app ───── */
  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://neeklo.app/workflow/${Date.now().toString(36)}`);
      toast.success("Ссылка скопирована");
    } catch {
      toast.success("Ссылка для шеринга готова");
    }
  };
  const onTurnIntoApp = () => {
    if (nodes.length < 2) {
      toast.error("Добавь хотя бы две ноды");
      return;
    }
    toast.success("Воркфлоу превращён в приложение", { description: "Доступно во вкладке «Приложения»" });
  };

  /* ───── derived ───── */
  const isEmpty = nodes.length === 0;
  const selectedNode = selectedIds.length === 1 ? nodes.find((n) => n.id === selectedIds[0]) ?? null : null;
  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-5 max-w-[1500px] mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button type="button" onClick={onBack} className="inline-flex items-center justify-center w-9 h-9 rounded-tile border border-border hover:bg-foreground/5" title="Назад">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 max-w-[220px] bg-transparent text-[16px] lg:text-[18px] font-semibold tracking-tight outline-none focus:bg-foreground/5 rounded px-1.5 py-0.5"
          />
          {/* branch selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBranches((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-tile border border-border text-xs hover:bg-foreground/5"
            >
              <GitBranch className="w-3.5 h-3.5" /> {activeBranch} <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {showBranches && (
              <div className="absolute z-40 mt-1 w-52 rounded-tile border border-border bg-background/95 backdrop-blur shadow-xl p-1" onPointerDown={(e) => e.stopPropagation()}>
                {branches.map((b) => (
                  <button key={b} type="button" onClick={() => switchBranch(b)} className={cn("w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] hover:bg-foreground/5", b === activeBranch && "text-accent")}>
                    <GitBranch className="w-3.5 h-3.5" /> {b}
                  </button>
                ))}
                <button type="button" onClick={createBranch} className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-foreground/70 hover:bg-foreground/5 border-t border-border mt-1 pt-2">
                  <Plus className="w-3.5 h-3.5" /> Новая ветка…
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-0.5 mr-1">
            <IconBtn icon={Undo2} label="Отменить" disabled={!canUndo} onClick={undo} />
            <IconBtn icon={Redo2} label="Повторить" disabled={!canRedo} onClick={redo} />
          </div>
          {/* history */}
          <div className="relative">
            <IconBtn icon={History} label="История версий" onClick={() => setShowHistory((v) => !v)} />
            {showHistory && (
              <div className="absolute right-0 z-40 mt-1 w-64 rounded-tile border border-border bg-background/95 backdrop-blur shadow-xl p-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="px-1.5 py-1 text-xs uppercase tracking-wider text-foreground/55">История · {activeBranch}</div>
                {versions.length === 0 && <p className="px-1.5 py-3 text-[13px] text-foreground/55">Пока нет сохранённых версий. Нажми «Сохранить».</p>}
                <div className="max-h-64 overflow-auto">
                  {versions.map((v) => (
                    <button key={v.id} type="button" onClick={() => restoreVersion(v.id)} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] hover:bg-foreground/5">
                      <Clock className="w-3.5 h-3.5 opacity-60" /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <IconBtn icon={Save} label={savedAt ? "Сохранено" : "Сохранить"} onClick={saveVersion} />
          <IconBtn icon={showHelp ? X : Smile} label="Помощь" onClick={() => setShowHelp((v) => !v)} />

          <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-tile border border-border text-sm hover:bg-foreground/5">
            <Share2 className="w-4 h-4" /> <span className="hidden md:inline">Share</span>
          </button>
          <button type="button" onClick={onTurnIntoApp} className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-tile bg-foreground/10 border border-border text-sm hover:bg-foreground/15">
            <Rocket className="w-4 h-4" /> В приложение
          </button>
          <button type="button" onClick={runGraph} disabled={exec === "running"} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {exec === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Запустить
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* left vertical toolbar */}
        <div className="flex flex-col gap-1 rounded-tile border border-border bg-background/70 p-1 h-fit">
          <ToolBtn icon={MousePointer2} label="Выделить (V)" active={tool === "select"} onClick={() => setTool("select")} />
          <ToolBtn icon={Hand} label="Рука (H)" active={tool === "hand"} onClick={() => setTool("hand")} />
          <div className="my-0.5 h-px bg-border" />
          <ToolBtn icon={Plus} label="Добавить ноду (N)" onClick={() => setCatalog({ tab: "nodes" })} />
          <ToolBtn icon={StickyNote} label="Заметка" onClick={() => addNode("sticky")} />
          <ToolBtn icon={Frame} label="Фрейм" onClick={() => addNode("frame")} />
          <ToolBtn icon={Boxes} label="Ассеты" onClick={() => setCatalog({ tab: "assets" })} />
        </div>

        {/* canvas + inspector */}
        <div className="flex-1 min-w-0 flex gap-3">
          <Panel className="p-0 overflow-hidden flex-1 min-w-0 relative">
            <div
              ref={canvasRef}
              className={cn(
                "relative w-full h-[calc(100dvh-190px)] min-h-[460px] select-none overflow-hidden touch-none",
                tool === "hand" ? "cursor-grab" : "cursor-default",
                panGestureRef.current && "cursor-grabbing",
              )}
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 0)",
                backgroundSize: `${22 * scale}px ${22 * scale}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`,
              }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onDoubleClick={onCanvasDoubleClick}
            >
              {/* edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                <g style={{ transform }}>
                  {edges.map((e) => {
                    const a = nodes.find((n) => n.id === e.from);
                    const b = nodes.find((n) => n.id === e.to);
                    if (!a || !b) return null;
                    const adef = getDef(a.kind);
                    const bdef = getDef(b.kind);
                    const x1 = portX(a, "out");
                    const y1 = portY(a, adef, "out", e.fromPort);
                    const x2 = portX(b, "in");
                    const y2 = portY(b, bdef, "in", e.toPort);
                    const outPort = adef.outputs.find((p) => p.id === e.fromPort);
                    const color = outPort ? TYPE_META[outPort.type].color : "color-mix(in oklab, var(--foreground) 35%, transparent)";
                    const flowing = exec === "running" && (a.status === "done" || a.status === "running");
                    return (
                      <path
                        key={e.id}
                        d={bezier(x1, y1, x2, y2)}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.75}
                        strokeDasharray={flowing ? "5 6" : undefined}
                        className={flowing ? "wf-flow" : undefined}
                      />
                    );
                  })}
                  {connectFrom && mouseWorld && (() => {
                    const a = nodes.find((n) => n.id === connectFrom.nodeId);
                    if (!a) return null;
                    const adef = getDef(a.kind);
                    const x1 = portX(a, "out");
                    const y1 = portY(a, adef, "out", connectFrom.portId);
                    return <path d={bezier(x1, y1, mouseWorld.x, mouseWorld.y)} fill="none" stroke={TYPE_META[connectFrom.type].color} strokeWidth={2} strokeDasharray="4 4" />;
                  })()}
                  {/* marquee */}
                  {marquee && (
                    <rect
                      x={Math.min(marquee.x0, marquee.x1)}
                      y={Math.min(marquee.y0, marquee.y1)}
                      width={Math.abs(marquee.x1 - marquee.x0)}
                      height={Math.abs(marquee.y1 - marquee.y0)}
                      fill="color-mix(in oklab, var(--accent) 12%, transparent)"
                      stroke="var(--accent)"
                      strokeWidth={1 / scale}
                      strokeDasharray={`${4 / scale} ${4 / scale}`}
                    />
                  )}
                </g>
              </svg>

              {/* nodes (frames render first → behind) */}
              <div className="absolute inset-0" style={{ transform, transformOrigin: "0 0" }}>
                {[...nodes]
                  .sort((a, b) => (a.kind === "frame" ? 0 : 1) - (b.kind === "frame" ? 0 : 1))
                  .map((n) =>
                  n.kind === "frame" ? (
                    <FrameCard key={n.id} node={n} selected={selectedIds.includes(n.id)} onPointerDown={(e) => onNodePointerDown(e, n)} onTitle={(note) => patchNodeData(n.id, { note })} onDelete={() => deleteNodes([n.id])} onResizeDown={(e) => onFrameResizeDown(e, n)} />
                  ) : n.kind === "sticky" ? (
                    <StickyCard key={n.id} node={n} selected={selectedIds.includes(n.id)} onPointerDown={(e) => onNodePointerDown(e, n)} onChange={(note) => patchNodeData(n.id, { note })} onDelete={() => deleteNodes([n.id])} />
                  ) : (
                    <NodeCard
                      key={n.id}
                      node={n}
                      selected={selectedIds.includes(n.id)}
                      connecting={!!connectFrom}
                      hoverIn={hoverIn}
                      onPointerDown={(e) => onNodePointerDown(e, n)}
                      onPortOutDown={(e, port) => onPortOutDown(e, n, port)}
                      onPortInEnter={(port) => setHoverIn({ nodeId: n.id, portId: port.id, type: port.type })}
                      onPortInLeave={() => setHoverIn((h) => (h?.nodeId === n.id ? null : h))}
                      onRun={() => runNode(n.id)}
                      onDelete={() => deleteNodes([n.id])}
                      onDuplicate={() => duplicateNode(n.id)}
                    />
                  ),
                )}
              </div>

              {/* empty state */}
              {isEmpty && !catalog && (
                <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
                  <div>
                    <div className="mx-auto w-14 h-14 rounded-tile flex items-center justify-center" style={{ background: "var(--gradient-warm-soft)" }}>
                      <Workflow className="w-6 h-6 text-accent" strokeWidth={1.75} />
                    </div>
                    <h2 className="mt-4 text-[16px] font-semibold">Пусто. Добавь первую ноду</h2>
                    <p className="mt-1 text-[13px] text-foreground/55 max-w-sm mx-auto">
                      Двойной клик по канвасу или клавиша <Kbd>N</Kbd>
                    </p>
                  </div>
                </div>
              )}

              {/* exec badge */}
              {exec === "done" && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur border border-border px-3 py-1.5 text-xs">
                  <Check className="w-3.5 h-3.5 text-accent" /> Выполнено
                </div>
              )}

              {/* zoom controls */}
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-tile border border-border bg-background/90 backdrop-blur p-1 shadow-lg">
                <IconBtn icon={ZoomOut} label="Уменьшить" onClick={() => zoomAt(1 / 1.2)} />
                <button type="button" onClick={resetView} className="px-2 h-8 text-xs tabular-nums text-foreground/70 hover:text-foreground min-w-[48px]">
                  {Math.round(scale * 100)}%
                </button>
                <IconBtn icon={ZoomIn} label="Увеличить" onClick={() => zoomAt(1.2)} />
                <div className="w-px h-5 bg-border mx-0.5" />
                <IconBtn icon={Maximize} label="Вписать (F)" onClick={fitToView} />
              </div>

              {/* minimap */}
              {nodes.length > 0 && <Minimap nodes={nodes} scale={scale} pan={pan} canvasRef={canvasRef} onJump={(p) => setPan(p)} />}

              {/* catalog panel */}
              {catalog && (
                <CatalogPanel
                  tab={catalog.tab}
                  onTab={(t) => setCatalog((c) => (c ? { ...c, tab: t } : c))}
                  onClose={() => setCatalog(null)}
                  onPick={(kind) => {
                    addNode(kind, catalog.at);
                    setCatalog(null);
                  }}
                  onPickAsset={(item) => {
                    const at = catalog.at;
                    pushHistory();
                    const world = at ?? screenToWorld((canvasRef.current?.getBoundingClientRect().left ?? 0) + 300, (canvasRef.current?.getBoundingClientRect().top ?? 0) + 200);
                    const n: WFNode = { id: nid(), kind: item.kind === "video" ? "video" : "image", x: world.x, y: world.y, title: item.title, status: "done", data: { src: item.src || `mock://${item.id}` } };
                    setNodes((prev) => [...prev, n]);
                    setSelectedIds([n.id]);
                    setCatalog(null);
                  }}
                  onPickSnippet={(s) => {
                    pushHistory();
                    const g = s.build();
                    setNodes((prev) => [...prev, ...g.nodes]);
                    setEdges((prev) => [...prev, ...g.edges]);
                    setCatalog(null);
                    setTimeout(fitToView, 30);
                  }}
                />
              )}

              {/* help */}
              {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
            </div>
          </Panel>

          {/* right inspector */}
          <Inspector
            node={selectedNode}
            multi={selectedIds.length}
            edges={edges}
            onTitle={(t) => selectedNode && patchNode(selectedNode.id, { title: t })}
            onData={(patch) => selectedNode && patchNodeData(selectedNode.id, patch)}
            onRun={() => selectedNode && runNode(selectedNode.id)}
            onDelete={() => deleteNodes(selectedIds)}
            onPickFromMedia={() => {
              if (!selectedNode) return;
              const items = listMedia();
              if (!items.length) {
                toast.error("Медиатека пуста");
                return;
              }
              patchNodeData(selectedNode.id, { src: items[0].src || `mock://${items[0].id}` });
              toast.success("Ассет привязан");
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-foreground/50">
        Перетаскивай ноды · тяни от правого порта к левому, совпадающему по типу · колесо — зум · <Kbd>N</Kbd> ноды · <Kbd>Del</Kbd> удалить · <Kbd>F</Kbd> вписать
      </p>

      <style>{`.wf-flow{animation:wfdash 0.6s linear infinite}@keyframes wfdash{to{stroke-dashoffset:-11}}`}</style>
    </div>
  );
}

/* ───────────────────────── node card ───────────────────────── */

function statusIcon(status: NodeStatus): { icon: LucideIcon; className: string } | null {
  switch (status) {
    case "queued":
      return { icon: Clock, className: "text-foreground/50" };
    case "running":
      return { icon: Loader2, className: "text-accent animate-spin" };
    case "done":
      return { icon: Check, className: "text-emerald-500" };
    case "error":
      return { icon: AlertCircle, className: "text-red-500" };
    default:
      return null;
  }
}

function NodeCard({
  node,
  selected,
  connecting,
  hoverIn,
  onPointerDown,
  onPortOutDown,
  onPortInEnter,
  onPortInLeave,
  onRun,
  onDelete,
  onDuplicate,
}: {
  node: WFNode;
  selected: boolean;
  connecting: boolean;
  hoverIn: { nodeId: string; portId: string; type: PortType } | null;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPortOutDown: (e: ReactPointerEvent<HTMLDivElement>, port: Port) => void;
  onPortInEnter: (port: Port) => void;
  onPortInLeave: () => void;
  onRun: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const def = getDef(node.kind);
  const Icon = def.icon;
  const si = statusIcon(node.status);
  const [menu, setMenu] = useState(false);
  const bodyH = nodeBodyHeight(def);
  const preview = hasPreview(node);

  return (
    <div
      className={cn(
        "absolute rounded-tile bg-card border transition-shadow",
        selected ? "border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]" : "border-border",
        node.status === "error" && "border-red-500/60",
      )}
      style={{ left: node.x, top: node.y, width: NODE_W, cursor: "grab" }}
      onPointerDown={onPointerDown}
    >
      {/* header */}
      <div className="flex items-center gap-2 h-[42px] px-2.5 border-b border-border">
        <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ background: `color-mix(in oklab, ${def.accent} 18%, transparent)` }}>
          <Icon className="w-4 h-4" style={{ color: def.accent }} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium leading-tight truncate">{node.title ?? def.label}</p>
        </div>
        {si && <si.icon className={cn("w-3.5 h-3.5 shrink-0", si.className)} />}
        {def.runnable && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-foreground/60 hover:text-accent hover:bg-foreground/5"
            title="Запустить ноду"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-foreground/60 hover:bg-foreground/5"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-7 z-30 w-36 rounded-md border border-border bg-background/95 backdrop-blur shadow-lg p-1" onPointerDown={(e) => e.stopPropagation()}>
              <MenuItem icon={Play} label="Запустить" onClick={() => { setMenu(false); onRun(); }} />
              <MenuItem icon={Copy} label="Дублировать" onClick={() => { setMenu(false); onDuplicate(); }} />
              <MenuItem icon={Trash2} label="Удалить" danger onClick={() => { setMenu(false); onDelete(); }} />
            </div>
          )}
        </div>
      </div>

      {/* body with ports */}
      <div className="relative" style={{ height: bodyH }}>
        {def.inputs.map((p, i) => (
          <PortRow key={p.id} side="in" port={p} top={BODY_PAD + i * ROW} node={node} connecting={connecting} hoverIn={hoverIn} onEnter={() => onPortInEnter(p)} onLeave={onPortInLeave} />
        ))}
        {def.outputs.map((p, i) => (
          <PortRow key={p.id} side="out" port={p} top={BODY_PAD + i * ROW} node={node} connecting={connecting} hoverIn={hoverIn} onDown={(e) => onPortOutDown(e, p)} />
        ))}
        {def.inputs.length === 0 && def.outputs.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-foreground/50">{def.desc}</p>
        )}
      </div>

      {/* preview */}
      {preview && (
        <div className="border-t border-border p-2">
          <div className={cn("w-full h-[74px] rounded-md bg-gradient-to-br flex items-center justify-center", pickGradient(node.id.length))} style={{ backgroundImage: node.data.src && node.data.src.startsWith("http") ? `url(${node.data.src})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
            {!(node.data.src && node.data.src.startsWith("http")) && <Sparkles className="w-5 h-5 text-white/80" />}
          </div>
        </div>
      )}

      {node.error && <p className="px-2.5 pb-2 text-[11px] text-red-500 truncate">{node.error}</p>}
    </div>
  );
}

function PortRow({
  side,
  port,
  top,
  node,
  connecting,
  hoverIn,
  onEnter,
  onLeave,
  onDown,
}: {
  side: "in" | "out";
  port: Port;
  top: number;
  node: WFNode;
  connecting: boolean;
  hoverIn: { nodeId: string; portId: string; type: PortType } | null;
  onEnter?: () => void;
  onLeave?: () => void;
  onDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const color = TYPE_META[port.type].color;
  const hovered = hoverIn?.nodeId === node.id && hoverIn.portId === port.id;
  return (
    <div className="absolute flex items-center gap-1.5" style={{ top, height: ROW, [side === "in" ? "left" : "right"]: 0, flexDirection: side === "in" ? "row" : "row-reverse" }}>
      <div
        className={cn("w-3.5 h-3.5 rounded-full bg-background border-2 -mx-[7px]", connecting && side === "in" && "scale-125", hovered && "ring-2 ring-accent")}
        style={{ borderColor: color, cursor: "crosshair" }}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onPointerDown={onDown ? (e) => { e.stopPropagation(); onDown(e); } : undefined}
      />
      <span className="text-[10.5px] text-foreground/55 leading-none px-0.5">{port.label}</span>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-[13px] hover:bg-foreground/5", danger ? "text-red-500" : "text-foreground/80")}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

/* ───────────────────────── sticky card ───────────────────────── */

function StickyCard({
  node,
  selected,
  onPointerDown,
  onChange,
  onDelete,
}: {
  node: WFNode;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onChange: (note: string) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn("absolute rounded-tile p-2 shadow-md", selected ? "ring-2 ring-accent" : "")}
      style={{ left: node.x, top: node.y, width: NODE_W, height: 120, background: "color-mix(in oklab, #F4B03A 22%, var(--card))", cursor: "grab" }}
      onPointerDown={onPointerDown}
    >
      <div className="flex items-center justify-between mb-1">
        <StickyNote className="w-3.5 h-3.5 text-foreground/60" />
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-foreground/50 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        value={node.data.note ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full h-[82px] bg-transparent resize-none outline-none text-[12.5px] text-foreground/90 placeholder:text-foreground/40"
        placeholder="Заметка…"
      />
    </div>
  );
}

/* ───────────────────────── frame card ───────────────────────── */

function FrameCard({
  node,
  selected,
  onPointerDown,
  onTitle,
  onDelete,
  onResizeDown,
}: {
  node: WFNode;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onTitle: (note: string) => void;
  onDelete: () => void;
  onResizeDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const w = node.data.w ?? 340;
  const h = node.data.h ?? 240;
  return (
    <div
      className={cn("absolute rounded-tile border-2 border-dashed", selected ? "border-accent" : "border-border")}
      style={{ left: node.x, top: node.y, width: w, height: h, background: "color-mix(in oklab, var(--foreground) 3%, transparent)", cursor: "grab" }}
      onPointerDown={onPointerDown}
    >
      <div className="flex items-center gap-1.5 px-2 h-7">
        <Frame className="w-3.5 h-3.5 shrink-0 text-foreground/50" />
        <input
          value={node.data.note ?? ""}
          onChange={(e) => onTitle(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="Фрейм"
          className="flex-1 min-w-0 bg-transparent text-[12px] font-medium outline-none focus:bg-foreground/5 rounded px-1"
        />
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="shrink-0 text-foreground/40 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div onPointerDown={onResizeDown} className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize" title="Изменить размер">
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r-2 border-b-2 border-foreground/40" />
      </div>
    </div>
  );
}

/* ───────────────────────── catalog panel (§6.3) ───────────────────────── */

function CatalogPanel({
  tab,
  onTab,
  onClose,
  onPick,
  onPickAsset,
  onPickSnippet,
}: {
  tab: "nodes" | "assets" | "snippets";
  onTab: (t: "nodes" | "assets" | "snippets") => void;
  onClose: () => void;
  onPick: (kind: string) => void;
  onPickAsset: (item: MediaItem) => void;
  onPickSnippet: (s: Snippet) => void;
}) {
  const [q, setQ] = useState("");
  const assets = useMemo(() => (typeof window === "undefined" ? [] : listMedia()), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CATALOG;
    return CATALOG.filter((d) => d.label.toLowerCase().includes(s) || d.desc.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="absolute top-3 left-3 z-30 w-[300px] max-h-[calc(100%-24px)] rounded-tile border border-border bg-background/97 backdrop-blur shadow-2xl flex flex-col" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 p-1.5 border-b border-border">
        {(["nodes", "assets", "snippets"] as const).map((t) => (
          <button key={t} type="button" onClick={() => onTab(t)} className={cn("flex-1 h-8 rounded-md text-[12.5px] font-medium", tab === t ? "bg-foreground/10" : "text-foreground/60 hover:bg-foreground/5")}>
            {t === "nodes" ? "Ноды" : t === "assets" ? "Ассеты" : "Сниппеты"}
          </button>
        ))}
        <button type="button" onClick={onClose} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-foreground/55 hover:bg-foreground/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {tab === "nodes" && (
        <>
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 h-8 px-2 rounded-md bg-foreground/5">
              <Search className="w-3.5 h-3.5 text-foreground/50" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск ноды…" className="flex-1 bg-transparent outline-none text-[13px]" />
            </div>
          </div>
          <div className="overflow-auto p-1.5">
            {CATEGORY_ORDER.map((cat) => {
              const items = filtered.filter((d) => d.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-1.5">
                  <div className="px-1.5 py-1 text-[10.5px] uppercase tracking-wider text-foreground/45">{CATEGORY_LABEL[cat]}</div>
                  {items.map((d) => (
                    <button key={d.kind} type="button" onClick={() => onPick(d.kind)} className="w-full text-left flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-foreground/5">
                      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md" style={{ background: `color-mix(in oklab, ${d.accent} 18%, transparent)` }}>
                        <d.icon className="w-3.5 h-3.5" style={{ color: d.accent }} strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-medium">{d.label}</span>
                        <span className="block text-[11px] text-foreground/55 truncate">{d.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "assets" && (
        <div className="overflow-auto p-2">
          {assets.length === 0 && <p className="p-3 text-[13px] text-foreground/55">Медиатека пуста.</p>}
          <div className="grid grid-cols-2 gap-2">
            {assets.map((a) => (
              <button key={a.id} type="button" onClick={() => onPickAsset(a)} className={cn("rounded-md overflow-hidden border border-border hover:border-accent/60 aspect-square bg-gradient-to-br", a.gradient)} title={a.title}>
                <span className="sr-only">{a.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "snippets" && (
        <div className="overflow-auto p-2 space-y-2">
          {SNIPPETS.map((s) => (
            <button key={s.id} type="button" onClick={() => onPickSnippet(s)} className="w-full text-left rounded-md border border-border p-2.5 hover:border-accent/60">
              <div className="text-[13px] font-medium">{s.title}</div>
              <div className="text-[11px] text-foreground/55 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── inspector (§6.4) ───────────────────────── */

function Inspector({
  node,
  multi,
  edges,
  onTitle,
  onData,
  onRun,
  onDelete,
  onPickFromMedia,
}: {
  node: WFNode | null;
  multi: number;
  edges: WFEdge[];
  onTitle: (t: string) => void;
  onData: (patch: Partial<NodeData>) => void;
  onRun: () => void;
  onDelete: () => void;
  onPickFromMedia: () => void;
}) {
  if (multi > 1) {
    return (
      <aside className="hidden lg:flex w-72 shrink-0 flex-col rounded-tile border border-border bg-background/70 p-4">
        <p className="text-[13px] text-foreground/70">Выбрано нод: {multi}</p>
        <button type="button" onClick={onDelete} className="mt-3 inline-flex items-center justify-center gap-1.5 h-9 rounded-tile border border-border text-sm text-red-500 hover:bg-red-500/5">
          <Trash2 className="w-4 h-4" /> Удалить выбранные
        </button>
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="hidden lg:flex w-72 shrink-0 flex-col items-center justify-center rounded-tile border border-border bg-background/70 p-6 text-center">
        <MousePointer2 className="w-6 h-6 text-foreground/40 mb-2" />
        <p className="text-[13px] text-foreground/55">Выбери ноду, чтобы настроить параметры и запустить.</p>
      </aside>
    );
  }

  const def = getDef(node.kind);
  const Icon = def.icon;
  const cost = nodeCost(node);
  const modelList = def.modelKind === "image" ? imageModels() : def.modelKind === "video" ? videoModels() : [];
  const isText = def.outputs.some((o) => o.type === "text") && def.inputs.length === 0;
  const inCount = edges.filter((e) => e.to === node.id).length;

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col rounded-tile border border-border bg-background/70 overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md" style={{ background: `color-mix(in oklab, ${def.accent} 18%, transparent)` }}>
          <Icon className="w-4 h-4" style={{ color: def.accent }} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold truncate">{def.label}</p>
          <p className="text-[11px] text-foreground/55">{def.category === "io" ? "Ввод / Вывод" : CATEGORY_LABEL[def.category]}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        <Field label="Название">
          <input value={node.title ?? ""} onChange={(e) => onTitle(e.target.value)} placeholder={def.label} className="w-full h-9 px-2.5 rounded-tile border border-border bg-transparent text-[13px] outline-none focus:border-accent/60" />
        </Field>

        {(node.kind === "text" || isText || node.kind === "llm") && (
          <Field label={node.kind === "llm" ? "Промпт" : "Текст"}>
            <textarea value={node.data.text ?? ""} onChange={(e) => onData({ text: e.target.value })} rows={4} placeholder="Введите текст…" className="w-full px-2.5 py-2 rounded-tile border border-border bg-transparent text-[13px] outline-none focus:border-accent/60 resize-none" />
          </Field>
        )}
        {node.kind === "llm" && (
          <Field label="System prompt">
            <textarea value={node.data.system ?? ""} onChange={(e) => onData({ system: e.target.value })} rows={2} placeholder="Роль и стиль…" className="w-full px-2.5 py-2 rounded-tile border border-border bg-transparent text-[13px] outline-none focus:border-accent/60 resize-none" />
          </Field>
        )}

        {def.modelKind && (
          <Field label="Модель">
            <select value={node.data.modelId ?? modelList[0]?.id} onChange={(e) => onData({ modelId: e.target.value })} className="w-full h-9 px-2 rounded-tile border border-border bg-background text-[13px] outline-none focus:border-accent/60">
              {modelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.costCredits} кр
                </option>
              ))}
            </select>
          </Field>
        )}

        {(node.kind === "gen-image" || node.kind === "gen-video") && (
          <Field label="Формат">
            <select value={node.data.format ?? (node.kind === "gen-video" ? "9:16" : "1:1")} onChange={(e) => onData({ format: e.target.value })} className="w-full h-9 px-2 rounded-tile border border-border bg-background text-[13px] outline-none focus:border-accent/60">
              {(node.kind === "gen-video" ? ["9:16", "16:9", "1:1"] : ["1:1", "3:4", "4:3", "9:16", "16:9"]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        )}

        {(node.kind === "image" || node.kind === "video" || node.kind === "import") && (
          <button type="button" onClick={onPickFromMedia} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-tile border border-border text-[13px] hover:bg-foreground/5">
            <ImagePlus className="w-4 h-4" /> Выбрать из медиатеки
          </button>
        )}

        <div className="rounded-tile border border-border p-2.5 text-[11.5px] text-foreground/60 space-y-1">
          <div className="flex items-center justify-between">
            <span>Входов подключено</span>
            <span className="text-foreground/80">{inCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Статус</span>
            <span className="text-foreground/80">{STATUS_LABEL[node.status]}</span>
          </div>
          {def.inputs.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <span className="opacity-70">Вход:</span>
              {def.inputs.map((p) => (
                <PortChip key={p.id} port={p} />
              ))}
            </div>
          )}
          {def.outputs.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="opacity-70">Выход:</span>
              {def.outputs.map((p) => (
                <PortChip key={p.id} port={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border space-y-2">
        {def.runnable && (
          <div className="flex items-center justify-between text-[12px] text-foreground/70">
            <span>Стоимость запуска</span>
            <span className="font-medium text-foreground">{cost > 0 ? `${cost} кр` : "бесплатно"}</span>
          </div>
        )}
        {def.runnable && (
          <button type="button" onClick={onRun} disabled={node.status === "running"} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {node.status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Запустить ноду
          </button>
        )}
        <button type="button" onClick={onDelete} className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-tile border border-border text-sm text-red-500 hover:bg-red-500/5">
          <Trash2 className="w-4 h-4" /> Удалить
        </button>
      </div>
    </aside>
  );
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "не запускалась",
  queued: "в очереди",
  running: "выполняется",
  done: "готово",
  error: "ошибка",
};

function PortChip({ port }: { port: Port }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px]" style={{ background: `color-mix(in oklab, ${TYPE_META[port.type].color} 16%, transparent)`, color: TYPE_META[port.type].color }}>
      <CircleDot className="w-2.5 h-2.5" /> {TYPE_META[port.type].label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium text-foreground/60 mb-1">{label}</span>
      {children}
    </label>
  );
}

/* ───────────────────────── minimap ───────────────────────── */

function Minimap({
  nodes,
  scale,
  pan,
  canvasRef,
  onJump,
}: {
  nodes: WFNode[];
  scale: number;
  pan: { x: number; y: number };
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onJump: (pan: { x: number; y: number }) => void;
}) {
  const MW = 168;
  const MH = 112;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + nodeWidth(n));
    maxY = Math.max(maxY, n.y + nodeHeight(n));
  }
  const pad = 60;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const s = Math.min(MW / w, MH / h);

  const rect = canvasRef.current?.getBoundingClientRect();
  const viewW = (rect?.width ?? 800) / scale;
  const viewH = (rect?.height ?? 500) / scale;
  const viewX = -pan.x / scale;
  const viewY = -pan.y / scale;

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - b.left) / s + minX;
    const wy = (e.clientY - b.top) / s + minY;
    onJump({ x: (rect?.width ?? 800) / 2 - wx * scale, y: (rect?.height ?? 500) / 2 - wy * scale });
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 rounded-tile border border-border bg-background/90 backdrop-blur shadow-lg overflow-hidden" style={{ width: MW, height: MH }}>
      <svg width={MW} height={MH} onClick={onClick} className="cursor-pointer">
        <g transform={`translate(${-minX * s}, ${-minY * s}) scale(${s})`}>
          {nodes.map((n) => (
            <rect key={n.id} x={n.x} y={n.y} width={nodeWidth(n)} height={nodeHeight(n)} rx={8} fill={n.kind === "frame" ? "color-mix(in oklab, var(--foreground) 8%, transparent)" : "color-mix(in oklab, var(--foreground) 22%, transparent)"} />
          ))}
          <rect x={viewX} y={viewY} width={viewW} height={viewH} fill="color-mix(in oklab, var(--accent) 10%, transparent)" stroke="var(--accent)" strokeWidth={2 / s} />
        </g>
      </svg>
    </div>
  );
}

/* ───────────────────────── small ui ───────────────────────── */

function ToolBtn({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn("inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors", active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground")}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

function IconBtn({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-foreground/70 hover:bg-foreground/10 hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent">
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded border border-border bg-foreground/5 text-[11px]">{children}</kbd>;
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-3 right-3 z-30 w-64 rounded-tile border border-border bg-background/97 backdrop-blur shadow-2xl p-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold">Горячие клавиши</span>
        <button type="button" onClick={onClose} className="text-foreground/55 hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-1.5 text-[12.5px] text-foreground/70">
        <li className="flex justify-between"><span>Добавить ноду</span> <Kbd>N</Kbd></li>
        <li className="flex justify-between"><span>Удалить</span> <Kbd>Del</Kbd></li>
        <li className="flex justify-between"><span>Отменить / Повторить</span> <span className="flex gap-1"><Kbd>⌘Z</Kbd><Kbd>⌘Y</Kbd></span></li>
        <li className="flex justify-between"><span>Зум</span> <span className="flex gap-1"><Kbd>+</Kbd><Kbd>−</Kbd></span></li>
        <li className="flex justify-between"><span>Вписать / 100%</span> <span className="flex gap-1"><Kbd>F</Kbd><Kbd>0</Kbd></span></li>
        <li className="flex justify-between"><span>Выделить / Рука</span> <span className="flex gap-1"><Kbd>V</Kbd><Kbd>H</Kbd></span></li>
        <li className="flex justify-between"><span>Пан</span> <span className="flex gap-1"><Kbd>Space</Kbd><Kbd>СКМ</Kbd></span></li>
      </ul>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function topoOrder(nodes: WFNode[], edges: WFEdge[]): string[] {
  const indeg = new Map<string, number>();
  nodes.forEach((n) => indeg.set(n.id, 0));
  edges.forEach((e) => indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1));
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const out: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    edges
      .filter((e) => e.from === id)
      .forEach((e) => {
        const d = (indeg.get(e.to) ?? 0) - 1;
        indeg.set(e.to, d);
        if (d === 0) queue.push(e.to);
      });
  }
  if (out.length < nodes.length) return nodes.map((n) => n.id);
  return out;
}

function mockText(def: NodeDef, prompt: string): string {
  const base = prompt ? prompt.slice(0, 60) : def.label;
  if (def.kind === "split-text") return base.split(/[.,\n]/).filter(Boolean).join("\n");
  if (def.kind === "random") return Math.random().toString(36).slice(2, 10);
  return `[${def.label}] ${base}`;
}

function friendlyError(err?: string): string {
  if (!err) return "Ошибка генерации";
  if (err === "timeout") return "Превышено время ожидания";
  if (/insufficient|credit/i.test(err)) return "Недостаточно кредитов";
  if (/rate|limit/i.test(err)) return "Лимит запросов, попробуйте позже";
  return err.length > 60 ? "Ошибка генерации" : err;
}
