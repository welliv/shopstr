export type DurationParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export const calculateDurationParts = (totalSeconds: number): DurationParts => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return { days, hours, minutes, seconds };
};

export const formatDurationCompact = (totalSeconds?: number): string | undefined => {
  if (totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return undefined;
  }

  const { days, hours, minutes, seconds } = calculateDurationParts(totalSeconds);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.slice(0, 3).join(" ");
};

export const formatDurationLong = (totalSeconds?: number): string | undefined => {
  if (totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return undefined;
  }

  const { days, hours, minutes, seconds } = calculateDurationParts(totalSeconds);
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) {
    parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  }

  return parts.join(", ");
};
