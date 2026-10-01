import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, subDays, parseISO, startOfWeek } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, GraduationCap, Code2, Hammer, Plus, Trash2, Check, Star, Zap } from "lucide-react";
import { useTracker } from "@/hooks/use-tracker";
import {
  type DayLog,
  type TaskArea,
  type TrackerState,
  bestStreak,
  codingHours,
  dayXp,
  emptyLog,
  levelFromXp,
  productive,
  skillXp,
  streak,
  todayKey,
} from "@/lib/tracker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2027 System — Track Your Life" },
      {
        name: "description",
        content: "A calm personal command center for university, software engineering and building projects, with XP, levels and streaks.",
      },
      { property: "og:title", content: "2027 System — Track Your Life" },
      {
        property: "og:description",
        content: "Log study and coding hours, see where time is lost, and watch your skills level up.",
      },
    ],
  }),
  component: Index,
});

const AREA_META: Record<TaskArea, { label: string; icon: typeof Code2 }> = {
  uni: { label: "Uni", icon: GraduationCap },
  code: { label: "Code", icon: Code2 },
  build: { label: "Build", icon: Hammer },
};

function Index() {
  const { state, update } = useTracker();
  if (!state) return <div className="min-h-screen bg-background" />;
  return <Dashboard state={state} update={update} />;
}

type Props = { state: TrackerState; update: (fn: (s: TrackerState) => TrackerState) => void };

