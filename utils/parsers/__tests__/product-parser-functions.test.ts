import parseTags, {
  getExpirationTimestamp,
  isExpiredAtReference,
  getProductExpirationStatus,
  updateProductExpirationSnapshot,
} from "../product-parser-functions";
import type { ProductData } from "../product-parser-functions";
import { calculateTotalCost } from "@/components/utility-components/display-monetary-info";
import { NostrEvent } from "@/utils/types/types";

jest.mock("@/components/utility-components/display-monetary-info", () => ({
  calculateTotalCost: jest.fn(),
}));

const mockedCalculateTotalCost = calculateTotalCost as jest.Mock;

describe("expiration helpers", () => {
  it("extracts the first valid expiration timestamp", () => {
    const tags = [
      ["expiration", "invalid"],
      ["expiration", "1700000000"],
    ];

    expect(getExpirationTimestamp(tags)).toBe(1700000000);
  });

  it("returns undefined when no expiration tag is present", () => {
    expect(getExpirationTimestamp([["title", "test"]])).toBeUndefined();
  });

  it("determines expiration relative to a reference time", () => {
    expect(isExpiredAtReference(10, 20)).toBe(true);
    expect(isExpiredAtReference(20, 20)).toBe(true);
    expect(isExpiredAtReference(30, 20)).toBe(false);
  });

  it("combines extraction and comparison in getProductExpirationStatus", () => {
    const now = 1_700_000_000;
    const event: { tags: string[][] } = {
      tags: [["expiration", String(now - 1)]],
    };

    expect(getProductExpirationStatus(event, now)).toEqual({
      expiration: now - 1,
      isExpired: true,
      secondsUntilExpiration: 0,
    });
  });

  it("refreshes product expiration snapshots", () => {
    const reference = 1_700_000_000;
    const baseProduct: ProductData = {
      id: "1",
      pubkey: "pub",
      createdAt: reference - 10,
      title: "",
      summary: "",
      publishedAt: "",
      images: [],
      categories: [],
      location: "",
      price: 0,
      currency: "USD",
      totalCost: 0,
      expiration: reference + 90,
      isExpired: false,
      secondsUntilExpiration: 100,
    };

    const updated = updateProductExpirationSnapshot(baseProduct, reference);
    expect(updated.secondsUntilExpiration).toBe(90);
    expect(updated.isExpired).toBe(false);

    const expired = updateProductExpirationSnapshot(
      { ...baseProduct, expiration: reference - 1 },
      reference
    );
    expect(expired.isExpired).toBe(true);
    expect(expired.secondsUntilExpiration).toBe(0);

    const withoutExpiration = updateProductExpirationSnapshot(
      { ...baseProduct, expiration: undefined, isExpired: true },
      reference
    );
    expect(withoutExpiration.isExpired).toBe(false);
    expect(withoutExpiration.secondsUntilExpiration).toBeUndefined();
  });
});

