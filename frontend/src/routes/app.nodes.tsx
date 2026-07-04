// /app/nodes, Визуальный пайплайн из инструментов.
// Лендинг с вкладками (Проекты, Приложения, Примеры, Шаблоны) и пустыми
// состояниями. Сам редактор: канвас с нодами и связями, тулбар, мок-выполнение
// с подсветкой потока, кнопки Share и «Превратить в приложение».
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
  ImageIcon,
  Type as TypeIcon,
  Wand2,
  Sparkles,
  Download,
  Share2,
  Rocket,
  MousePointer2,
  Hand,
  Crop,
  PlusSquare,
  Play,
  ArrowLeft,
  Trash2,
  Copy,
  Loader2,
  Check,
  FolderOpen,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { tryGenerate } from "@/lib/mock-credits";
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

/* ────────── типы ────────── */

type NodeKind = "input-image" | "prompt" | "style-transfer" | "enhancer" | "output";
type Tool = "select" | "hand" | "add" | "crop";
type ExecState = "idle" | "running" | "done";

type WFNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  title?: string;
};

type WFEdge = { id: string; from: string; to: string };

const NODE_META: Record<NodeKind, { label: string; desc: string; icon: LucideIcon; accent: string }> = {
  "input-image": {
    label: "Вход · Изображение",
    desc: "Источник: загрузка или ассет",
    icon: ImageIcon,
    accent: "var(--accent)",
  },
  prompt: {
    label: "Промпт",
    desc: "Текстовое описание сцены",
    icon: TypeIcon,
    accent: "#7CC4A3",
  },
  "style-transfer": {
    label: "Перенос стиля",
    desc: "Стилистическая трансформация",
    icon: Wand2,
    accent: "#A78BFA",
  },
  enhancer: {
    label: "Энхансер",
    desc: "Апскейл до 4K, шумодав",
    icon: Sparkles,
    accent: "#F4B03A",
  },
  output: {
    label: "Выход",
    desc: "Сохранить в медиабанк",
    icon: Download,
    accent: "#5A8DEE",
  },
};

const NODE_ORDER: NodeKind[] = ["input-image", "prompt", "style-transfer", "enhancer", "output"];

const NODE_W = 192;
const NODE_H = 76;

/* ────────── мок-воркфлоу ────────── */

const MOCK_WORKFLOW: { nodes: WFNode[]; edges: WFEdge[] } = {
  nodes: [
    { id: "n1", kind: "input-image", x: 80, y: 120, title: "Портрет" },
    { id: "n2", kind: "prompt", x: 80, y: 240, title: "Киношный свет" },
    { id: "n3", kind: "style-transfer", x: 360, y: 180 },
    { id: "n4", kind: "enhancer", x: 620, y: 180 },
    { id: "n5", kind: "output", x: 880, y: 180 },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n3" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n4", to: "n5" },
  ],
};

const TABS: ToolTab[] = [
  { id: "projects", label: "Проекты" },
  { id: "apps", label: "Приложения" },
  { id: "examples", label: "Примеры" },
  { id: "templates", label: "Шаблоны" },
];

const TEMPLATES = [
  { id: "t1", title: "Портрет → стиль → 4K", desc: "Вход → стиль → энхансер → выход" },
  { id: "t2", title: "Фото товара для маркетплейса", desc: "Удаление фона → свет → апскейл" },
  { id: "t3", title: "Скетч в рендер", desc: "Скетч → промпт → рендер → выход" },
];

const EXAMPLES = [
  { id: "x1", title: "Демо: Портрет", desc: "Готовый воркфлоу с предзаполненными нодами", workflow: MOCK_WORKFLOW },
];

/* ───────────────────────── page ───────────────────────── */

function NodesPage() {
  const [mode, setMode] = useState<"landing" | "editor">("landing");
  const [tab, setTab] = useState<string>("projects");
  const [initial, setInitial] = useState<typeof MOCK_WORKFLOW | undefined>();

  if (mode === "editor") {
    return <Editor initial={initial} onBack={() => setMode("landing")} />;
  }

  const openNew = () => {
    setInitial(undefined);
    setMode("editor");
  };

  const openExample = () => {
    setInitial(MOCK_WORKFLOW);
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
          title="No workflows yet"
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
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={openExample}
              className="text-left rounded-tile border border-border bg-foreground/[0.03] hover:border-accent/60 transition-colors p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <Workflow className="w-4 h-4 text-accent" />
                </span>
                <span className="text-xs uppercase tracking-wider text-foreground/55">Пример</span>
              </div>
              <h3 className="text-[15px] font-semibold mb-1">{ex.title}</h3>
              <p className="text-[13px] text-foreground/65">{ex.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-accent">
                Открыть в редакторе →
              </div>
            </button>
          ))}
        </CardGrid>
      )}

      {tab === "templates" && (
        <CardGrid>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={openExample}
              className="text-left rounded-tile border border-border bg-foreground/[0.03] hover:border-accent/60 transition-colors p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <LayoutGrid className="w-4 h-4 text-accent" />
                </span>
                <span className="text-xs uppercase tracking-wider text-foreground/55">Шаблон</span>
              </div>
              <h3 className="text-[15px] font-semibold mb-1">{t.title}</h3>
              <p className="text-[13px] text-foreground/65">{t.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-accent">
                Использовать →
              </div>
            </button>
          ))}
        </CardGrid>
      )}
    </div>
  );
}

