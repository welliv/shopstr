# NIP-40 Expiration Implementation Guide

## Objective
- Publish every listing event (`kind: 30402`) with both `published_at` and `expiration` tags where `expiration = created_at + 14 days`.
- Omit expired listings from public feeds while letting the author review and renew their own archived posts.

## Prerequisites
- Node.js 18.17+ and npm 9.6.7+.
- Git with access to a fork of `shopstr`.
- Optional: Docker (for running builds inside containers) and VS Code.

### Quick setup
```bash
# create a fork on GitHub, then clone it locally
git clone https://github.com/<your-username>/shopstr.git
cd shopstr

git remote add upstream https://github.com/shopstr-eng/shopstr.git
npm ci
npm run dev   # optional sanity check, stop with Ctrl+C
```

## Code hotspots
| Concern | File(s) | Purpose |
| --- | --- | --- |
| Publishing listings | `utils/nostr/nostr-helper-functions.ts` (`PostListing`) | Adds metadata before signing events. |
| Listing duration helpers | `utils/listings/duration.ts` | Supplies expiration policy defaults and parsing utilities. |
| Event parsing | `utils/parsers/product-parser-functions.ts` | Converts tags into the `ProductData` shape used by the UI. |
| Relay fetch pipeline | `utils/nostr/fetch-service.ts` | Pulls events from relays and filters them. |
| Marketplace UI | `components/display-products.tsx` & friends | Ensures expired listings stay hidden publicly. |
| Seller dashboard | `components/my-listings/*` | Shows the owner when a listing expires and provides renewal actions. |

## Implementation checklist
1. **Enforce expiration on publish**
   - In `PostListing`, strip any stale `published_at`/`expiration` tags, normalize the selected `expiration_policy`, then append
     ```ts
     const created_at = Math.floor(Date.now() / 1000);
     const expiration = created_at + 14 * 24 * 60 * 60; // or helper derived seconds
     updatedTags.push(["published_at", String(created_at)]);
     updatedTags.push(["expiration", String(expiration)]);
     ```
   - The helpers in `utils/listings/duration.ts` already provide sane defaults and custom duration bounds.

2. **Parse expiration metadata**
   - Extend `ProductData` with an `expiration: number | null` field.
   - When parsing tags, convert the `expiration` tag to a number and track whether the listing has already expired.

3. **Filter relay responses**
   - In `fetchAllPosts`, discard events whose parsed expiration is in the past:
     ```ts
     const now = Math.floor(Date.now() / 1000);
     if (parsed.expiration && parsed.expiration < now) continue;
     ```
   - Only cache and display events that pass this check.

4. **Guard the UI**
   - Derive `activeProducts` in marketplace components by filtering on `product.expiration`.
   - In the seller dashboard, show the expiration date, highlight soon-to-expire listings (< 48 hours remaining), and surface a
     Renew action that republishes via `PostListing`.

5. **(Optional) Renew flow enhancements**
   - Prefill the listing form with the prior values.
   - After republishing, refresh caches or re-fetch listings so the renewed event replaces the expired one.

## Validation checklist
```bash
npm run lint
npm run type-check
npm test
npm run build
```
- Manually confirm a freshly published listing contains the `expiration` tag set 1,209,600 seconds after `created_at`.
- Temporarily adjust a cached listing to expire and ensure it disappears from the public marketplace but remains visible (and
  flagged) for the owner.
- Renew the expired listing and verify the replacement event appears in public feeds.

## Git workflow
```bash
git checkout -b feature/nip40-expiration
# edit, commit, and push changes
git status
git add <files>
git commit -m "Implement NIP-40 expiration handling"
git push origin feature/nip40-expiration
```
Synchronize with upstream regularly (`git fetch upstream && git merge upstream/main`) to avoid drift.
