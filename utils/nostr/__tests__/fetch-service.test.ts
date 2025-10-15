import { fetchAllPosts } from "../fetch-service";
import { NostrManager } from "@/utils/nostr/nostr-manager";
import { NostrEvent } from "@/utils/types/types";
import {
  parseTags,
  getProductExpirationStatus,
} from "@/utils/parsers/product-parser-functions";
import type { ProductData } from "@/utils/parsers/product-parser-functions";
import {
  addProductToCache,
  fetchAllProductsFromCache,
  removeProductFromCache,
} from "../cache-service";

jest.mock("@/utils/parsers/product-parser-functions", () => ({
  parseTags: jest.fn(),
  getProductExpirationStatus: jest.fn(),
}));

jest.mock("../cache-service", () => ({
  addProductToCache: jest.fn(),
  fetchAllProductsFromCache: jest.fn(),
  removeProductFromCache: jest.fn(),
}));

describe("fetchAllPosts", () => {
  const mockEditProductContext = jest.fn();
  const mockFetchFromCache = fetchAllProductsFromCache as jest.Mock;
  const mockAddProductToCache = addProductToCache as jest.Mock;
  const mockRemoveProductFromCache = removeProductFromCache as jest.Mock;
  const mockParseTags = parseTags as jest.Mock;
  const mockGetExpirationStatus = getProductExpirationStatus as jest.Mock;

  const expiredEvent: NostrEvent = {
    id: "expired-id",
    pubkey: "expired-pubkey",
    created_at: 1,
    kind: 30402,
    content: "",
    tags: [],
    sig: "sig",
  };

  const activeEvent: NostrEvent = {
    id: "active-id",
    pubkey: "active-pubkey",
    created_at: 2,
    kind: 30402,
    content: "",
    tags: [],
    sig: "sig",
  };

  const mockNostrManager = {
    fetch: jest.fn().mockResolvedValue([expiredEvent, activeEvent]),
  } as unknown as NostrManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditProductContext.mockReset();
    mockFetchFromCache.mockResolvedValue([]);
    mockGetExpirationStatus
      .mockReturnValueOnce({ isExpired: true })
      .mockReturnValueOnce({ isExpired: false });
    mockParseTags.mockReturnValue({} as ProductData);
  });

  it("keeps expired listings available without caching them", async () => {
    const result = await fetchAllPosts(
      mockNostrManager,
      ["wss://relay"],
      mockEditProductContext
    );

    expect(mockGetExpirationStatus).toHaveBeenCalledTimes(2);
    expect(mockParseTags).toHaveBeenCalledTimes(1);
    expect(mockAddProductToCache).toHaveBeenCalledTimes(1);
    expect(mockAddProductToCache).toHaveBeenCalledWith(activeEvent);
    expect(result.productEvents).toEqual([expiredEvent, activeEvent]);
    expect(Array.from(result.profileSetFromProducts)).toEqual([
      "active-pubkey",
    ]);
    expect(mockRemoveProductFromCache).toHaveBeenCalledWith([]);
  });
});
