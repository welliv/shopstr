# Forking Shopstr and Testing NIP-40 Changes Locally

This walkthrough assumes you're using an Ubuntu-based environment with Node.js already installed (see the main README for Node/NPM requirements).

## 1. Fork the Repository on GitHub
1. Navigate to the [Shopstr repository](https://github.com/). Click **Fork** and create your copy under your GitHub account.
2. Decide whether you want to fork the `main` branch or a specific pull request branch. For the NIP-40 work, choose the branch that contains the proposed changes.

## 2. Clone Your Fork
```bash
# Replace <your-username> with your GitHub handle
# Replace <branch-name> with the branch you want to test (e.g. nip-40-expiration)
git clone https://github.com/<your-username>/shopstr.git
cd shopstr
git fetch origin <branch-name>
git checkout <branch-name>
```

If you forked an existing pull request and want to keep tracking updates from the original repository, add an `upstream` remote:
```bash
git remote add upstream https://github.com/supertestnet/shopstr.git
git fetch upstream
```

### Cloning the upstream PR directly (without forking)

If you just want to review the PR from this repository without creating your own fork, you can fetch the branch straight from the upstream project. Replace `<pr-number>` with the numeric ID of the PR you want to test (for example, `123`).

```bash
git clone https://github.com/supertestnet/shopstr.git
cd shopstr
git fetch origin pull/<pr-number>/head:nip40-pr
git checkout nip40-pr
```

> 💡 Tip: If you have the GitHub CLI installed, you can run `gh pr checkout <pr-number>` from inside the cloned repository to achieve the same result.

## 3. Install Dependencies
```bash
npm install
```

## 4. Configure Environment Variables (Optional)
If the project requires environment variables, copy the example file and fill in the values you need:
```bash
cp .env.example .env.local
# Edit .env.local with your editor of choice
```

## 5. Run the Test Suite
Execute the unit and integration tests (including the NIP-40 checks) with:
```bash
npm test
```

If you only want to run tests that mention "expiration" or "NIP-40":
```bash
npm test -- expiration
```

To focus on the fetch service behaviour that enforces NIP-40, run the targeted suite:
```bash
npm test -- --runTestsByPath utils/nostr/__tests__/fetch-service.test.ts
```

You should see the assertions confirming that expired listings are filtered out of public views while remaining available to their owners.

## 6. Launch the Development Server (Optional)
To see the UI in action:
```bash
npm run dev
```
Then open `http://localhost:3000` in your browser.

## 7. Keep Your Fork Up to Date
To pull in new changes from the upstream project:
```bash
git checkout <branch-name>
git fetch upstream
git merge upstream/<branch-name>
# or rebase:
# git rebase upstream/<branch-name>
```

## 8. Run Tests Again After Updates
After merging or rebasing, rerun:
```bash
npm test
```

If you picked up the PR branch directly from the upstream project, repeat the `git fetch origin pull/<pr-number>/head:nip40-pr` command before rerunning the tests so you are exercising the most recent code.

## 9. Push Any Local Fixes Back to Your Fork
```bash
git push origin <branch-name>
```

## 10. Share Feedback on the Pull Request
Once you are satisfied with the test results, leave a review or comment on the original PR to report what you found.

---

### Troubleshooting
- **Missing dependencies:** Re-run `npm install` and check `package.json` for required versions.
- **Node version mismatch:** Ensure the version matches the `engines` field in `package.json`. Tools like `nvm` can help switch versions.
- **Permission errors:** Prefix commands with `sudo` only if absolutely necessary; usually, fixing ownership with `chown` is better.
- **Slow install or test runs:** Clear `node_modules` and reinstall (`rm -rf node_modules && npm install`).

Following these steps will let you fork the PR locally, keep it synced with the upstream repo, and validate the NIP-40 functionality with `npm test`.
