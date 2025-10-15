import React, { useMemo } from "react";
import {
  formatDurationCompact,
  formatDurationLong,
} from "@/utils/time/countdown";
import usePrefersReducedMotion from "@/components/hooks/use-prefers-reduced-motion";

type CountdownAppearance = "overlay" | "panel";

type CountdownBadgeProps = {
  secondsRemaining?: number;
  isExpired?: boolean;
  appearance?: CountdownAppearance;
  emphasizeThresholdSeconds?: number;
  prefix?: string;
  className?: string;
};

const combineClassNames = (
  ...classes: Array<string | false | null | undefined>
): string => classes.filter(Boolean).join(" ");

const appearanceBaseClasses: Record<CountdownAppearance, string> = {
  overlay:
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur",
  panel: "rounded-lg px-3 py-2 text-sm font-semibold shadow-sm",
};

const appearanceToneClasses: Record<CountdownAppearance, {
  default: string;
  urgent: string;
}> = {
  overlay: {
    default: "bg-black/70 text-white dark:bg-white/20",
    urgent: "bg-red-600/90 text-white",
  },
  panel: {
    default: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  },
};

const DEFAULT_THRESHOLD_SECONDS = 86_400; // 24 hours

const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  secondsRemaining,
  isExpired = false,
  appearance = "overlay",
  emphasizeThresholdSeconds = DEFAULT_THRESHOLD_SECONDS,
  prefix = "Expires in",
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const displaySeconds = useMemo(() => {
    if (secondsRemaining === undefined) {
      return undefined;
    }

    if (!prefersReducedMotion) {
      return secondsRemaining;
    }

    if (secondsRemaining <= 0) {
      return 0;
    }

    const minutes = Math.ceil(secondsRemaining / 60);
    return minutes * 60;
  }, [secondsRemaining, prefersReducedMotion]);

  if (isExpired || displaySeconds === undefined) {
    return null;
  }

  const compactLabel = formatDurationCompact(displaySeconds);
  if (!compactLabel) {
    return null;
  }

  const longLabel = formatDurationLong(displaySeconds);
  const isUrgent =
    typeof displaySeconds === "number" &&
    displaySeconds <= emphasizeThresholdSeconds;

  const baseClass = appearanceBaseClasses[appearance];
  const toneClass = appearanceToneClasses[appearance][
    isUrgent ? "urgent" : "default"
  ];

  const ariaLabelParts = [];
  if (prefix) {
    ariaLabelParts.push(prefix);
  }
  if (prefersReducedMotion && longLabel) {
    ariaLabelParts.push(`Approximately ${longLabel}`);
  } else {
    ariaLabelParts.push(longLabel ?? compactLabel);
  }

  const ariaLive = prefersReducedMotion ? "off" : "polite";
  const label = prefix ? `${prefix} ${compactLabel}` : compactLabel;

  return (
    <span
      className={combineClassNames(baseClass, toneClass, className)}
      aria-live={ariaLive}
      aria-label={ariaLabelParts.join(" ")}
      title={longLabel ?? undefined}
    >
      {label}
    </span>
  );
};

export default CountdownBadge;