describe("parseTags", () => {
  const baseEvent: NostrEvent = {
    id: "test-id",
    pubkey: "test-pubkey",
    created_at: 1672531200,
    kind: 30023,
    tags: [],
    content: "Product description",
    sig: "test-sig",
  };

  beforeEach(() => {
    mockedCalculateTotalCost.mockClear();
    mockedCalculateTotalCost.mockReturnValue(999);
  });

  it("should parse top-level event data and simple tags correctly", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["title", "My Product"],
        ["summary", "A great product"],
        ["location", "Online"],
      ],
    };
    const result = parseTags(event);

    expect(result.id).toBe("test-id");
    expect(result.pubkey).toBe("test-pubkey");
    expect(result.createdAt).toBe(1672531200);
    expect(result.title).toBe("My Product");
    expect(result.summary).toBe("A great product");
    expect(result.location).toBe("Online");
  });

  it("should parse multiple image and category tags into arrays", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["image", "url1.jpg"],
        ["image", "url2.jpg"],
        ["t", "electronics"],
        ["t", "nostr"],
      ],
    };
    const result = parseTags(event);

    expect(result.images).toEqual(["url1.jpg", "url2.jpg"]);
    expect(result.categories).toEqual(["electronics", "nostr"]);
  });

  it("should parse the price tag into a number and currency string", () => {
    const event = { ...baseEvent, tags: [["price", "19.99", "USD"]] };
    const result = parseTags(event);

    expect(result.price).toBe(19.99);
    expect(result.currency).toBe("USD");
  });

  it("should parse the modern 3-value shipping tag", () => {
    const event = {
      ...baseEvent,
      tags: [["shipping", "Added Cost", "10", "USD"]],
    };
    const result = parseTags(event);

    expect(result.shippingType).toBe("Added Cost");
    expect(result.shippingCost).toBe(10);
  });

  it("should parse the legacy 2-value shipping tag", () => {
    const event = { ...baseEvent, tags: [["shipping", "5", "USD"]] };
    const result = parseTags(event);

    expect(result.shippingType).toBe("Added Cost");
    expect(result.shippingCost).toBe(5);
  });

  it("should parse the simple 1-value shipping tag", () => {
    const event = { ...baseEvent, tags: [["shipping", "Free"]] };
    const result = parseTags(event);

    expect(result.shippingType).toBe("Free");
    expect(result.shippingCost).toBe(0);
  });

  it("should parse various content-warning tags as true", () => {
    const event1 = { ...baseEvent, tags: [["content-warning"]] };
    expect(parseTags(event1).contentWarning).toBe(true);

    const event2 = { ...baseEvent, tags: [["L", "content-warning"]] };
    expect(parseTags(event2).contentWarning).toBe(true);

    const event3 = {
      ...baseEvent,
      tags: [["l", "some-label", "content-warning"]],
    };
    expect(parseTags(event3).contentWarning).toBe(true);
  });

  it("should parse size tags into sizes array and quantities map", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["size", "S", "10"],
        ["size", "M", "5"],
      ],
    };
    const result = parseTags(event);

    expect(result.sizes).toEqual(["S", "M"]);
    expect(result.sizeQuantities).toBeInstanceOf(Map);
    expect(result.sizeQuantities.get("S")).toBe(10);
    expect(result.sizeQuantities.get("M")).toBe(5);
  });

  it("should parse volume tags into volumes array and prices map", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["volume", "100g", "10"],
        ["volume", "500g", "40"],
      ],
    };
    const result = parseTags(event);

    expect(result.volumes).toEqual(["100g", "500g"]);
    expect(result.volumePrices).toBeInstanceOf(Map);
    expect(result.volumePrices.get("100g")).toBe(10);
    expect(result.volumePrices.get("500g")).toBe(40);
  });

  it("should return undefined if tags array is missing", () => {
    const event = { ...baseEvent, tags: undefined };
    expect(parseTags(event)).toBeUndefined();
  });

  it("should call calculateTotalCost with the parsed data and assign its return value", () => {
    const event = { ...baseEvent, tags: [["price", "50", "USD"]] };
    const result = parseTags(event);

    expect(mockedCalculateTotalCost).toHaveBeenCalledTimes(1);
    expect(mockedCalculateTotalCost).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 50,
        currency: "USD",
      })
    );

    expect(result.totalCost).toBe(999);
  });

  it("should ignore unknown tags", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["title", "My Product"],
        ["unknown_tag", "some_value"],
      ],
    };
    const result = parseTags(event);

    expect(result.title).toBe("My Product");
    expect(result).not.toHaveProperty("unknown_tag");
  });

  it("should handle a volume tag without a price", () => {
    const event = { ...baseEvent, tags: [["volume", "100g"]] };
    const result = parseTags(event);

    expect(result.volumes).toEqual(["100g"]);
    expect(result.volumePrices.get("100g")).toBeUndefined();
  });

  it("should ignore L/l tags that are not for content-warning", () => {
    const event = {
      ...baseEvent,
      tags: [
        ["L", "some-other-label"],
        ["l", "another-label", "not-a-warning"],
      ],
    };
    const result = parseTags(event);

    expect(result.contentWarning).toBeFalsy();
  });

  it("should mark listings as expired when the expiration timestamp is in the past", () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 60;
    const event = {
      ...baseEvent,
      tags: [["expiration", pastTimestamp.toString()]],
    };

    const result = parseTags(event);

    expect(result?.expiration).toBe(pastTimestamp);
    expect(result?.isExpired).toBe(true);
  });

  it("should keep listings active when the expiration timestamp is in the future", () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 60;
    const event = {
      ...baseEvent,
      tags: [["expiration", futureTimestamp.toString()]],
    };

    const result = parseTags(event);

    expect(result?.expiration).toBe(futureTimestamp);
    expect(result?.isExpired).toBe(false);
  });

  it("should extract the expiration policy when present", () => {
    const event = {
      ...baseEvent,
      tags: [["expiration_policy", "monthly"]],
    };

    const result = parseTags(event);

    expect(result?.expirationDuration).toBe("monthly");
  });

  it("should ignore unsupported expiration policies", () => {
    const event = {
      ...baseEvent,
      tags: [["expiration_policy", "quarterly"]],
    };

    const result = parseTags(event);

    expect(result?.expirationDuration).toBeUndefined();
  });
});