function Dashboard({ state, update }: Props) {
  const today = todayKey();
  const log = state.logs[today] ?? emptyLog(today);
  const skills = skillXp(state);
  const totalXp = Object.values(skills).reduce((a, b) => a + b, 0);
  const lvl = levelFromXp(totalXp);
  const cur = streak(state);
  const best = bestStreak(state);

  const setLog = (patch: Partial<DayLog>) =>
    update((s) => ({ ...s, logs: { ...s.logs, [today]: { ...log, ...patch } } }));

  const last7 = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => state.logs[format(subDays(new Date(), i), "yyyy-MM-dd")]);
    const prev = Array.from({ length: 7 }, (_, i) => state.logs[format(subDays(new Date(), i + 7), "yyyy-MM-dd")]);
    const sum = (arr: (DayLog | undefined)[], f: (l: DayLog) => number) =>
      arr.reduce((a, l) => a + (l ? f(l) : 0), 0);
    return {
      prod: sum(days, productive),
      prodPrev: sum(prev, productive),
      wasted: sum(days, (l) => l.wastedHours),
      wastedPrev: sum(prev, (l) => l.wastedHours),
      code: sum(days, codingHours),
      study: sum(days, (l) => l.studyHours),
      lectures: sum(days, (l) => l.lecturesAttended),
      lecturesTotal: sum(days, (l) => l.lecturesTotal),
    };
  }, [state.logs]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">2027 System</span>
            <span className="text-sm text-muted-foreground">/ {format(new Date(), "EEE, MMM d")}</span>
          </div>
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className={cn("h-4 w-4", cur > 0 ? "text-xp" : "text-muted-foreground")} />
              <span className="font-mono">{cur}</span>
              <span className="text-muted-foreground">day streak</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">LVL</span>
              <span className="font-mono text-sm font-medium">{lvl.level}</span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-xp transition-all" style={{ width: `${lvl.pct}%` }} />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {lvl.into}/{lvl.span} XP
              </span>
            </div>
          </div>
        </div>
      </header>

      {state.sample && (
        <div className="mx-6 mt-4 flex max-w-7xl items-center xl:mx-auto justify-between rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <span>You're viewing sample data so the charts have something to show.</span>
          <button
            className="text-foreground underline-offset-4 hover:underline"
            onClick={() => update(() => ({ logs: {}, tasks: [] }))}
          >
            Clear and start fresh
          </button>
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-3">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-3">
          <Kpi label="Productive · 7d" value={`${last7.prod.toFixed(1)}h`} delta={last7.prod - last7.prodPrev} />
          <Kpi
            label="Wasted · 7d"
            value={`${last7.wasted.toFixed(1)}h`}
            delta={last7.wasted - last7.wastedPrev}
            invert
          />
          <Kpi label="Coding · 7d" value={`${last7.code.toFixed(1)}h`} sub={`Study ${last7.study.toFixed(1)}h`} />
          <Kpi
            label="Lectures · 7d"
            value={`${last7.lectures}/${last7.lecturesTotal}`}
            sub={`Best streak ${best}d`}
          />
        </div>

        {/* Daily log */}
        <Card title="Today's log" right={<span className="font-mono text-xs text-xp">+{dayXp(log)} XP</span>}>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Lectures attended" value={log.lecturesAttended} step={1} onChange={(v) => setLog({ lecturesAttended: v })} />
            <NumField label="Lectures scheduled" value={log.lecturesTotal} step={1} onChange={(v) => setLog({ lecturesTotal: v })} />
            <NumField label="Study hours" value={log.studyHours} onChange={(v) => setLog({ studyHours: v })} />
            <NumField label="Python hours" value={log.pythonHours} onChange={(v) => setLog({ pythonHours: v })} />
            <NumField label="Algorithms hours" value={log.algoHours} onChange={(v) => setLog({ algoHours: v })} />
            <NumField label="Problems solved" value={log.problemsSolved} step={1} onChange={(v) => setLog({ problemsSolved: v })} />
            <NumField label="Project build hours" value={log.buildHours} onChange={(v) => setLog({ buildHours: v })} />
            <NumField label="Time wasted (YouTube…)" value={log.wastedHours} danger onChange={(v) => setLog({ wastedHours: v })} />
          </div>
          <div className="mt-4 space-y-3">
            <Rating label="Mood" value={log.mood} onChange={(v) => setLog({ mood: v })} />
            <Rating label="Focus" value={log.focus} onChange={(v) => setLog({ focus: v })} />
          </div>
        </Card>

        {/* Trend chart */}
        <Card title="Productive vs wasted · 28 days" className="lg:col-span-2">
          <TimeChart logs={state.logs} />
        </Card>

        {/* Tasks */}
        <Tasks state={state} update={update} />

        {/* Skills */}
        <Card title="Skill levels">
          <div className="space-y-4">
            {Object.entries(skills).map(([name, xp]) => {
              const l = levelFromXp(xp);
              return (
                <div key={name}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span>{name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Lv {l.level} · {xp} XP
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${l.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Mood & focus · 28 days">
          <MoodChart logs={state.logs} />
        </Card>

        <Card title="Consistency · 16 weeks" className="lg:col-span-2">
          <Heatmap logs={state.logs} />
        </Card>
      </main>
    </div>
  );
}

function Card({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, delta, sub, invert }: { label: string; value: string; delta?: number; sub?: string; invert?: boolean }) {
  const good = delta === undefined ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium tracking-tight">{value}</div>
      {delta !== undefined ? (
        <div className={cn("mt-1 text-xs", good ? "text-primary" : "text-wasted")}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}h vs prior week
        </div>
      ) : (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 0.5,
  danger,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  danger?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-input bg-background">
        <button type="button" className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground" onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))}>
          −
        </button>
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={cn(
            "w-full bg-transparent text-center font-mono text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
            danger && value > 0 && "text-wasted",
          )}
        />
        <button type="button" className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground" onClick={() => onChange(+(value + step).toFixed(1))}>
          +
        </button>
      </div>
    </label>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "h-7 w-7 rounded-md border font-mono text-xs transition-colors",
              n <= value ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--foreground)",
};

function series(logs: Record<string, DayLog>, days = 28) {
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    const l = logs[format(d, "yyyy-MM-dd")];
    return {
      day: format(d, "MMM d"),
      productive: l ? +productive(l).toFixed(1) : 0,
      wasted: l ? l.wastedHours : 0,
      mood: l?.mood ?? null,
      focus: l?.focus ?? null,
    };
  });
}

function TimeChart({ logs }: { logs: Record<string, DayLog> }) {
  const data = series(logs);
  return (
    <div className="h-[26rem]">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -20, right: 4, top: 4 }}>
          <defs>
            <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wasted)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--wasted)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="productive" stroke="var(--primary)" fill="url(#gp)" strokeWidth={2} />
          <Area type="monotone" dataKey="wasted" stroke="var(--wasted)" fill="url(#gw)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MoodChart({ logs }: { logs: Record<string, DayLog> }) {
  const data = series(logs);
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -28, right: 4, top: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} interval={9} />
          <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="mood" stroke="var(--chart-2)" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="focus" stroke="var(--xp)" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Heatmap({ logs }: { logs: Record<string, DayLog> }) {
  const start = startOfWeek(subDays(new Date(), 7 * 15), { weekStartsOn: 1 });
  const weeks = Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = format(date, "yyyy-MM-dd");
      return { key, future: date > new Date(), h: logs[key] ? productive(logs[key]) : 0 };
    }),
  );
  const shade = (h: number) => (h === 0 ? 0 : h < 2 ? 0.25 : h < 4 ? 0.5 : h < 6 ? 0.75 : 1);
  return (
    <div className="flex flex-col gap-4 overflow-x-auto">
      <div className="flex gap-1.5">
        {weeks.map((wk, i) => (
          <div key={i} className="flex flex-col gap-1">
            {wk.map((c) => (
              <div
                key={c.key}
                title={`${format(parseISO(c.key), "MMM d")}: ${c.h.toFixed(1)}h`}
                className={cn("h-4 w-4 rounded-sm", c.future ? "bg-transparent" : "bg-muted")}
                style={!c.future && c.h > 0 ? { background: `color-mix(in oklab, var(--primary) ${shade(c.h) * 100}%, var(--muted))` } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        Less
        {[0, 0.25, 0.5, 0.75, 1].map((s) => (
          <div key={s} className="h-3 w-3 rounded-sm" style={{ background: `color-mix(in oklab, var(--primary) ${s * 100}%, var(--muted))` }} />
        ))}
        More
      </div>
    </div>
  );
}

function Tasks({ state, update }: Props) {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<TaskArea>("uni");
  const [filter, setFilter] = useState<"open" | "done">("open");
  const tasks = state.tasks
    .filter((t) => (filter === "open" ? !t.done : t.done))
    .sort((a, b) => Number(b.priority) - Number(a.priority));

  const add = () => {
    if (!title.trim()) return;
    update((s) => ({
      ...s,
      tasks: [...s.tasks, { id: String(Date.now()), title: title.trim(), area, priority: false, done: false, date: todayKey() }],
    }));
    setTitle("");
  };
  const patch = (id: string, p: Partial<(typeof state.tasks)[number]> | null) =>
    update((s) => ({
      ...s,
      tasks: p === null ? s.tasks.filter((t) => t.id !== id) : s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)),
    }));

  return (
    <Card
      title="Priority tasks"
      className="lg:col-span-2"
      right={
        <div className="flex gap-1 text-xs">
          {(["open", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("rounded px-2 py-1 capitalize", filter === f ? "bg-accent text-foreground" : "text-muted-foreground")}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex gap-2">
        <div className="flex rounded-md border border-input p-0.5">
          {(Object.keys(AREA_META) as TaskArea[]).map((a) => {
            const Icon = AREA_META[a].icon;
            return (
              <button
                key={a}
                onClick={() => setArea(a)}
                className={cn("flex items-center gap-1 rounded px-2 text-xs", area === a ? "bg-accent text-foreground" : "text-muted-foreground")}
              >
                <Icon className="h-3.5 w-3.5" />
                {AREA_META[a].label}
              </button>
            );
          })}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task and press Enter"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <button onClick={add} className="grid w-9 place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90" aria-label="Add task">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {tasks.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nothing here. Pick one thing that matters.</li>}
        {tasks.map((t) => {
          const Icon = AREA_META[t.area].icon;
          return (
            <li key={t.id} className="group flex items-center gap-3 py-2.5">
              <button
                onClick={() => patch(t.id, { done: !t.done, doneAt: !t.done ? todayKey() : undefined })}
                className={cn(
                  "grid h-4 w-4 place-items-center rounded border",
                  t.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 hover:border-primary",
                )}
                aria-label="Toggle done"
              >
                {t.done && <Check className="h-3 w-3" />}
              </button>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
              {!t.done && <span className="font-mono text-[10px] text-xp opacity-0 group-hover:opacity-100">+15 XP</span>}
              <button onClick={() => patch(t.id, { priority: !t.priority })} aria-label="Toggle priority">
                <Star className={cn("h-3.5 w-3.5", t.priority ? "fill-xp text-xp" : "text-muted-foreground opacity-0 group-hover:opacity-100")} />
              </button>
              <button onClick={() => patch(t.id, null)} className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