/* ───────────────────────── empty / grid ───────────────────────── */

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
      <span
        className="inline-flex items-center justify-center w-14 h-14 rounded-tile mb-4"
        style={{ background: "var(--gradient-warm-soft)" }}
      >
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

function Editor({
  initial,
  onBack,
}: {
  initial?: typeof MOCK_WORKFLOW;
  onBack: () => void;
}) {
  const [nodes, setNodes] = useState<WFNode[]>(initial?.nodes ?? []);
  const [edges, setEdges] = useState<WFEdge[]>(initial?.edges ?? []);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [hoverPort, setHoverPort] = useState<{ id: string; side: "in" | "out" } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<{ x: number; y: number } | null>(null);
  const [exec, setExec] = useState<ExecState>("idle");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; basePan: { x: number; y: number } } | null>(
    null,
  );

  /* keyboard: N = add node, Delete = remove, Esc = cancel */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        setShowAddMenu({
          x: rect ? rect.width / 2 - 100 : 200,
          y: rect ? rect.height / 2 - 80 : 160,
        });
      } else if (e.key === "Escape") {
        setConnectFrom(null);
        setShowAddMenu(null);
        setSelectedId(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        deleteNode(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  /* ───── nodes/edges manip ───── */
  const addNode = (kind: NodeKind, at?: { x: number; y: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = at?.x ?? (rect ? rect.width / 2 : 200);
    const cy = at?.y ?? (rect ? rect.height / 2 : 160);
    const n: WFNode = {
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      x: cx - NODE_W / 2 - pan.x,
      y: cy - NODE_H / 2 - pan.y,
    };
    setNodes((prev) => [...prev, n]);
    setSelectedId(n.id);
    setShowAddMenu(null);
    toast.success(`Нода добавлена · ${NODE_META[kind].label}`);
  };

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateNode = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    const copy: WFNode = { ...n, id: `n_${Date.now().toString(36)}`, x: n.x + 24, y: n.y + 24 };
    setNodes((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const connect = (from: string, to: string) => {
    if (from === to) return;
    if (edges.some((e) => e.from === from && e.to === to)) return;
    setEdges((prev) => [...prev, { id: `e_${Date.now().toString(36)}`, from, to }]);
    toast.success("Соединение создано");
  };

  /* ───── pointer interactions ───── */
  const onNodePointerDown = (e: ReactPointerEvent<HTMLDivElement>, n: WFNode) => {
    if (tool === "hand") return;
    e.stopPropagation();
    setSelectedId(n.id);
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: n.id,
      offsetX: e.clientX - rect.left - n.x - pan.x,
      offsetY: e.clientY - rect.top - n.y - pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setSelectedId(null);
    setShowAddMenu(null);
    if (tool === "hand") {
      panRef.current = { startX: e.clientX, startY: e.clientY, basePan: { ...pan } };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (dragRef.current) {
      const d = dragRef.current;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === d.id
            ? {
                ...n,
                x: e.clientX - rect.left - d.offsetX - pan.x,
                y: e.clientY - rect.top - d.offsetY - pan.y,
              }
            : n,
        ),
      );
    } else if (panRef.current) {
      const p = panRef.current;
      setPan({
        x: p.basePan.x + (e.clientX - p.startX),
        y: p.basePan.y + (e.clientY - p.startY),
      });
    }
  };

  const onCanvasPointerUp = () => {
    dragRef.current = null;
    panRef.current = null;
    if (connectFrom && hoverPort && hoverPort.side === "in") {
      connect(connectFrom, hoverPort.id);
    }
    setConnectFrom(null);
  };

  const onCanvasDoubleClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setShowAddMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  /* ───── ports ───── */
  const onPortPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string, side: "out") => {
    e.stopPropagation();
    if (side === "out") {
      setConnectFrom(id);
    }
  };

  /* ───── execution ───── */
  const runWorkflow = async () => {
    if (nodes.length === 0) {
      toast.error("Добавь хотя бы одну ноду");
      return;
    }
    if (!tryGenerate(Math.max(1, nodes.length))) return;
    setExec("running");
    const order = topoOrder(nodes, edges);
    for (const id of order) {
      setActiveNodeId(id);
      const incoming = edges.filter((e) => e.to === id);
      for (const e of incoming) {
        setActiveEdgeId(e.id);
        await delay(180);
      }
      await delay(420);
    }
    setActiveEdgeId(null);
    setActiveNodeId(null);
    setExec("done");
    toast.success("Воркфлоу выполнен", { description: "Результат сохранён в медиабанк" });
    window.setTimeout(() => setExec("idle"), 1600);
  };

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
    toast.success("Воркфлоу превращён в приложение", {
      description: "Доступно во вкладке «Приложения»",
    });
  };

  /* ───── derived ───── */
  const isEmpty = nodes.length === 0;

  return (
    <div className="min-h-dvh w-full px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1500px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center w-9 h-9 rounded-tile border border-border hover:bg-foreground/5"
            title="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] lg:text-[22px] font-semibold tracking-tight truncate">
              Новый воркфлоу
            </h1>
            <p className="text-xs text-foreground/55">
              {nodes.length} нод · {edges.length} связей{" "}
              {exec === "running" && <span className="text-accent">· выполняется…</span>}
              {exec === "done" && <span className="text-accent">· готово</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-tile border border-border text-sm hover:bg-foreground/5"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button
            type="button"
            onClick={onTurnIntoApp}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-tile bg-foreground/10 border border-border text-sm hover:bg-foreground/15"
          >
            <Rocket className="w-4 h-4" /> Превратить в приложение
          </button>
          <button
            type="button"
            onClick={runWorkflow}
            disabled={exec === "running"}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-tile bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {exec === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Запустить
          </button>
        </div>
      </div>

      <Panel className="p-0 overflow-hidden">
        <div
          ref={canvasRef}
          className={cn(
            "relative w-full h-[calc(100dvh-220px)] min-h-[480px] select-none overflow-hidden",
            tool === "hand" ? "cursor-grab" : tool === "crop" ? "cursor-crosshair" : "cursor-default",
            panRef.current && "cursor-grabbing",
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onDoubleClick={onCanvasDoubleClick}
        >
          {/* edges */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            {edges.map((e) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const active = activeEdgeId === e.id || exec === "running";
              return (
                <path
                  key={e.id}
                  d={bezier(x1, y1, x2, y2)}
                  fill="none"
                  stroke={
                    activeEdgeId === e.id
                      ? "var(--accent)"
                      : "color-mix(in oklab, var(--foreground) 35%, transparent)"
                  }
                  strokeWidth={activeEdgeId === e.id ? 2.5 : 1.5}
                  strokeDasharray={active && activeEdgeId !== e.id ? "4 6" : undefined}
                  className={cn(activeEdgeId === e.id && "transition-all")}
                />
              );
            })}
            {connectFrom && mousePos && (() => {
              const a = nodes.find((n) => n.id === connectFrom);
              if (!a) return null;
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              return (
                <path
                  d={bezier(x1, y1, mousePos.x - pan.x, mousePos.y - pan.y)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              );
            })()}
          </svg>

          {/* nodes */}
          <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
            {nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                selected={selectedId === n.id}
                active={activeNodeId === n.id}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPortOutDown={(e) => onPortPointerDown(e, n.id, "out")}
                onPortInEnter={() => setHoverPort({ id: n.id, side: "in" })}
                onPortInLeave={() => setHoverPort((h) => (h?.id === n.id ? null : h))}
                onDelete={() => deleteNode(n.id)}
                onDuplicate={() => duplicateNode(n.id)}
              />
            ))}
          </div>

          {/* empty state */}
          {isEmpty && !showAddMenu && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
              <div>
                <div
                  className="mx-auto w-14 h-14 rounded-tile flex items-center justify-center"
                  style={{ background: "var(--gradient-warm-soft)" }}
                >
                  <Workflow className="w-6 h-6 text-accent" strokeWidth={1.75} />
                </div>
                <h2 className="mt-4 text-[16px] font-semibold">Пусто. Добавь первую ноду</h2>
                <p className="mt-1 text-[13px] text-foreground/55 max-w-sm mx-auto">
                  Двойной клик по канвасу или клавиша <kbd className="px-1.5 py-0.5 rounded border border-border bg-foreground/5 text-[11px]">N</kbd>
                </p>
              </div>
            </div>
          )}

          {/* add menu */}
          {showAddMenu && (
            <AddNodeMenu
              x={showAddMenu.x}
              y={showAddMenu.y}
              onPick={(kind) => addNode(kind, { x: showAddMenu.x, y: showAddMenu.y })}
              onClose={() => setShowAddMenu(null)}
            />
          )}

          {/* exec done overlay */}
          {exec === "done" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur border border-border px-3 py-1.5 text-xs">
              <Check className="w-3.5 h-3.5 text-accent" /> Выполнено
            </div>
          )}

          {/* bottom toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-1 rounded-tile border border-border bg-background/90 backdrop-blur p-1 shadow-lg">
              <ToolBtn
                icon={PlusSquare}
                label="Добавить"
                active={tool === "add"}
                onClick={() => {
                  setTool("add");
                  const rect = canvasRef.current?.getBoundingClientRect();
                  setShowAddMenu({
                    x: rect ? rect.width / 2 - 100 : 200,
                    y: rect ? rect.height / 2 - 80 : 160,
                  });
                }}
              />
              <ToolBtn
                icon={MousePointer2}
                label="Выделить"
                active={tool === "select"}
                onClick={() => setTool("select")}
              />
              <ToolBtn icon={Hand} label="Рука" active={tool === "hand"} onClick={() => setTool("hand")} />
              <ToolBtn icon={Crop} label="Обрезать" active={tool === "crop"} onClick={() => setTool("crop")} />
            </div>
          </div>
        </div>
      </Panel>

      <p className="mt-3 text-xs text-foreground/50">
        Перетаскивай ноды · потяни от правого порта к левому, чтобы соединить · клавиша{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-border bg-foreground/5 text-[11px]">N</kbd>{" "}
        или двойной клик, добавить ноду · <kbd className="px-1.5 py-0.5 rounded border border-border bg-foreground/5 text-[11px]">Del</kbd>, удалить
      </p>
    </div>
  );
}

/* ───────────────────────── node card ───────────────────────── */

function NodeCard({
  node,
  selected,
  active,
  onPointerDown,
  onPortOutDown,
  onPortInEnter,
  onPortInLeave,
  onDelete,
  onDuplicate,
}: {
  node: WFNode;
  selected: boolean;
  active: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPortOutDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPortInEnter: () => void;
  onPortInLeave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const meta = NODE_META[node.kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "absolute rounded-tile bg-card border transition-shadow group",
        selected ? "border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]" : "border-border",
        active && "ring-2 ring-accent ring-offset-2 ring-offset-background",
      )}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H, cursor: "grab" }}
      onPointerDown={onPointerDown}
    >
      {/* port in */}
      <div
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-foreground/40 hover:border-accent hover:bg-accent/20 cursor-crosshair"
        onPointerEnter={onPortInEnter}
        onPointerLeave={onPortInLeave}
      />
      {/* port out */}
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border-2 border-foreground/40 hover:border-accent hover:bg-accent/20 cursor-crosshair"
        onPointerDown={onPortOutDown}
      />

      <div className="h-full p-3 flex items-center gap-2.5">
        <span
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md"
          style={{ background: `color-mix(in oklab, ${meta.accent} 18%, transparent)` }}
        >
          <Icon className="w-4 h-4" style={{ color: meta.accent }} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight truncate">{node.title ?? meta.label}</p>
          <p className="text-[11px] text-foreground/55 truncate">{meta.desc}</p>
        </div>
      </div>

      {selected && (
        <div className="absolute -top-9 left-0 flex items-center gap-1 rounded-md border border-border bg-background/95 backdrop-blur p-1 shadow-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
            title="Дублировать"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded text-foreground/70 hover:bg-foreground/10 hover:text-[color:var(--destructive,_#ef4444)]"
            title="Удалить"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── add menu ───────────────────────── */

function AddNodeMenu({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (k: NodeKind) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute z-20 w-64 rounded-tile border border-border bg-background/95 backdrop-blur shadow-xl p-1"
      style={{ left: Math.max(8, x), top: Math.max(8, y) }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-foreground/55">Добавить ноду</span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-foreground/55 hover:text-foreground"
        >
          Esc
        </button>
      </div>
      {NODE_ORDER.map((k) => {
        const m = NODE_META[k];
        const Icon = m.icon;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-foreground/5"
          >
            <span
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md"
              style={{ background: `color-mix(in oklab, ${m.accent} 18%, transparent)` }}
            >
              <Icon className="w-4 h-4" style={{ color: m.accent }} strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium">{m.label}</span>
              <span className="block text-[11px] text-foreground/55 truncate">{m.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── toolbar btn ───────────────────────── */

function ToolBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-foreground/70 hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </button>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function topoOrder(nodes: WFNode[], edges: WFEdge[]): string[] {
  // simple Kahn's algorithm; falls back to source order if cycles
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

function delay(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}
