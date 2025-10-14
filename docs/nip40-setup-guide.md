# Shopstr NIP-40 Beginner Playbook

> **Goal:** Help a brand-new contributor implement [NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md) expiration support in their own Shopstr fork. The steps below spell out everything from forking the repo on Ubuntu to touching the exact TypeScript files that must change. Work through the sections in order and check items off as you go.

---

## 0. TL;DR Checklist

| ✅ Step | What you will accomplish |
| --- | --- |
| 1 | Fork Shopstr on GitHub and clone it locally |
| 2 | Install Git, Node.js 18, npm, and (optionally) VS Code on Ubuntu |
| 3 | Run Shopstr locally with `npm run dev` so you can see your changes |
| 4 | Create a feature branch called `feature/nip40-expiration` |
| 5 | Update the listing data model to include an `expiration` timestamp |
| 6 | Add the NIP-40 `expiration` tag when posting new listings |
| 7 | Hide expired listings everywhere they are rendered in the UI |
| 8 | Add a "Renew" workflow so sellers can repost expired listings |
| 9 | Add automated tests and perform manual QA |
| 10 | Commit, push, and open your pull request |

> **Tip:** Keep this guide open in a second terminal (e.g., `less docs/nip40-setup-guide.md`) so you can scroll as you work.

---

## 1. Forking & Cloning Shopstr

1. Sign in to your GitHub account in a browser. Visit the public Shopstr repository (`https://github.com/<original-owner>/shopstr`). Click **Fork** in the top-right corner.
2. On Ubuntu, make sure Git is installed:
   ```bash
   sudo apt update
   sudo apt install -y git
   ```
3. Clone **your** fork onto the VM (replace `<your-username>`):
   ```bash
   cd ~
   git clone https://github.com/<your-username>/shopstr.git
   cd shopstr
   ```
4. Add the upstream remote so you can pull changes from the original project:
   ```bash
   git remote add upstream https://github.com/<original-owner>/shopstr.git
   git remote -v
   ```
5. Whenever you need the latest upstream changes, run:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main   # or: git rebase upstream/main
   ```

---

## 2. Ubuntu Environment Setup

1. **Node.js & npm:** Shopstr targets Node 18 LTS.
   ```bash
   sudo apt install -y curl
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version   # should print v18.x.x
   npm --version
   ```
2. **VS Code (optional but friendly for beginners):**
   ```bash
   sudo snap install code --classic
   ```
   If you prefer the terminal, editors such as `nano` and `vim` are already available.
3. **Install dependencies:** run this once inside the repo folder:
   ```bash
   npm install
   ```
4. **Launch the dev server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` from a browser on the host machine (or use VS Code's built-in preview if you're working entirely inside the VM).

---

## 3. Understand the Code Layout

Knowing where things live makes the NIP-40 work much easier:

| Folder / File | Why it matters for NIP-40 |
| --- | --- |
| `components/product-form.tsx` | Builds the tag list when a seller posts a new listing. We'll inject the `expiration` tag here. |
| `utils/nostr/nostr-helper-functions.ts` | The `PostListing` helper finalizes and signs the `kind: 30402` event—another good place to double-check the expiration logic. |
| `utils/parsers/product-parser-functions.ts` | Converts raw Nostr events into the `ProductData` object we use everywhere in the UI. We will add new fields for expiration and computed helpers. |
| `utils/nostr/fetch-service.ts` | Fetches listings from relays. We will ignore expired events here so stale posts never enter the app state. |
| `components/display-products.tsx` and `pages/index.tsx` | Render the main marketplace feed. We'll ensure they filter out expired listings and show “Renew” options where appropriate. |
| `components/my-listings/*` | Seller dashboard. We'll surface renewal controls for expired listings here. |
| `components/__tests__` & `utils/__tests__` | Where you will add Jest tests to cover expiration calculations. |

> **Navigation tip:** Use `rg` (ripgrep) to search files quickly: `rg "expiration"`.

---

## 4. Create Your Working Branch

Always work on a feature branch instead of `main`:
```bash
git checkout -b feature/nip40-expiration
```

If you stop work and come back later, resume with:
```bash
git checkout feature/nip40-expiration
```

---

## 5. Implementing NIP-40 Step by Step

