import { useEffect, useRef, useState } from "react";

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
export const useCurrentUnixTime = (
  options: UseCurrentUnixTimeOptions = {}
): number => {
  const { intervalMs = 1000, isEnabled = true } = options;
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    intervalRef.current = setInterval(
      () => {
        setNow(Math.floor(Date.now() / 1000));
      },
      Math.max(250, intervalMs)
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [intervalMs, isEnabled]);

  return now;
};

export default useCurrentUnixTime;
