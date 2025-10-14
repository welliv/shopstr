# Shopstr NIP-40 Implementation Walkthrough

This playbook is written for **first-time contributors working from an Ubuntu VM** who want to add [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md) expiration support to their own Shopstr fork. It spells out every command you need to run, explains where relevant code lives, and shows how each step connects back to the NIP-40 spec.

> **Goal recap:** Every listing event (`kind: 30402`) must publish with an `expiration` tag that is 14 days after `created_at`. The client must hide expired listings from public feeds while still letting the owner view and renew them by publishing a new listing event.

---

## 1. Forking, cloning, and getting your environment ready

### 1.1 Create a fork on GitHub
1. Log in at <https://github.com> and browse to the Shopstr repository (e.g. `https://github.com/original-author/shopstr`).
2. Click **Fork** → **Create fork**. Accept the defaults so you end up with `https://github.com/<your-username>/shopstr`.

### 1.2 Install Git and configure your identity
```bash
sudo apt update
sudo apt install -y git

# Tell Git who you are (shows up in commits)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 1.3 Clone your fork and add the upstream remote
```bash
cd ~
git clone https://github.com/<your-username>/shopstr.git
cd shopstr

# Keep a reference to the canonical repository so you can sync later
git remote add upstream https://github.com/original-author/shopstr.git
git remote -v  # verify you now have "origin" and "upstream"
```

### 1.4 Install Node.js, npm, and project dependencies
Shopstr targets Node 18. Install it together with npm, then install project packages.
```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # should print v18.x
npm --version

npm install  # run inside the shopstr directory
```

### 1.5 Optional: install Visual Studio Code
VS Code is a friendly editor for TypeScript/React projects, but you can use `nano` or `vim` if you prefer.
```bash
sudo snap install code --classic
```

### 1.6 Run the development server once
Running the app proves your dependencies installed correctly and gives you a live preview while you code.
```bash
npm run dev
```
Browse to `http://localhost:3000` (forward port 3000 from your VM if needed) and make sure the Shopstr UI loads. Stop the server with `Ctrl+C` before continuing.

---

## 2. Understand where NIP-40 touches the codebase

Before writing code, skim these files so you know where the changes will go:

| Concern | File(s) | Notes |
| --- | --- | --- |
| Listing creation | `utils/nostr/nostr-helper-functions.ts` (`PostListing`) | This function assembles and publishes `kind: 30402` events. |
| Parsing listing events | `utils/parsers/product-parser-functions.ts` | Converts event tags into the `ProductData` object the UI consumes. |
| Fetching listings | `utils/nostr/fetch-service.ts` (`fetchAllPosts`) | Pulls listings from relays and feeds them into React state. |
| Rendering public marketplace | `components/display-products.tsx`, `components/home/marketplace.tsx` | Where expired listings must be hidden. |
| Managing your own listings | `components/my-listings/*` | Owners can see expired listings here and will receive the “Renew” button. |

Keep the NIP-40 rule in mind: *clients should ignore events whose `expiration` timestamp is in the past.*

---

## 3. Create a feature branch

Working on a dedicated branch keeps `main` clean and makes your pull request easy to review.
```bash
git checkout -b feature/nip40-expiration
```
Use `git status` frequently; it will show which files change as you follow the next steps.

---

## 4. Implementation steps (with file-by-file instructions)

Each subsection below describes the exact edit you need to make, provides example TypeScript snippets, and explains how to test the change. Follow them in order; commit after each major milestone if that feels safer.

### 4.1 Add expiration metadata when creating listings
1. Open `utils/nostr/nostr-helper-functions.ts` and locate the `PostListing` function.
2. Define a helper constant near the top of the file (right after the imports) so the 14-day window is easy to reuse:
   ```ts
   const FOURTEEN_DAYS_IN_SECONDS = 14 * 24 * 60 * 60;
   ```
3. Inside `PostListing`, after `const created_at = Math.floor(Date.now() / 1000);` compute the expiration timestamp and append the tag before signing the event:
   ```ts
   const expiration = created_at + FOURTEEN_DAYS_IN_SECONDS;
   const updatedValues = [
     ...values,
     ["published_at", String(created_at)],
     ["expiration", String(expiration)],
   ];
   ```
   The existing code only pushes `published_at`; you will replace that block with the expanded version above.
4. Double-check that `updatedValues` is passed into the `event` object as `tags: updatedValues`. The result is that every new listing publishes with both `published_at` and `expiration` tags.

### 4.2 Document the new tag in TypeScript types and parsers
1. Open `utils/parsers/product-parser-functions.ts`.
2. Add an `expiration: number;` field to the `ProductData` type definition.
3. In the `parseTags` function:
   * Initialize `expiration` with `0` inside `parsedData` (so TypeScript knows the field always exists).
   * Add a new `case "expiration":` branch that stores `Number(values[0])` on `parsedData.expiration`.
4. While you are here, ensure `publishedAt` remains a string because the UI already expects that, but `expiration` should be numeric for timestamp comparisons.

### 4.3 Filter expired listings during fetch
Filtering as soon as events leave the relay guarantees that every consumer (marketplace, search, cart, etc.) sees a consistent dataset.

1. In `utils/nostr/fetch-service.ts`, locate the `fetchAllPosts` function.
2. After events are fetched (`const fetchedEvents = await nostr.fetch(...)` loop), parse each event into `ProductData` with `parseTags(event)`.
3. Skip any event whose parsed `expiration` is in the past. Suggested logic inside the `for (const event of fetchedEvents)` loop:
   ```ts
   const parsed = parseTags(event);
   if (!parsed) continue; // skip malformed events

   const now = Math.floor(Date.now() / 1000);
   if (parsed.expiration && parsed.expiration < now) {
     continue; // honor NIP-40 by ignoring expired listings
   }
   ```
