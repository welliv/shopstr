# Continuous Improvement Roadmap

This guide captures practical ways to keep Shopstr fast, reliable, and secure as the marketplace evolves. Each section mixes immediate takeaways with forward-looking opportunities so contributors can focus their effort where it will have the greatest impact.

## Operational Excellence

- **Adopt layered validation in CI** – run `npm run lint-all` alongside `npm test` before publishing pull requests. Catching type/lint regressions early shortens review cycles and prevents flaky deploys.
- **Favor shared utilities over one-off logic** – reusable hooks like `useCurrentUnixTime` and presentation components such as `CountdownBadge` prevent divergent behavior between desktop and mobile entry points. Any future lifecycle logic (e.g., reminders, analytics) can now plug into a single source of truth.
- **Instrument critical flows** – when extending publish or renew flows, surface telemetry (even console-level metrics) so regressions in relay, cache, or wallet integrations can be traced quickly.

## Performance & Efficiency

- **Share timers and observers** – the `useCurrentUnixTime` hook now multiplexes subscribers onto one interval, eliminating dozens of overlapping timers when grids render hundreds of cards.【F:components/hooks/use-current-unix-time.ts†L1-L104】
- **Prefer derived snapshots over recomputation** – `updateProductExpirationSnapshot` already skips object churn when a listing has not changed. Reuse that pattern for price conversions, shipping estimates, or reputation scoring to avoid unnecessary React re-renders.【F:utils/parsers/product-parser-functions.ts†L61-L113】
- **Batch expensive relay work** – cache-aware fetchers should debounce cache writes, hydrate the UI optimistically, and only persist non-expired data (as seen in `fetchAllPosts`). Applying the same pattern to chats, reviews, and profiles will reduce IO pressure on busy relays.【F:utils/nostr/fetch-service.ts†L1-L120】
- **Lazy-load rich media** – image-heavy components (`ImageCarousel`, hero carousels) should adopt responsive `loading="lazy"` attributes and pre-sized containers to limit layout shifts on slower devices.

## Security & Data Integrity

- **Treat inbound tag data as untrusted** – continue to sanitize URLs (`@braintree/sanitize-url`) and coerce numbers defensively. Before surfacing new tag types, enforce strict parsing helpers and fallbacks (e.g., defaulting invalid prices to `0`).
- **Harden renewal workflows** – renewal paths now validate signer presence and ownership inside the modal. Extend those checks to future admin flows and ensure relays reject expired events so stale data cannot be replayed.【F:components/display-product-modal.tsx†L92-L192】
- **Guard wallet surfaces** – legacy wallet modal tests have highlighted brittle behavior. Adopt integration tests that cover authentication + payment flows end-to-end and ensure secrets (mnemonics, proofs) never enter logs.

## UI & Accessibility

- **Centralize lifecycle messaging** – `CountdownBadge` keeps countdown semantics consistent, adds accessible `aria-live` updates, and adjusts styling automatically when an item is about to expire.【F:components/utility-components/countdown-badge.tsx†L1-L69】
- **Prioritize status clarity** – product cards combine status pills, countdowns, and renewal cues without overwhelming small screens. Use the same pattern for order states (“Paid”, “Shipped”, etc.) to keep key information above the fold.【F:components/utility-components/product-card.tsx†L1-L118】
- **Design for mobile-first interactions** – ensure tap targets meet a 44px minimum, avoid hover-only affordances, and expose actionable CTAs (renew, delete, share) inside modals for one-handed use.【F:components/display-product-modal.tsx†L1-L213】

## Next Steps

- Implement skeleton loaders that reuse cached listing metadata while fresh data streams in from relays.
- Decompose large marketplace lists with intersection observers or windowing (e.g., `react-window`) to keep scroll performance smooth on mid-tier devices.
- Ship a “reduced motion” preference toggle that reuses the shared timer infrastructure while respecting user accessibility preferences.
