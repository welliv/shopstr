import { ListingDurationOption } from "@/utils/types/types";

export interface ListingDurationDefinition {
  value: ListingDurationOption;
  title: string;
  subtitle: string;
  cadenceLabel: string;
  cadenceDescription: string;
  seconds: number;
}

export const DEFAULT_LISTING_DURATION: ListingDurationOption = "bi-weekly";

const WEEK = 7 * 24 * 60 * 60;

export const LISTING_DURATION_DEFINITIONS: ListingDurationDefinition[] = [
  {
    value: "weekly",
    title: "Weekly",
    subtitle: "Perfect when you want to create anticipation with regular drops.",
    cadenceLabel: "Weekly · renew every 7 days",
    cadenceDescription:
      "A lively, time-boxed rhythm that keeps limited inventory in high demand.",
    seconds: WEEK,
  },
  {
    value: "bi-weekly",
    title: "Bi-weekly",
    subtitle: "Our flagship cadence—effortless upkeep every 14 days.",
    cadenceLabel: "Bi-weekly · renew every 14 days",
    cadenceDescription:
      "An elegant balance for most sellers: enough time for discovery without feeling stale.",
    seconds: 2 * WEEK,
  },
  {
    value: "monthly",
    title: "Monthly",
    subtitle: "Let evergreen collections breathe with a once-a-month refresh.",
    cadenceLabel: "Monthly · renew every 30 days",
    cadenceDescription:
      "Great for seasonless essentials—set it, check in monthly, and keep your boutique polished.",
    seconds: 30 * 24 * 60 * 60,
  },
];

const LISTING_DURATION_LOOKUP = new Map<
  ListingDurationOption,
  ListingDurationDefinition
>(LISTING_DURATION_DEFINITIONS.map((definition) => [definition.value, definition]));

export function isListingDurationOption(
  value?: string | null
): value is ListingDurationOption {
  return value === "weekly" || value === "bi-weekly" || value === "monthly";
}

export function getListingDurationDefinition(
  value?: ListingDurationOption
): ListingDurationDefinition | undefined {
  if (!value) return undefined;
  return LISTING_DURATION_LOOKUP.get(value);
}

export function getListingDurationSeconds(option: ListingDurationOption): number {
  return LISTING_DURATION_LOOKUP.get(option)?.seconds ?? LISTING_DURATION_LOOKUP.get(DEFAULT_LISTING_DURATION)!.seconds;
}
