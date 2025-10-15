import { useEffect, useMemo, useState } from "react";

export type UseCurrentUnixTimeOptions = {
  /**
   * Interval in milliseconds between updates. Defaults to 1000ms.
   */
  intervalMs?: number;
  /**
   * Toggle the internal timer on or off. Defaults to `true`.
   */
  isEnabled?: boolean;
};

/**
 * Lightweight hook that exposes the current unix timestamp and keeps it fresh on a cadence.
 * Sharing the timer through a hook prevents every countdown component from spawning its own
 * interval which keeps CPU usage low when rendering many listings at once.
 */
type UnixTimeListener = (timestamp: number) => void;

type UnixTimeStore = {
  current: number;
  intervalMs: number;
  listeners: Set<UnixTimeListener>;
  timer?: NodeJS.Timeout;
};

const MIN_INTERVAL_MS = 250;
const unixTimeStores = new Map<number, UnixTimeStore>();

const getUnixTimeStore = (intervalMs: number): UnixTimeStore => {
  const normalizedInterval = Math.max(
    MIN_INTERVAL_MS,
    Math.floor(intervalMs)
  );
  const existingStore = unixTimeStores.get(normalizedInterval);
  if (existingStore) {
    return existingStore;
  }

  const store: UnixTimeStore = {
    current: Math.floor(Date.now() / 1000),
    intervalMs: normalizedInterval,
    listeners: new Set<UnixTimeListener>(),
  };
  unixTimeStores.set(normalizedInterval, store);
  return store;
};

const startUnixTimeStore = (store: UnixTimeStore) => {
  if (store.timer || store.listeners.size === 0) {
    return;
  }

  store.timer = setInterval(() => {
    const nextTimestamp = Math.floor(Date.now() / 1000);
    if (nextTimestamp === store.current) {
      return;
    }

    store.current = nextTimestamp;
    store.listeners.forEach((listener) => listener(store.current));
  }, store.intervalMs);
};

const stopUnixTimeStore = (store: UnixTimeStore) => {
  if (store.timer) {
    clearInterval(store.timer);
    store.timer = undefined;
  }
  if (store.listeners.size === 0) {
    unixTimeStores.delete(store.intervalMs);
  }
};

export const useCurrentUnixTime = (
  options: UseCurrentUnixTimeOptions = {}
): number => {
  const { intervalMs = 1000, isEnabled = true } = options;
  const store = useMemo(() => getUnixTimeStore(intervalMs), [intervalMs]);
  const [now, setNow] = useState<number>(() => store.current);

  useEffect(() => {
    if (!isEnabled) {
      setNow(Math.floor(Date.now() / 1000));
      return;
    }

    const listener: UnixTimeListener = (timestamp) => {
      setNow(timestamp);
    };
    store.listeners.add(listener);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (store.current !== currentTimestamp) {
      store.current = currentTimestamp;
    }
    setNow(store.current);
    startUnixTimeStore(store);

    return () => {
      store.listeners.delete(listener);
      if (store.listeners.size === 0) {
        stopUnixTimeStore(store);
      }
    };
  }, [isEnabled, store]);

  return isEnabled ? now : Math.floor(Date.now() / 1000);
};

export const __resetUnixTimeStoresForTests = () => {
  unixTimeStores.forEach((store) => {
    if (store.timer) {
      clearInterval(store.timer);
    }
    store.listeners.clear();
  });
  unixTimeStores.clear();
};

export default useCurrentUnixTime;
