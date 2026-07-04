import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, MoreHorizontal, X, Mail } from "lucide-react";

export const Route = createFileRoute("/app/team")({
  head: () => ({ meta: [{ title: "Команда" }] }),
  component: TeamPage,
});

type Member = { name: string; email: string; role: "Владелец" | "Админ" | "Редактор" | "Гость"; status: "Активен" | "Приглашён" };

const MEMBERS: Member[] = [
  { name: "Кирилл Н.",   email: "kirill@neeklo.app",   role: "Владелец", status: "Активен" },
  { name: "Анна С.",     email: "anna@neeklo.app",     role: "Админ",    status: "Активен" },
  { name: "Игорь Л.",    email: "igor@neeklo.app",     role: "Редактор", status: "Активен" },
  { name: "Маша Р.",     email: "masha@neeklo.app",    role: "Редактор", status: "Приглашён" },
  { name: "Партнёр",     email: "partner@studio.ru",   role: "Гость",    status: "Активен" },
];

function TeamPage() {
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  return (
    <main className="min-h-dvh bg-background text-foreground px-5 lg:px-10 pt-8 lg:pt-12 pb-16 app-pad-tab">
      <header className="flex items-start justify-between gap-4 mb-8 max-w-[1100px]">
        <div>
          <h1 className="text-[26px] lg:text-[34px] font-bold tracking-tight inline-flex items-center gap-3">
            <Users className="w-7 h-7 text-accent" strokeWidth={1.75} />
            Команда
          </h1>
          <p className="text-[13.5px] lg:text-[15px] text-muted-foreground mt-1.5">
            Пригласи коллег и распредели роли
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="btn-primary inline-flex items-center gap-2 h-11 px-5 text-[13.5px]"
          style={{ boxShadow: "var(--shadow-warm)" }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Пригласить</span>
        </button>
      </header>

      <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-[1100px]">
        <div className="hidden sm:grid grid-cols-[1.4fr_1fr_0.8fr_auto] gap-4 px-5 py-3 text-[11.5px] uppercase tracking-[0.08em] text-muted-foreground border-b border-border bg-surface-1/40">
          <span>Сотрудник</span>
          <span>Роль</span>
          <span>Статус</span>
          <span />
        </div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.email} className="grid sm:grid-cols-[1.4fr_1fr_0.8fr_auto] gap-x-4 gap-y-1 px-5 py-4 items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
                  style={{ background: "var(--gradient-warm-soft)", color: "var(--accent)" }}
                >
                  {m.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium truncate">{m.name}</div>
                  <div className="text-[12px] text-muted-foreground truncate">{m.email}</div>
                </div>
              </div>
              <div className="text-[13px]">{m.role}</div>
              <div>
                <span
                  className={
                    m.status === "Активен"
                      ? "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11.5px] font-medium border border-accent/40 text-accent bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
                      : "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11.5px] font-medium border border-border text-muted-foreground bg-surface-1"
                  }
                >
                  {m.status}
                </span>
              </div>
              <div className="justify-self-end relative">
                <button
                  type="button"
                  onClick={() => setMenuFor((v) => (v === m.email ? null : m.email))}
                  className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 inline-flex items-center justify-center transition-colors"
                  aria-label="Действия"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuFor === m.email && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 top-10 z-40 w-44 rounded-xl bg-card border border-border shadow-xl py-1 text-[13px]">
                      {m.status === "Приглашён" && (
                        <button
                          type="button"
                          onClick={() => { toast.success("Приглашение отправлено повторно", { description: m.email }); setMenuFor(null); }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-2"
                        >
                          Переотправить
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={m.role === "Владелец"}
                        onClick={() => {
                          setMembers((arr) => arr.map((x) => (x.email === m.email ? { ...x, role: "Админ" } : x)));
                          toast("Роль изменена", { description: m.name + " → Админ" });
                          setMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-surface-2 disabled:opacity-40"
                      >
                        Сделать админом
                      </button>
                      <button
                        type="button"
                        disabled={m.role === "Владелец"}
                        onClick={() => {
                          if (confirm("Удалить " + m.name + " из команды?")) {
                            setMembers((arr) => arr.filter((x) => x.email !== m.email));
                            toast.success("Удалён из команды");
                          }
                          setMenuFor(null);
                        }}
                        className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInviteOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[15px] font-semibold">Пригласить в команду</div>
                <div className="text-[12px] text-muted-foreground mt-1">Отправим ссылку на присоединение</div>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} className="w-8 h-8 rounded-lg hover:bg-surface-2 inline-flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="имя@почта.ru"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-background border border-border text-[13px] focus:outline-none focus:border-accent/60"
              />
            </div>
            <button
              type="button"
              disabled={!inviteEmail.includes("@")}
              onClick={() => {
                const email = inviteEmail.trim();
                setMembers((arr) => [...arr, { name: email.split("@")[0], email, role: "Редактор", status: "Приглашён" }]);
                toast.success("Приглашение отправлено", { description: email });
                setInviteEmail("");
                setInviteOpen(false);
              }}
              className="w-full h-11 rounded-full bg-gradient-warm text-accent-foreground text-[13px] font-semibold disabled:opacity-50"
            >
              Отправить приглашение
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
