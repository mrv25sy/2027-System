import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";

export type DayLog = {
  date: string; // yyyy-MM-dd
  lecturesAttended: number;
  lecturesTotal: number;
  studyHours: number;
  pythonHours: number;
  algoHours: number;
  buildHours: number;
  problemsSolved: number;
  wastedHours: number;
  mood: number; // 1-5
  focus: number; // 1-5
  note?: string;
};

export type TaskArea = "uni" | "code" | "build";
export type Task = {
  id: string;
  title: string;
  area: TaskArea;
  priority: boolean;
  done: boolean;
  date: string;
  doneAt?: string | undefined;
};

export type TrackerState = { logs: Record<string, DayLog>; tasks: Task[]; sample?: boolean };

export const STORAGE_KEY = "command-center-v1";
export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export const emptyLog = (date: string): DayLog => ({
  date,
  lecturesAttended: 0,
  lecturesTotal: 0,
  studyHours: 0,
  pythonHours: 0,
  algoHours: 0,
  buildHours: 0,
  problemsSolved: 0,
  wastedHours: 0,
  mood: 3,
  focus: 3,
});

export const productive = (l: DayLog) => l.studyHours + l.pythonHours + l.algoHours + l.buildHours;
export const codingHours = (l: DayLog) => l.pythonHours + l.algoHours + l.buildHours;

export function skillXp(state: TrackerState) {
  const logs = Object.values(state.logs);
  const doneTasks = state.tasks.filter((t) => t.done);
  const sum = (f: (l: DayLog) => number) => logs.reduce((a, l) => a + f(l), 0);
  const tasksIn = (a: TaskArea) => doneTasks.filter((t) => t.area === a).length * 15;
  return {
    University: Math.round(sum((l) => l.studyHours * 10 + l.lecturesAttended * 5) + tasksIn("uni")),
    Python: Math.round(sum((l) => l.pythonHours * 12) + tasksIn("code")),
    Algorithms: Math.round(sum((l) => l.algoHours * 12 + l.problemsSolved * 6)),
    Building: Math.round(sum((l) => l.buildHours * 12) + tasksIn("build")),
  };
}

export function dayXp(l: DayLog) {
  return Math.max(
    0,
    Math.round(
      l.studyHours * 10 + l.lecturesAttended * 5 + codingHours(l) * 12 + l.problemsSolved * 6 - l.wastedHours * 5,
    ),
  );
}

export function levelFromXp(xp: number) {
  // level n starts at 50 * (n-1)^2 * 2
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const start = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  return { level, into: xp - start, span: next - start, pct: ((xp - start) / (next - start)) * 100 };
}

export function streak(state: TrackerState) {
  let count = 0;
  let d = new Date();
  const k = (x: Date) => format(x, "yyyy-MM-dd");
  const ok = (x: Date) => {
    const l = state.logs[k(x)];
    return !!l && productive(l) >= 1;
  };
  if (!ok(d)) d = subDays(d, 1);
  while (ok(d)) {
    count++;
    d = subDays(d, 1);
  }
  return count;
}

export function bestStreak(state: TrackerState) {
  const dates = Object.values(state.logs)
    .filter((l) => productive(l) >= 1)
    .map((l) => l.date)
    .sort();
  let best = 0,
    cur = 0,
    prev: string | null = null;
  for (const d of dates) {
    cur = prev && differenceInCalendarDays(parseISO(d), parseISO(prev)) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export function makeSample(): TrackerState {
  const logs: Record<string, DayLog> = {};
  const r = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 2) / 2;
  for (let i = 27; i >= 1; i--) {
    if (Math.random() < 0.12) continue;
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    const trend = (27 - i) / 27;
    const total = Math.floor(r(1, 4));
    logs[date] = {
      date,
      lecturesTotal: total,
      lecturesAttended: Math.min(total, Math.floor(r(0, total + 0.5))),
      studyHours: r(0.5, 2 + trend * 2),
      pythonHours: r(0, 1 + trend * 1.5),
      algoHours: r(0, 0.5 + trend * 1.5),
      buildHours: r(0, 1.5),
      problemsSolved: Math.floor(r(0, 2 + trend * 3)),
      wastedHours: r(1.5 - trend, 4 - trend * 2),
      mood: Math.round(r(2, 5)),
      focus: Math.round(r(2 + trend, 5)),
    };
  }
  const t = todayKey();
  const tasks: Task[] = [
    { id: "s1", title: "Finish Data Structures assignment #3", area: "uni", priority: true, done: false, date: t },
    { id: "s2", title: "Solve 3 LeetCode two-pointer problems", area: "code", priority: true, done: false, date: t },
    { id: "s3", title: "Ship CLI habit tracker v0.1 in Python", area: "build", priority: false, done: false, date: t },
    { id: "s4", title: "Review lecture notes: Discrete Math", area: "uni", priority: false, done: true, date: t, doneAt: t },
  ];
  return { logs, tasks, sample: true };
}