4. Only push the original `event` into `productArrayFromRelay` when it passes the check. Remember to keep cache updates (`addProductToCache`) and `profileSetFromProducts` in sync with the filtered list.

### 4.4 Make the public marketplace hide expired listings
Because `fetchAllPosts` now returns only fresh events, the public-facing components will already ignore expired data. Still, add a defensive check in `components/display-products.tsx` so future refactors do not accidentally render expired listings:
```ts
const now = Math.floor(Date.now() / 1000);
const activeProducts = products.filter((product) =>
  product.expiration ? product.expiration >= now : true
);
```
Use `activeProducts` instead of the raw `products` array when mapping through listings. This guard is especially helpful if you later reuse the component with data that hasn’t gone through `fetchAllPosts`.

### 4.5 Surface expiration details to the listing owner
Owners need to know when an item will drop off the marketplace. Update `components/my-listings/my-listings.tsx` (and any child components that render the seller’s table/grid) to display:

* A label such as “Expires on 2024-01-20” (use `new Date(product.expiration * 1000).toLocaleDateString()`).
* A subtle warning (orange/red text) when less than 48 hours remain: compare `product.expiration - now`.
* A badge like “Expired” if the timestamp is in the past—these entries should still render for the owner but be visually distinct.

This UI hint prepares the user for the next renewal flow.

### 4.6 Implement the “Renew” action
1. Decide where the button lives—`components/my-listings/my-listings.tsx` is the primary owner dashboard.
2. Render a **Renew** button next to each expired listing. Disable or hide it for active listings.
3. When clicked, call a helper that:
   * Reads the listing’s existing form values (either from stored tags or by reusing the product creation modal).
   * Calls `PostListing` with those values so a new event is published. Because `PostListing` now adds `expiration` automatically, the renewed event is fresh.
   * Optionally deletes the expired event via `deleteEvent` if you want to keep caches tidy (NIP-40 does not require deletion, but Shopstr already has deletion helpers).
4. Provide feedback to the user—show a toast/snackbar or refresh the listings feed by refetching events.

If wiring a full renew flow feels intimidating, start with a button that logs the intended payload to the console. Once you see the shape matches the original creation flow, hook it into `PostListing`.

### 4.7 Add test coverage (recommended)
* **Parser unit test:** Update `components/__tests__/dynamic-meta-head.test.tsx` or create a new test under `utils/parsers/__tests__/` to assert that `parseTags` populates `expiration` correctly.
* **Fetch service test:** If you have Jest coverage around `fetchAllPosts`, add a case verifying expired events are filtered out.

Run the suite after adding tests:
```bash
npm test
```

---

## 5. Manual validation checklist
Follow this checklist in your development environment to confirm the feature works end-to-end:

1. **Create a listing.** Use the existing “Add Listing” flow. Inspect the published event (developer tools → network or console logging) and confirm the `tags` array includes `['expiration', '<timestamp>']` exactly 1,209,600 seconds (14 days) after `created_at`.
2. **Simulate expiration.** Temporarily edit the event in the database cache or adjust your local time so `expiration` is in the past. Reload the public marketplace—your listing should disappear, while `/my-listings` still shows it as “Expired.”
3. **Renew the listing.** Click the “Renew” button. A new event should publish with a fresh `created_at` and `expiration`, and the item should reappear in the public feed.
4. **Run linting and tests.**
   ```bash
   npm run lint
   npm test
   ```
5. **Audit the UI.** Browse the marketplace and your listings to ensure no console errors appear and all timestamps render in your local timezone.

---

## 6. Commit and push your work
```bash
git status          # confirm the list of changed files
git add <file1> <file2> ...
git commit -m "Implement NIP-40 expiration handling"

git push origin feature/nip40-expiration
```
If Git prompts you for GitHub credentials, paste a personal access token (PAT) rather than your password.

---

## 7. Open a pull request
1. Visit your fork on GitHub and switch to the `feature/nip40-expiration` branch.
2. Click **Compare & pull request**.
3. Fill out the PR template:
   * **Summary:** bullet the key changes (expiration tag, filtering, renew button, tests).
   * **Testing:** list the commands you ran (`npm run lint`, `npm test`, manual verification).
   * **Screenshots:** attach UI captures showing the expired badge and renew button, if applicable.
4. Submit the PR against the upstream repository’s `main` branch and monitor for reviewer feedback.

---

## 8. Troubleshooting tips for beginners
* **`npm install` fails:** delete `node_modules` and `package-lock.json`, then rerun `npm install`.
* **`npm run dev` doesn’t start:** check whether port 3000 is occupied with `lsof -i :3000` and kill the blocking process.
* **TypeScript errors about `expiration`:** make sure every place that reads `ProductData` imports the updated type and handles the new field.
* **Git merge conflicts:** stash your work with `git stash`, run `git pull --rebase upstream/main`, then `git stash pop` and resolve conflicts before committing.
* **Need to reset:** `git checkout -- <file>` discards local changes in a file if you want to start over.

Take your time, commit frequently, and lean on the existing helper utilities (`PostListing`, `deleteEvent`, `parseTags`) instead of writing everything from scratch. By following this guide, you will implement NIP-40 in a way that keeps Shopstr’s marketplace fresh and trustworthy.
