# GrantFox Analytics

Public payments analytics site for GrantFox. Shows every payment released to
open-source contributors and project maintainers, broken down by project and
filterable by campaign.

## What it shows

- **Total distributed** — lifetime released amount, split between contributors
  and maintainers.
- **Contributor payments** — GitHub handle, project, and amount for every
  released payment. Searchable and ordered by newest escrow first.
- **Maintainer payments** — released and funded amounts per project escrow, with
  a link to the escrow on the
  [Trustless Work viewer](https://viewer.trustlesswork.com).
- **Campaign filter** — every panel narrows to a single campaign via
  `?campaign=<name>`, so any filtered view is a shareable URL. Applied in the
  browser: the page is rendered once with every campaign's data, because reading
  the query string on the server would cost a render per visitor. See
  [Performance](#performance).

## What it deliberately does not show

Public identity is limited to what is already public on a GitHub profile: handle
and avatar.

Never published: wallet addresses, emails, or payment dates. Only milestones the
chain reports as released appear — pending and rejected ones are excluded.

Payment lists use the escrow indexer's `createdAt desc` order. Trustless Work
does not return a release timestamp per milestone, so contributor payments in
the same escrow retain their milestone order rather than claiming a more precise
payment chronology than the source provides.

Verification is escrow-level, not payment-level: GrantFox stores no per-payment
transaction hash, so the viewer link shows the escrow, not an individual payout.

## Stack

Next.js 16 (App Router, RSC) · React 19 · TypeScript · Tailwind v4 · shadcn/ui
(`radix-nova`). The brand system — tokens, fonts, logos — is copied from
[GrantFox-UX](https://github.com/GrantChain/GrantFox-UX) so this site matches the
rest of the product. Tailwind v4 here is CSS-first: tokens live in
`src/app/globals.css`, and there is no `tailwind.config`.

## Getting started

```bash
npm install
cp .env.example .env.local   # Trustless Work key + platform address
npm run dev                  # http://localhost:3005
```

## Data source

Trustless Work, exclusively. No GrantFox database is read.

| Provides | How |
| --- | --- |
| which escrows exist | `get-escrows-by-role` for the platform wallet |
| amounts, released state | the escrow's own milestones |
| project, campaign | parsed from the escrow title `"{campaign} - {project}"` |
| contributor handles | the milestone's PR link, resolved to its GitHub author |

**Amounts come from the escrow, never from GrantFox's records.** GrantFox stores
the amount a contributor *requested*, and that figure is frequently revised
downward before release — publishing it overstates what was actually distributed.
A payment is counted only when the chain reports `flags.released`.

**Contributor identity.** Trustless Work's only person-identifier is a Stellar
address, which this site never publishes. Milestones do carry the PR link, and a
PR's author is public, so handles come from GitHub instead. Attribution runs
under a hard time budget: whatever resolves gets a name, the rest render as
"Unattributed" with the amount intact, and the count is shown. Money figures never
depend on GitHub. Distinct-contributor counts use the payee address (never
published), so they stay correct even when attribution is incomplete.

### Known limits, surfaced rather than hidden

- **Enumeration may under-report.** Escrows are listed via the roles the platform
  wallet holds. GrantFox allows a per-escrow platform-wallet override, so an
  escrow created under a different address is invisible here.
- **Trustless Work holds records that are not GrantFox OSS rewards** — test
  escrows and another GrantFox product's bounties. They are classified from the
  escrow description, excluded, and the excluded count is displayed on the page.
- **Maintainer handles are unavailable.** Maintainer escrows identify people only
  by wallet address, so amounts are shown per project with no names.
- **Attribution is rebuilt wholesale, not incrementally.** Handles are stored in
  the snapshot rather than cached per pull request, so every rebuild re-resolves
  the entire history: ~1,600 requests against a 5,000/hour quota, paced to about
  fifteen a second. That is affordable once a day and once a deploy, and it is the
  thing to change first if payment volume ever approaches the quota — at which
  point the map belongs in a store the cron writes to directly. See
  `src/features/payments/server/snapshot.ts`.
- **A build inherits whatever the quota allows.** The page is prerendered at build
  time, so deploying while the hourly quota is spent bakes in a page full of
  "Unattributed" until the next refresh. Amounts are unaffected. `POST
  /api/revalidate` fixes it without redeploying.
- **A refresh fails closed.** Before reading or invalidating the current page,
  the refresh checks that GitHub has a conservative 2,000-request allowance plus
  retry headroom. Reading the snapshot to calculate the exact requirement would
  itself rebuild it on a fresh deployment, causing two full GitHub passes. A pass
  that exhausts quota, overruns its budget, reaches its lookup cap, or resolves
  less than 90% returns 503 and is not warmed into the static page.

## Performance

`pageSize` on the role listing is undocumented but accepted and dominates cost:
the default 8 per page needs ~108 requests at ~3s each, while 100 per page needs
9. Measured against 856 live escrows — **148s at the default, 19s at 100**.

The listing already returns complete milestones (amount, flags, receiver,
description), identical to `get-escrow-by-contract-ids`, so there is no second
round of detail lookups.

Everything is held in one Data Cache entry, for seven days, deliberately far
longer than the daily refresh: if the cache expired on its own, whichever visitor
arrived first would pay for the rebuild. The Data Cache is shared across
serverless instances — an in-process cache would let every cold instance re-spend
Trustless Work's rate limit, which is shared with the GrantFox payout worker.

**The page is static.** Nothing in the render reads the request, so it is
prerendered and served as a file, and the refresh happens on a schedule with
nobody waiting. Reintroducing a request-time input anywhere in that tree — a
search param, a header, a cookie — silently converts the page back to rendering
per visitor:

| | TTFB |
| --- | --- |
| static (current) | served from cache, no render |
| rendered per visitor, warm cache | **~46s**, measured on the deployed site |
| cold rebuild (~850 escrows + ~1,600 handles) | minutes |

That 46s is worth understanding, because it is the failure this design exists to
prevent and nothing about it looks slow in the code. The data was cached and the
render still cost 46s: handles were cached per pull request, so assembling them
meant ~1,600 individual reads of a network-backed cache, which exhausted a 45s
budget and *still* returned incomplete. One entry per page, rebuilt on a schedule,
is what makes a render a single read.

Refreshing is `/api/cron`, daily at 04:00 UTC. It checks GitHub quota without
reading the snapshot, purges the cache tags only when a full pass is possible,
rebuilds the snapshot once, and schedules the page warm after the response has
committed the new cache entry. Starting that warm inline races the commit and
performs a second GitHub pass. The response
reports `refresh_ms`, `warm_scheduled`, attribution stats, and the quota observed
before the pass; the post-response warm reports `warm_ms` in the runtime logs.

To publish immediately rather than waiting for 04:00:

```bash
curl -X POST https://<host>/api/revalidate \
  -H "authorization: Bearer $REVALIDATE_SECRET"
```

That requires `REVALIDATE_SECRET`; without it the route refuses every request
rather than defaulting open, since an unauthenticated purge is a free way to force
load onto Trustless Work.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | dev server on port 3005 |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm run check-types` | `tsc --noEmit` |
