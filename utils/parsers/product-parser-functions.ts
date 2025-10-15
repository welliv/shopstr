import { ShippingOptionsType } from "@/utils/STATIC-VARIABLES";
import { calculateTotalCost } from "@/components/utility-components/display-monetary-info";
import { ListingDurationOption, NostrEvent } from "@/utils/types/types";
import {
  isListingDurationOption,
  normalizeCustomDurationSeconds,
} from "@/utils/listings/duration";

export const getExpirationTimestamp = (
  tags?: string[][]
): number | undefined => {
  if (!tags) return undefined;

  for (const tag of tags) {
    if (tag[0] !== "expiration") continue;
    const value = tag[1];
    if (!value) continue;

    const timestamp = Number(value);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return undefined;
};

export const isExpiredAtReference = (
  expiration?: number,
  referenceTime: number = Math.floor(Date.now() / 1000)
): boolean => {
  if (typeof expiration !== "number") {
    return false;
  }

  return expiration <= referenceTime;
};

export const getProductExpirationStatus = (
  productEvent: Pick<NostrEvent, "tags">,
  referenceTime: number = Math.floor(Date.now() / 1000)
) => {
  const expiration = getExpirationTimestamp(productEvent.tags);
  const isExpired = isExpiredAtReference(expiration, referenceTime);
  const secondsUntilExpiration =
    typeof expiration === "number"
      ? Math.max(0, expiration - referenceTime)
      : undefined;

  return {
    expiration,
    isExpired,
    secondsUntilExpiration,
  };
};

export const updateProductExpirationSnapshot = (
  product: ProductData,
  referenceTime: number = Math.floor(Date.now() / 1000)
): ProductData => {
  const { expiration } = product;

  if (typeof expiration !== "number") {
    if (!product.isExpired && product.secondsUntilExpiration === undefined) {
      return product;
    }

    if (!product.isExpired || product.secondsUntilExpiration !== undefined) {
      return {
        ...product,
        isExpired: false,
        secondsUntilExpiration: undefined,
      };
    }

    return product;
  }

  const secondsUntilExpiration = Math.max(0, expiration - referenceTime);
  const isExpired = expiration <= referenceTime;

  if (
    product.isExpired === isExpired &&
    product.secondsUntilExpiration === secondsUntilExpiration
  ) {
    return product;
  }

  return {
    ...product,
    isExpired,
    secondsUntilExpiration,
  };
};

export type ProductData = {
  id: string;
  pubkey: string;
  createdAt: number;
  title: string;
  summary: string;
  publishedAt: string;
  images: string[];
  categories: string[];
  location: string;
  price: number;
  currency: string;
  shippingType?: ShippingOptionsType;
  shippingCost?: number;
  totalCost: number;
  d?: string;
  contentWarning?: boolean;
  quantity?: number;
  sizes?: string[];
  sizeQuantities?: Map<string, number>;
  volumes?: string[];
  volumePrices?: Map<string, number>;
  condition?: string;
  status?: string;
  selectedSize?: string;
  selectedQuantity?: number;
  selectedVolume?: string;
  volumePrice?: number;
  required?: string;
  restrictions?: string;
  pickupLocations?: string[];
  expiration?: number;
  isExpired?: boolean;
  secondsUntilExpiration?: number;
  expirationDuration?: ListingDurationOption;
  expirationCustomSeconds?: number;
  rawEvent?: NostrEvent;
};

export const parseTags = (productEvent: NostrEvent) => {
  const parsedData: ProductData = {
    id: "",
    pubkey: "",
    createdAt: 0,
    title: "",
    summary: "",
    publishedAt: "",
    images: [],
    categories: [],
    location: "",
    price: 0,
    currency: "",
    totalCost: 0,
    expiration: undefined,
    isExpired: false,
    expirationDuration: undefined,
    expirationCustomSeconds: undefined,
  };
  parsedData.rawEvent = productEvent;
  parsedData.pubkey = productEvent.pubkey;
  parsedData.id = productEvent.id;
  parsedData.createdAt = productEvent.created_at;
  const tags = productEvent.tags;
  if (tags === undefined) return;
  tags.forEach((tag) => {
    const [key, ...values] = tag;
    switch (key) {
      case "title":
        parsedData.title = values[0]!;
        break;
      case "summary":
        parsedData.summary = values[0]!;
        break;
      case "published_at":
        parsedData.publishedAt = values[0]!;
        break;
      case "image":
        if (parsedData.images === undefined) parsedData.images = [];
        parsedData.images.push(values[0]!);
        break;
      case "t":
        if (parsedData.categories === undefined) parsedData.categories = [];
        parsedData.categories.push(values[0]!);
        break;
      case "location":
        parsedData.location = values[0]!;
        break;
      case "price":
        const [amount, currency] = values;
        parsedData.price = Number(amount);
        parsedData.currency = currency!;
        break;
      case "shipping":
        if (values.length === 3) {
          const [shippingType, cost, _currency] = values;
          parsedData.shippingType = shippingType as ShippingOptionsType;
          parsedData.shippingCost = Number(cost);
          break;
        }
        // TODO Deprecate Below after 11/07/2023
        else if (values.length === 2) {
          // [cost, currency]
          const [cost, _currency] = values;
          parsedData.shippingType = "Added Cost";
          parsedData.shippingCost = Number(cost);
          break;
        } else if (values.length === 1) {
          // [type]
          const [shippingType] = values;
          parsedData.shippingType = shippingType as ShippingOptionsType;
          parsedData.shippingCost = 0;
          break;
        }
        break;
      case "d":
        parsedData.d = values[0];
        break;
      case "content-warning":
        parsedData.contentWarning = true;
        break;
      case "L":
        const LValue = values[0];
        if (LValue === "content-warning") {
          parsedData.contentWarning = true;
        }
        break;
      case "l":
        const lValue = values[1];
        if (lValue === "content-warning") {
          parsedData.contentWarning = true;
        }
        break;
      case "quantity":
        parsedData.quantity = Number(values[0]);
        break;
      case "size":
        const [size, quantity] = values;
        if (parsedData.sizes === undefined) parsedData.sizes = [];
        parsedData.sizes?.push(size!);
        if (parsedData.sizeQuantities === undefined)
          parsedData.sizeQuantities = new Map<string, number>();
        parsedData.sizeQuantities.set(size!, Number(quantity));
        break;
      case "volume":
        if (!parsedData.volumes) {
          parsedData.volumes = [];
          parsedData.volumePrices = new Map<string, number>();
        }
        if (values[0]) {
          parsedData.volumes.push(values[0]);
          if (values[1]) {
            parsedData.volumePrices!.set(values[0], parseFloat(values[1]));
          }
        }
        break;
      case "condition":
        parsedData.condition = values[0];
        break;
      case "status":
        parsedData.status = values[0];
        break;
      case "expiration_policy":
        if (values[0] && isListingDurationOption(values[0])) {
          parsedData.expirationDuration = values[0];

          if (values[0] === "custom") {
            const maybeSeconds = Number(values[1]);
            const normalizedSeconds = normalizeCustomDurationSeconds(
              maybeSeconds
            );

            if (normalizedSeconds) {
              parsedData.expirationCustomSeconds = normalizedSeconds;
            }
          }
        }
        break;
      case "required":
        parsedData.required = values[0];
        break;
      case "restrictions":
        parsedData.restrictions = values[0];
        break;
      case "pickup_location":
        if (parsedData.pickupLocations === undefined)
          parsedData.pickupLocations = [];
        parsedData.pickupLocations.push(values[0]!);
        break;
      default:
        return;
    }
  });
  parsedData.totalCost = calculateTotalCost(parsedData);
  const { expiration, isExpired, secondsUntilExpiration } =
    getProductExpirationStatus(productEvent);
  parsedData.expiration = expiration;
  parsedData.isExpired = isExpired;
  parsedData.secondsUntilExpiration = secondsUntilExpiration;
  return parsedData;
};

export default parseTags;
