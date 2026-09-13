# Prevu — Social Media Preview Platform (MVP)

A browser-based social-media preview and collaborative review platform, implemented from the
approved PRD v1.1, SRS v1.0, Architecture v1.1, UI/UX v1.0 and Development Document v1.0.

Upload an image creative, inspect it inside **simulated** YouTube, Instagram, Facebook, TikTok and
LinkedIn contexts on desktop and mobile presentations, compare creative variants, save projects, and
share a time-limited review link — reviewers comment **without an account**.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

No external services or credentials are required — see [Data layer](#data-layer) below.

## Feature map (document → implementation)

| Document requirement | Where it lives |
| --- | --- |
| Project CRUD, save/reopen (PRJ-001..007) | `lib/db.ts`, `app/api/projects/**`, `app/page.tsx` |
| Anonymous owner session, no accounts (ADR-006) | `lib/auth.ts`, `app/api/session/route.ts` (HttpOnly cookie) |
| Image-only upload, type/size validation, magic-byte sniff (IMG-001..008) | `app/api/projects/[projectId]/variants/route.ts`, `lib/images.ts`, `lib/validation.ts` |
| Multiple variants; active variant; rename/replace/remove (VAR-001..006) | `app/api/variants/[variantId]/**`, left rail in `components/Workspace.tsx` |
| Dedicated platform pages ×5 (NAV-001..005) | `app/project/[projectId]/[platform]/page.tsx` |
| Desktop/mobile distinct contexts; TikTok mobile-first (NAV-007..009) | `components/previews/*`, `PhoneFrame` |
| Fit/crop rule, zoom, reset, presentation mode (PRE-001..004) | stage toolbar in `components/Workspace.tsx` |
| Share links, 24h default, manual expiry, revoke, fail-closed (SHR-001..010) | `app/api/projects/[projectId]/shares/route.ts`, `app/api/shares/[shareId]/revoke/route.ts`, `app/share/[token]/page.tsx` |
| High-entropy tokens, hashed at rest (SEC-001..004) | `lib/tokens.ts`, `lib/share-access.ts` |
| Guest comments with display name, validation, throttle (COM-001..008) | `app/api/shares/token/[token]/comments/route.ts`, `components/Comments.tsx` |
| Palette/type/spacing tokens, states, responsive breakpoints (UI/UX §19–§23) | `app/globals.css` |
| API envelope `{ success, data, error }` (Dev Doc §4.2) | `lib/api-helpers.ts` |

## Data layer

The Architecture document prescribes **MongoDB Atlas** (application data) + **Cloudinary** (image
binaries). Both require external credentials, so this implementation ships with an equivalent local
persistence layer that follows the same boundaries:

- `lib/db.ts` — the same collections (`sessions`, `projects`, `variants`, `assets`, `shares`,
  `comments`) and relationships as Architecture §9, persisted to `data/db.json` (git-ignored).
  All repository functions are the only touchpoint with persistence, so swapping in Mongoose
  models later does not change the API contract or the UI.
- Image binaries stay out of the application store (Architecture §8): files live under
  `data/uploads/`, referenced by unguessable asset IDs, served from
  `GET /api/assets/[assetId]` with immutable cache headers.
- Share tokens are cryptographically random; only a keyed hash is stored (Architecture §10.1).
  Expiry and revocation are enforced server-side on every access (TTL-style cleanup is not the
  security mechanism).

`SESSION_SECRET` / `SHARE_TOKEN_SECRET` / `APP_ORIGIN` / `SMP_DATA_DIR` environment variables are
optional (see `.env.example`).

## Routes

- `/` — opens the workspace directly (no landing page): ensures an owner session, opens the most recent project (auto-creates "Untitled project" on first visit)
- `/project/[projectId]/[platform]` — workspace (`youtube`, `instagram`, `facebook`, `tiktok`, `linkedin`); `?device=mobile|desktop&context=<placement>` deep-links a state
- `/share/[token]` — public review page (anonymous; active/expired/revoked states fail closed)
- `/api/health` — service readiness (Dev Doc §3.2)

Project switching lives in the top-bar dropdown (with "New project"); renaming is inline in the
top bar. **Brand identity** (logo, banner, display name, handle, tagline) is edited via the
Brand button and used by every platform mockup — without uploads, a generated initial avatar and
branded banner composition are rendered.

## Platform preview contexts

| Platform | Placements | Devices |
| --- | --- | --- |
| YouTube | Watch feed · Search results · Channel page (branded banner + logo + dummy video grid) | Desktop + mobile app shell |
| Instagram | Feed post (multiple posts) · Profile grid (avatar, stats, highlights, pinned creative) | Desktop + mobile app shell |
| Facebook | Feed post (multiple posts) · Page + feed (cover, round logo, tabs, composer) | Desktop + mobile app shell |
| TikTok | For You feed (9:16 still) · Profile grid (stats + video tiles) | Desktop web shell + mobile app shell |
| LinkedIn | Feed post (multiple posts) · Page + feed (banner, square logo, tabs) | Desktop + mobile app shell |

Placement (`context`) and YouTube theme (`dark`/`light`) are part of the share-link snapshot.

## Platform previews are simulations

The preview shells are recognizable, clearly-labeled simulations ("Simulated preview" badge on
every stage). They intentionally do not reproduce live platform UI pixel-for-pixel and never call
platform APIs (PRD §9.3, SRS §5.2).

## Scripts

- `npm run dev` — develop on <http://localhost:3000>
- `npm run build` / `npm start` — production build & serve
- `npm run lint` — ESLint (install with `npm i -D eslint eslint-config-next` if needed)
