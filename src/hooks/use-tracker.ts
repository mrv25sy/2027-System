import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEY, emptyLog, todayKey, type TrackerState } from "@/lib/tracker";

const freshState = (): TrackerState => ({ logs: {}, tasks: [] });

export function useTracker() {
  const [state, setState] = useState<TrackerState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // Drop any leftover sample data from previous versions.
      setState(parsed && !parsed.sample ? parsed : freshState());
    } catch {
      setState(freshState());
    }
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (s: TrackerState) => TrackerState) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  return { state, update };
}