### 5.1. Add expiration fields to `ProductData`

1. Open `utils/parsers/product-parser-functions.ts` in your editor.
2. In the `ProductData` type definition (near the top of the file), add:
   ```ts
   expiration?: number;
   isExpired?: boolean;
   secondsUntilExpiration?: number;
   ```
   These properties make it easy to show expiration status in the UI.
3. Scroll down to the big `switch` inside `parseTags`. Add a new case:
   ```ts
   case "expiration":
     parsedData.expiration = Number(values[0]);
     break;
   ```
4. After the `tags.forEach` loop (right before `parsedData.totalCost = ...`), compute helper flags:
   ```ts
   const now = Math.floor(Date.now() / 1000);
   if (parsedData.expiration) {
     parsedData.isExpired = parsedData.expiration <= now;
     parsedData.secondsUntilExpiration = parsedData.expiration - now;
   } else {
     parsedData.isExpired = false;
     parsedData.secondsUntilExpiration = undefined;
   }
   ```
5. Save the file.

### 5.2. Attach the `expiration` tag when posting listings

You need to add the expiration tag in **two** places so the value is present in the form submission and in the finalized Nostr event.

1. **In the product form:** edit `components/product-form.tsx`.
   - Find the `const tags: ProductFormValues = [` block inside the `onSubmit` handler (around line 120).
   - After computing `const tags` and before optional tags are appended, add:
     ```ts
     const createdAt = Math.floor(Date.now() / 1000);
     const FOURTEEN_DAYS_IN_SECONDS = 14 * 24 * 60 * 60;
     const expiration = createdAt + FOURTEEN_DAYS_IN_SECONDS;

     tags.push(["published_at", String(createdAt)]);
     tags.push(["expiration", String(expiration)]);
     ```
   - Remove the existing line in `PostListing` that adds `published_at` so you do not duplicate the tag (you'll do this in the next step).

2. **In the posting helper:** edit `utils/nostr/nostr-helper-functions.ts`.
   - Inside the `PostListing` function, replace:
     ```ts
     const created_at = Math.floor(Date.now() / 1000);
     const updatedValues = [...values, ["published_at", String(created_at)]];
     ```
     with logic that trusts the incoming tags and ensures `expiration` exists:
     ```ts
     const created_at = Math.floor(Date.now() / 1000);
     const FOURTEEN_DAYS_IN_SECONDS = 14 * 24 * 60 * 60;
     const expirationTagIndex = values.findIndex(([key]) => key === "expiration");
     const updatedValues = [...values];

     if (expirationTagIndex === -1) {
       updatedValues.push(["expiration", String(created_at + FOURTEEN_DAYS_IN_SECONDS)]);
     }

     if (!updatedValues.some(([key]) => key === "published_at")) {
       updatedValues.push(["published_at", String(created_at)]);
     }
     ```
   - This safeguards older clients that might call `PostListing` without the new tag.

3. Confirm the final `event` object uses `updatedValues` (it already does).

### 5.3. Filter expired listings at the data source

1. Open `utils/nostr/fetch-service.ts`.
2. Inside `fetchAllPosts`, after `const fetchedEvents = await nostr.fetch...`, add a helper to skip expired records:
   ```ts
   const now = Math.floor(Date.now() / 1000);
   const eventHasExpired = (event: NostrEvent) => {
     const expirationTag = event.tags.find((tag) => tag[0] === "expiration");
     if (!expirationTag) return false; // allow legacy listings
     const expirationTimestamp = Number(expirationTag[1]);
     return !Number.isNaN(expirationTimestamp) && expirationTimestamp <= now;
   };
   ```
3. Before pushing each event into `productArrayFromRelay`, skip it if expired:
   ```ts
   if (eventHasExpired(event)) {
     continue;
   }
   ```
4. Repeat the check in any other fetchers that gather listings (search this file for other references to `30402` and guard them similarly, for example inside the cart logic so that carts automatically drop expired products).

### 5.4. Filter expired listings in the UI (defense in depth)

1. In `components/display-products.tsx`, after `const parsedData = parseTags(event);`, add:
   ```ts
   if (parsedData?.isExpired) return;
   ```
   so expired entries never reach the marketplace grid.
2. In the filter block (inside the `useEffect` that sets `filteredProducts`), add a guard:
   ```ts
   if (product.isExpired) return false;
   ```
3. Update `pages/index.tsx` as well because it pre-parses events when building the home page feed. After parsing each product, skip expired ones.
4. Review other components listed by `rg "isExpired"` once you add the property to ensure nothing else needs adjustment.

### 5.5. Show status + renew option in "My Listings"

1. Open `components/display-product-modal.tsx` and `components/utility-components/product-card.tsx` to display a badge or message when `productData.isExpired` is true. A simple example:
   ```tsx
   {productData.isExpired && (
     <span className="text-sm font-semibold text-red-500">Expired – renew to relist</span>
   )}
   ```
2. In `components/my-listings/my-listings.tsx`, add a "Renew" button next to listings owned by the seller. The button should call a new helper that:
   - Calls `ProductForm` with the listing's existing data (`oldValues`) so fields are pre-filled.
   - When submitted, `PostListing` will create a brand-new event with fresh `created_at` and `expiration` tags.
   - Optionally, archive the old event by changing its `status` tag to `archived`.
3. Suggested implementation pattern:
   ```tsx
   const handleRenew = (product: ProductData) => {
     setFocusedProduct(product);
     setShowModal(true); // ProductForm already knows how to copy old values
   };
   ```
   Then wire the handler into your listing card.

### 5.6. Optional: expose expiration metadata to the seller

- Show the exact expiration date in `ProductForm` or `My Listings` using `new Date(productData.expiration * 1000).toLocaleString()`.
- Provide a countdown using `productData.secondsUntilExpiration`.

---

## 6. Automated Tests

Add Jest coverage so reviewers can trust the new logic.

1. **Parser test:** create `utils/parsers/__tests__/product-parser-functions.test.ts` (make the folder if needed) and add tests that:
   - Feed a fake event with an `expiration` tag into `parseTags`.
   - Assert `isExpired` is true when the timestamp is in the past and false otherwise.
2. **Fetch service test:** if the project has mocks for the fetch service, add a test that verifies expired events are skipped. Otherwise, write a small unit test for your new `eventHasExpired` helper (export it for testing if necessary).
3. Run the test suite:
   ```bash
   npm test
   ```
4. Run lint to keep formatting consistent:
   ```bash
   npm run lint
   ```

---

## 7. Manual QA

1. Start the dev server (`npm run dev`).
2. Create a new listing through the UI. Use the browser devtools to confirm the event includes `"expiration"`.
3. Temporarily change the expiration calculation to `createdAt + 60` (one minute) to verify the listing disappears after the timer expires. Change it back afterward.
4. Open the My Listings page and confirm expired items show the Renew button.
5. Click Renew and ensure a fresh listing appears with a new expiration.
6. Check that expired items no longer appear on the public marketplace or in search results.

---

## 8. Commit & Publish Your Work

1. Review your changes:
   ```bash
   git status
   git diff
   ```
2. Stage everything and create a descriptive commit:
   ```bash
   git add .
   git commit -m "Add NIP-40 expiration support to listings"
   ```
3. Push the branch to your fork:
   ```bash
   git push origin feature/nip40-expiration
   ```
4. Open a pull request on GitHub targeting `main` on the upstream repo. Include:
   - A summary of the changes.
   - Screenshots or gifs if you touched the UI.
   - Test commands you ran.

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm install` fails with permission errors | Delete `node_modules` and `package-lock.json`, then rerun `npm install`. |
| Dev server stuck on port 3000 | Stop other processes with `sudo lsof -i :3000` then `sudo kill <pid>`. |
| Jest runs out of memory | Use `npm test -- --runInBand` to run tests serially. |
| Nostr relays show stale data | Clear the IndexedDB/LocalStorage in your browser, then refresh. |
| Typescript errors after editing | Run `npm run lint` to get detailed messages and fix them. |

---

## 10. Celebrate 🎉

By following these steps you:
- Implemented NIP-40-compliant expiration tags on new listings.
- Prevented expired listings from appearing to shoppers.
- Gave sellers an easy way to renew their posts.
- Added tests and documentation so future contributors understand the feature.

Keep iterating! Once this lands, you can extend the feature to allow custom expiration durations or email reminders before a listing lapses.
