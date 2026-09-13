# Preview Lab — Social Media Preview Platform (MVP)

A browser-based social-media preview and collaborative review platform, implemented from the
approved PRD v1.1, SRS v1.0, Architecture v1.1, UI/UX v1.0 and Development Document v1.0.

Upload an image creative, inspect it inside **simulated** YouTube, Instagram, Facebook, TikTok and
LinkedIn contexts on desktop and mobile presentations, compare creative variants, save projects, and
share a time-limited review link — reviewers comment **without an account**.

## Quick start

```bash
cd backend
copy .env.example .env
# Set MONGODB_URI and use STORAGE_DRIVER=local for development
npm install
npm run dev        # http://localhost:4000

# In another terminal
cd ..
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
cd frontend
npm run build
npm start
```

The backend uses MongoDB for metadata and supports Cloudinary in production or local disk storage
for development. See `backend/.env.example` for server configuration.

## Feature map (document → implementation)

| Document requirement                                                        | Where it lives                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Project CRUD, save/reopen (PRJ-001..007)                                    | `backend/src/services/project.service.ts`, `frontend/app/page.tsx`                          |
| Anonymous owner session, no accounts (ADR-006)                              | `backend/src/middleware/session.middleware.ts` (HttpOnly cookie)                            |
| Image-only upload, type/size validation, magic-byte sniff (IMG-001..008)    | `backend/src/middleware/upload.middleware.ts`, `backend/src/services/cloudinary.service.ts` |
| Multiple variants; active variant; rename/replace/remove (VAR-001..006)     | left rail in `frontend/components/Workspace.tsx`                                            |
| Dedicated platform pages ×5 (NAV-001..005)                                  | `frontend/app/project/[projectId]/[platform]/page.tsx`                                      |
| Desktop/mobile distinct contexts; TikTok mobile-first (NAV-007..009)        | `frontend/components/previews/*`, `PhoneFrame`                                              |
| Fit/crop rule, zoom, reset, presentation mode (PRE-001..004)                | stage toolbar in `frontend/components/Workspace.tsx`                                        |
| Share links, 24h default, manual expiry, revoke, fail-closed (SHR-001..010) | `backend/src/services/share.service.ts`, `frontend/app/share/[token]/page.tsx`              |
| High-entropy tokens, hashed at rest (SEC-001..004)                          | `backend/src/utils/token.ts`, `backend/src/services/share.service.ts`                       |
| Guest comments with display name, validation, throttle (COM-001..008)       | `backend/src/services/share.service.ts`, `frontend/components/Comments.tsx`                 |
| Palette/type/spacing tokens, states, responsive breakpoints (UI/UX §19–§23) | `frontend/app/globals.css`                                                                  |
| API envelope `{ success, data, error }` (Dev Doc §4.2)                      | `backend/src/middleware/error.middleware.ts`                                                |

## Data layer

The independent Express API in `backend/` owns routes, validation, services, Mongoose models and
storage. The Next.js frontend calls it through native `fetch`; local development can use
`STORAGE_DRIVER=local`, while production can use Cloudinary. Share tokens are cryptographically
random and only keyed hashes are stored. Expiry and revocation are enforced on every access.

## Routes

- `/` — opens the workspace directly (no landing page): ensures an owner session, opens the most recent project, or routes first-time visitors through the 3-step **create wizard** (`/start`: name → upload first creative → pick a starting platform)
- `/project/[projectId]/[platform]` — workspace (`youtube`, `instagram`, `facebook`, `tiktok`, `linkedin`); `?device=mobile|desktop&context=<placement>` deep-links a state
- `/project/[projectId]/overview` — **All Platforms** contact sheet: the active creative rendered in every platform context (scaled cards with ratio badges)
- `/project/[projectId]/compare?left=instagram&right=facebook` — **Compare Platforms**: two selectable platform contexts side by side
- `/share/[token]` — public review page (anonymous; active/expired/revoked states fail closed)
- `http://localhost:4000/api/health` — backend service readiness (Dev Doc §3.2)

Project switching lives in the top-bar dropdown; renaming is inline in the top bar. **Brand
identity** (logo, banner, display name, handle, tagline) is edited via the Brand button and used
by every platform mockup. **Uploads** run through a modal with drag & drop, live progress
percentage and cancel (XHR-based, abort-safe — no partial variants). **Crop adjustment** (crop
icon in the stage toolbar) opens a right-hand panel with X/Y position and scale per platform,
previewed live and persisted per variant (`PATCH /api/variants/:id { adjustments }`).

## Platform preview contexts

| Platform  | Placements                                                                             | Devices                              |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| YouTube   | Watch feed · Search results · Channel page (branded banner + logo + dummy video grid)  | Desktop + mobile app shell           |
| Instagram | Feed post (multiple posts) · Profile grid (avatar, stats, highlights, pinned creative) | Desktop + mobile app shell           |
| Facebook  | Feed post (multiple posts) · Page + feed (cover, round logo, tabs, composer)           | Desktop + mobile app shell           |
| TikTok    | For You feed (9:16 still) · Profile grid (stats + video tiles)                         | Desktop web shell + mobile app shell |
| LinkedIn  | Feed post (multiple posts) · Page + feed (banner, square logo, tabs)                   | Desktop + mobile app shell           |

Placement (`context`) and YouTube theme (`dark`/`light`) are part of the share-link snapshot.

## Platform previews are simulations

The preview shells are recognizable, clearly-labeled simulations ("Simulated preview" badge on
every stage). They intentionally do not reproduce live platform UI pixel-for-pixel and never call
platform APIs (PRD §9.3, SRS §5.2).

## Scripts

- `cd frontend; npm run dev` — develop on <http://localhost:3000>
- `cd frontend; npm run build; npm start` — production build & serve
- `cd frontend; npm run lint` — ESLint
