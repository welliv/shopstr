import {
  ListingDurationOption,
  ListingDurationPolicy,
} from "@/utils/types/types";
import { calculateDurationParts } from "@/utils/time/countdown";

export interface ListingDurationDefinition {
  value: Exclude<ListingDurationOption, "custom">;
  title: string;
  subtitle: string;
  cadenceLabel: string;
  cadenceDescription: string;
  seconds: number;
}

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export const MAX_CUSTOM_DURATION_DAYS = 6;
export const MAX_CUSTOM_DURATION_SECONDS = MAX_CUSTOM_DURATION_DAYS * DAY;
export const DEFAULT_CUSTOM_DURATION_SECONDS = 2 * DAY;

export const DEFAULT_LISTING_DURATION: ListingDurationPolicy = {
  option: "weekly",
};

export const LISTING_DURATION_DEFINITIONS: ListingDurationDefinition[] = [
  {
    value: "weekly",
    title: "Weekly", // 7 days
    subtitle: "A poised weekly refresh that keeps your audience returning.",
    cadenceLabel: "Weekly · renew every 7 days",
    cadenceDescription:
      "A refined tempo that keeps inventory feeling fresh while establishing a reliable rhythm for collectors.",
    seconds: WEEK,
  },
  {
    value: "bi-weekly",
    title: "Bi-weekly",
    subtitle: "Twice-monthly polish for effortless merchandising upkeep.",
    cadenceLabel: "Bi-weekly · renew every 14 days",
    cadenceDescription:
      "The signature Shopstr cadence—gracefully balances discovery time with an always-evolving storefront.",
    seconds: 2 * WEEK,
  },
  {
    value: "monthly",
    title: "Monthly",
    subtitle: "The leisurely cadence for heritage collections and evergreen drops.",
    cadenceLabel: "Monthly · renew every 30 days",
    cadenceDescription:
      "Ideal for enduring essentials. Let slow fashion and timeless goods shine with a once-a-month encore.",
    seconds: 30 * DAY,
  },
];

const LISTING_DURATION_LOOKUP = new Map<
  Exclude<ListingDurationOption, "custom">,
  ListingDurationDefinition
>(LISTING_DURATION_DEFINITIONS.map((definition) => [definition.value, definition]));

export function isListingDurationOption(
  value?: string | null
): value is ListingDurationOption {
  return (
    value === "custom" ||
    value === "weekly" ||
    value === "bi-weekly" ||
    value === "monthly"
  );
}

export function getListingDurationDefinition(
  value?: ListingDurationOption
): ListingDurationDefinition | undefined {
  if (!value || value === "custom") return undefined;
  return LISTING_DURATION_LOOKUP.get(value);
}

export function normalizeCustomDurationSeconds(
  customSeconds?: number
): number | undefined {
  if (customSeconds === undefined || Number.isNaN(customSeconds)) {
    return undefined;
  }

  const flooredHours = Math.floor(customSeconds / HOUR);
  if (flooredHours <= 0) {
    return undefined;
  }

  const safeHours = Math.min(flooredHours, MAX_CUSTOM_DURATION_SECONDS / HOUR);
  return safeHours * HOUR;
}

export function convertDaysHoursToSeconds(days: number, hours: number): number {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  return safeDays * DAY + safeHours * HOUR;
}

export function splitCustomDuration(
  customSeconds?: number
): { days: number; hours: number; minutes: number } {
  if (!customSeconds) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const { days, hours, minutes } = calculateDurationParts(customSeconds);
  return { days, hours, minutes };
}

export function formatCustomDurationLabel(customSeconds?: number): string {
  if (!customSeconds) {
    return "Custom · renew at your bespoke cadence";
  }

  const { days, hours, minutes } = splitCustomDuration(customSeconds);
  const segments: string[] = [];

  if (days > 0) {
    segments.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  if (hours > 0) {
    segments.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0 && segments.length === 0) {
    segments.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  const cadence = segments.join(" · ") || "moments";
  return `Custom · renew every ${cadence}`;
}

export function formatCustomDurationDescription(
  customSeconds?: number
): string {
  if (!customSeconds) {
    return "Craft a limited-time showcase that disappears within six days unless you relist it.";
  }

  const { days, hours, minutes } = splitCustomDuration(customSeconds);
  const fragments: string[] = [];

  if (days > 0) {
    fragments.push(`${days} day${days === 1 ? "" : "s"}`);
  }

  if (hours > 0) {
    fragments.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (minutes > 0) {
    fragments.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }

  const cadence = fragments.join(", ") || "an hour";
  return `This bespoke cadence keeps your drop live for ${cadence} before it quietly retires.`;
}

export function parseListingDurationPolicyValues(
  values: string[]
): ListingDurationPolicy | undefined {
  const [option, detail] = values;

  if (!isListingDurationOption(option)) {
    return undefined;
  }

  if (option === "custom") {
    const normalizedSeconds = normalizeCustomDurationSeconds(Number(detail));
    if (!normalizedSeconds) {
      return undefined;
    }

    return { option, customSeconds: normalizedSeconds };
  }

  return { option };
}

export function buildExpirationPolicyTag(
  policy: ListingDurationPolicy
): [string, ...string[]] {
  if (policy.option === "custom") {
    const normalizedSeconds = normalizeCustomDurationSeconds(
      policy.customSeconds
    );

    if (!normalizedSeconds) {
      return ["expiration_policy", DEFAULT_LISTING_DURATION.option];
    }

    return ["expiration_policy", "custom", String(normalizedSeconds)];
  }

  return ["expiration_policy", policy.option];
}

export function getListingDurationSeconds(
  policy: ListingDurationPolicy = DEFAULT_LISTING_DURATION
): number {
  if (policy.option === "custom") {
    const normalizedSeconds = normalizeCustomDurationSeconds(
      policy.customSeconds
    );

    if (normalizedSeconds) {
      return normalizedSeconds;
    }

    return (
      LISTING_DURATION_LOOKUP.get(DEFAULT_LISTING_DURATION.option)!.seconds
    );
  }

  return (
    LISTING_DURATION_LOOKUP.get(policy.option)?.seconds ??
    LISTING_DURATION_LOOKUP.get(DEFAULT_LISTING_DURATION.option)!.seconds
  );
}

export function ensureListingDurationPolicy(
  values?: string[]
): ListingDurationPolicy {
  if (!values) {
    return DEFAULT_LISTING_DURATION;
  }

  const parsedPolicy = parseListingDurationPolicyValues(values);
  return parsedPolicy ?? DEFAULT_LISTING_DURATION;
}
