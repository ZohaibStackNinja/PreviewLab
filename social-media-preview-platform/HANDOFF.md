# HANDOFF — Preview Lab (Social Media Preview Platform)

> **Purpose:** Complete context handoff so any AI tool or developer can continue from the current state without re-explaining the project. Read this top to bottom; it replaces all prior conversation history.
>
> **Last updated:** 2026-09-14 — frontend and backend migration implemented; static, API, and browser E2E gates pass (§6.2).

---

## 1. What this project is

**Preview Lab** — a web app where designers/marketers upload an image creative and preview it inside **simulated** social-media contexts (YouTube, Instagram, Facebook, TikTok, LinkedIn; desktop + mobile), with brand identity (logo/banner/handle), multiple creative variants, per-platform crop adjustment, time-limited anonymous share links (24h default), and guest comments. No user accounts — anonymous owner session cookie (HttpOnly).

Built from 5 spec documents (PRD v1.1, SRS v1.0, Architecture v1.1, UI/UX v1.0, Development Doc v1.0, all dated 12 Sep 2026). Extracted doc text lives in `../docs_extracted/*.md`. The app follows those specs (requirement IDs like SHR-002 are quoted in code comments).

**Design references:** user-supplied Practiscale screenshots in `../design_reference/` — features were adopted, their visual design deliberately NOT copied. App uses its own teal design system (#0ABAB5 primary, tokens in `app/globals.css`, from UI/UX doc §21–23).

**Platform simulations use fake brands** (PrevTube/Prevgram/PrevBook/PrevLink) with "Simulated preview" badges — never official logos, never pixel-perfect clones.

## 2. Repository layout

```
C:\Users\user\Desktop\Platform Review\
├─ docs_extracted\            # the 5 spec docs as markdown
├─ design_reference\          # user's reference screenshots (features only)
└─ social-media-preview-platform\   # ← the app (this repo root)
   ├─ frontend\               # Next.js 14.2.15 frontend and its tooling
   │  ├─ app\                 # App Router pages and design system
   │  ├─ page.tsx             # / → bootstrap: opens latest project or routes to /start
   │  ├─ start\page.tsx       # 3-step create wizard (name → upload → platform)
   │  ├─ project\[projectId]\[platform]\page.tsx   # workspace (5 platform routes)
   │  ├─ project\[projectId]\overview\page.tsx     # all-platforms contact sheet
   │  ├─ project\[projectId]\compare\page.tsx      # side-by-side (?left=&right=)
   │  ├─ share\[token]\page.tsx                    # public review page
   │  ├─ api\**\route.ts      # ⚠️ OLD Next API routes — TO BE DELETED (see §6)
   │  └─ globals.css          # entire design system (~4500 lines, hand-written CSS)
   │  ├─ components\          # Workspace, ShareModal, BrandModal, UploadModal,
   │                          # ConfirmDialog, Dropzone, Comments, OverviewGrid,
   │                          # CompareView, icons.tsx (inline SVG set)
   │  ├─ components\previews\ # PreviewRenderer + platform preview shells
   │                          # TikTok/LinkedIn + shared.tsx (BrandAvatar, BrandBanner,
   │                          # DummyTile, creativeImgStyle, dummy content data)
   │  ├─ lib\                  # types.ts, platforms.ts, client.ts, server-api.ts
   │                          # (fetch wrapper + postFormWithProgress XHR), format.ts,
   │                          # validation.ts  — ⚠️ db.ts/auth.ts/etc are the OLD
   │                          # server layer, to be deleted with app/api
   │  ├─ scripts\              # make_test_png.py, e2e_verify.py (43 checks),
   │                          # screenshot.mjs (headless CDP driver), regression_upload.mjs
   │  ├─ e2e\                  # Playwright smoke test
   │  └─ package.json           # frontend dependencies and scripts
   └─ backend\                 # independent Express API
```

## 3. Feature inventory (all built & verified on the OLD architecture)

- **Workspace**: top bar (brand, project name inline-rename, project switcher dropdown, save-state indicator, Brand button, Share button) / left rail (Upload, Views, 5 platforms, Placement selector when a platform has multiple contexts, Device toggle, variant cards with overflow menu) / center stage (title+subtitle, theme toggle for YouTube, Crop/Fit fit toggle, zoom, reset, crop-adjust button, presentation mode) / comments rail (hide/show).
- **Platform placements** (lib/platforms.ts `PLATFORMS`): youtube: watch/search/channel (+dark & light themes) · instagram: feed/profile · facebook: feed/page · tiktok: foryou/profile (mobile-first) · linkedin: feed/page. Each = authentic platform structure with dummy content (dummy video grids, dummy posts, etc.), desktop + real mobile app shells in phone frames.
- **Brand identity**: per-project brandName/brandHandle/brandTagline/logo/banner (BrandModal). No uploads → generated initial avatar + synthetic teal banner.
- **Variants**: multi-variant, rename/replace/delete (ConfirmDialog), active variant, per-platform crop adjustments (x/y ±50%, scale 1–2×, persisted on variant, applied via `creativeImgStyle()` object-position+scale).
- **Upload**: modal with Dropzone (drag&drop+browse), XHR progress %, cancel (abort-safe).
- **Sharing**: 24h default expiry, manual expiry presets + custom datetime, revoke, fail-closed expired/revoked/invalid states, share snapshot includes platform+context+device+theme.
- **Comments**: guest (display name), owner can comment too, rate-limited, validation.
- **Pages**: /start wizard, /overview (all platforms grid), /compare (2 platforms side-by-side).
- **Public share page**: anonymous, expiry countdown, no edit controls, simulated disclaimer.

## 4. Architecture (current → target)

**Previous:** Next.js App Router API routes (`app/api/**`) + `lib/db.ts` JSON file store. Removed after migration.

**Current:** independent `backend/` Express + TypeScript + Mongoose (MongoDB Atlas) + Cloudinary + Zod + cors + helmet + dotenv + multer + cookie-parser; Vitest + Supertest tests; ESLint + Prettier; tsx dev. **Frontend remains Next.js 14.2.15/React 18.3.1/TS 5.5.4**, uses native fetch, and has Tailwind, ESLint, Prettier and Playwright tooling installed. Existing hand-written CSS remains authoritative.

**Storage drivers** (backend/src/services/cloudinary.service.ts): `STORAGE_DRIVER=cloudinary` (production) or `local` (dev/demo, same metadata contract — files on disk, served by /api/assets/:id). Local driver exists so the app runs without Cloudinary credentials; MongoDB always stores metadata only.

**Security invariants (do not regress):** session/share tokens are crypto-random, only HMAC hashes stored; expiry/revocation enforced server-side per request; ownership checked via joint queries (record id + sessionId) → foreign and missing both 404 (SEC-008); anonymous public endpoints rate-limited; CORS = frontend origin only with credentials; cookie HttpOnly/SameSite; secrets env-only; uploads magic-byte sniffed; CSP/no-sniff via helmet.

## 5. Backend structure (all written, typecheck PASSES)

```
backend/
├─ src/
│  ├─ server.ts               # main(): configureCloudinary → connectDatabase → listen
│  ├─ app.ts                  # createApp(): helmet → cors(origin allowlist,credentials) →
│  │                          #   json → cookieParser → /api router → 404 → errorHandler
│  ├─ config/env.ts           # zod-validated env (fails fast; PORT, ORIGIN, MONGODB_URI,
│  │                          #   SESSION_SECRET, SHARE_TOKEN_SECRET, STORAGE_DRIVER,
│  │                          #   CLOUDINARY_*, LOCAL_UPLOAD_DIR, COOKIE_*, MAX_UPLOAD_MB)
│  ├─ config/database.ts      # connectDatabase/disconnectDatabase
│  ├─ config/cloudinary.ts    # configureCloudinary() + v2 export
│  ├─ models/                 # Mongoose: Session, Project, Asset, Variant(adjustments Map),
│  │                          #   ShareLink, Comment (+index.ts barrel)
│  ├─ middleware/
│  │  ├─ error.middleware.ts  # ApiError, ok(), errorHandler (envelope + ZodError→400)
│  ├─ session.middleware.ts   # ensureSession(): cookie→hash→lookup or create+set cookie
│  ├─ upload.middleware.ts    # imageUpload (multer memory, size/type limits), sniffImageType
│  └─ validate.middleware.ts  # validate(zodSchema) + asyncHandler
│  ├─ validators/             # common/project/share/variant/comment .validator.ts
│  │                          #   (createShareSchema refines platform+context pair; zod v3)
│  ├─ services/               # project.service (views + CRUD + ownership), brand.service,
│  │                          #   variant.service (upload/replace/adjust/delete/asset),
│  │                          #   share.service (create/list/detail/revoke + public token
│  │                          #   resolve via aggregation pipeline + comments + throttle),
│  │                          #   cloudinary.service (storeImage/deleteImage/readLocalImage)
│  ├─ controllers/index.controller.ts  # thin: session + parse + call service + ok()
│  └─ routes/index.routes.ts  # mirrors old Next API paths 1:1 under /api
├─ tests/                     # setup.ts (env), token.spec.ts, validators.spec.ts,
│                             # api.integration.spec.ts (MongoMemoryServer + Supertest,
│                             # full flow: session→project→upload→adjust→share→comment→
│                             # revoke→expired→unknown-token→cleanup)
├─ .env.example, .eslintrc.json (@typescript-eslint), .prettierrc.json,
├─ vitest.config.ts (forks pool, 60s timeout), tsconfig.json, package.json
```

**API paths (backend, same as frontend expects):**
`GET /api/health` · `POST|GET /api/session` · `GET|POST /api/projects` · `GET|PATCH|DELETE /api/projects/:projectId` · `GET|POST|DELETE /api/projects/:projectId/brand/:kind` (logo|banner) · `POST /api/projects/:projectId/variants` (multipart) · `GET|PATCH|DELETE /api/variants/:variantId` · `POST /api/variants/:variantId/replace` · `GET /api/assets/:assetId` (redirect→CDN or stream local) · `GET|POST /api/projects/:projectId/shares` · `GET /api/shares/:shareId` · `POST /api/shares/:shareId/revoke` · `GET /api/shares/resolved/:token` (public payload) · `GET|POST /api/shares/token/:token/comments` (public). Envelope everywhere: `{success,data,error:{code,message}}`.

**One known deliberate difference:** old Next route `GET /api/shares/:token` → backend uses `GET /api/shares/resolved/:token` for the public payload (avoids ObjectId/:token param collision). Frontend share page fetches must use `/shares/resolved/:token`.

## 6. MIGRATION STATE — continue from here

**User's mandate (verbatim essentials):** install packages AND migrate code (no half-migrations, no unused packages); backend Express/Mongoose/Zod/Cloudinary/cors/helmet/dotenv/Vitest/Supertest/tsx/ESLint/Prettier; frontend keeps Next 14.2.15/React 18.3.1/TS 5.5.4 + add Tailwind/ESLint/Prettier/Playwright; native fetch with `${API_BASE}` (no Axios); route→controller→service→model separation but not excessive; Zod at request boundaries; MongoDB never in route handlers; Cloudinary secret never in frontend; after migration run frontend `npm run lint`+`npm run build`, backend `npm run typecheck`+`lint`+`test`+`build`, then Playwright; delete obsolete deps/regenerate locks; final result must RUN on the new architecture.

### 6.1 DONE — backend (verified 2026-09-14)

- backend/ scaffolded; all deps installed (incl. mongodb-memory-server, @typescript-eslint/* v7, multer, cookie-parser).
- All backend source written (§5). Public share payload endpoint is `GET /api/shares/resolved/:token`.
- **All four gates verified green on 2026-09-14:**
  - `npm run typecheck` → clean (0 errors)
  - `npm run lint` → 0 errors (4 warnings only)
  - `npm run build` → compiles to dist/
  - `npm test` → **31/31 passed** (3 files: token unit, validators, Supertest+MongoMemoryServer integration covering session→project→upload→adjust→share→comment→revoke→expired→unknown-token→cascade-delete)
- `.env.example`, ESLint/Prettier configs, vitest config in place.

### 6.2 DONE — frontend migration to the Express backend

> Frontend migration is implemented. The backend remains complete and verified (31/31 tests); modify it only for bugs proven by a failing test.

**Completed migration:**

1. Frontend tooling is installed and configured; Tailwind preflight is disabled.
2. Old Next API routes, JSON storage, and server-only frontend libraries are removed.
3. Wire the API base:
   - RECOMMENDED: add a rewrite in `next.config.mjs`: `{ source: '/api/:path*', destination: `${process.env.API_URL || 'http://localhost:4000'}/api/:path*' }`. Then `lib/client.ts`keeps its relative`/api/...`paths unchanged and asset`<img src="/api/assets/<id>">`keeps working, with the session cookie staying same-site. In`postFormWithProgress` (XHR) nothing changes under a same-origin rewrite.
   - Server components (workspace `app/project/[projectId]/[platform]/page.tsx`, `overview`, `compare`, `share/[token]`) can no longer import the deleted libs. Create `lib/server-api.ts`: `apiFetch(path, { cookie })` → `fetch(\`${process.env.API_URL || 'http://localhost:4000'}${path}\`, { headers: cookie ? { cookie } : {}, cache: 'no-store' })`, unwrap the `{success,data,error}`envelope, and forward any`set-cookie`from the response so the backend can create the owner session on first visit. Replace`getServerSession()`/`resolveSession()` usage: no cookie → the bootstrap page (`/`) just POSTs `/api/session` client-side as it already does.
   - Share page `app/share/[token]/page.tsx`: call `GET /api/shares/resolved/:token` server-side via `lib/server-api.ts`. On 410 with error code `EXPIRED` render the expired state; any other 404/410 renders the revoked/unavailable state. The payload shape matches the old resolver (share/platform/context/device/theme, project, brand, variant, asset) EXCEPT asset/brand URLs: cloudinary assets carry absolute `url`; local-driver assets carry relative `/api/assets/<id>` which works through the rewrite. Verify `asset.id` is used for relative URLs.
   - The workspace page currently loads project+variants+shares server-side from deleted libs → switch to `GET /api/projects/:projectId` via `lib/server-api.ts` with cookie forwarding; shape is the same envelope the components already consume.
4. `.env.example` documents frontend API URLs; no frontend references deleted libraries or backend secrets.
5. `e2e/smoke.spec.ts` covers wizard, upload, platform/device/placement switching, share creation, anonymous comment, and revoke/unavailable state. It uses an in-memory PNG buffer.
6. `backend/scripts/e2e-server.ts` provides a disposable MongoMemoryServer + local-storage backend for browser E2E.
7. Port the old verification: `scripts/e2e_verify.py` still targets `http://localhost:3000` — through the rewrite it now exercises the real backend; expected result 43/43 PASS (expired-link check needs a backend restart to clear nothing — the backend reads Mongo live, so just set expiresAt in Mongo or skip that one check with a note; the old in-file db edit no longer applies). `scripts/regression_upload.mjs` should also pass through :3000.
8. Dependency cleanup as mandated: confirm nothing references deleted files, `npm prune`, regenerate the lockfile (`rm -rf node_modules package-lock.json && npm install`), `npm audit` informational only.
9. Final gates pass: frontend typecheck/lint/build; backend typecheck/lint/build/test (31/31); Playwright E2E **1/1 passed in 7.5s**. Backend lint reports 4 existing console warnings only.
10. Share creation was corrected to generate links against the configured frontend origin rather than the backend API host.

**Definition of done:** the app runs on Next.js frontend + Express backend + MongoDB (+Cloudinary when credentialed); no Next API routes remain; static/API/browser gates are green; old implementations are removed.

## 7. How to run

- Backend dev: `cd backend && copy .env.example .env` (set `MONGODB_URI`; use `STORAGE_DRIVER=local` for no-Cloudinary) → `npm run dev` → :4000.
- Frontend: `cd frontend && npm run dev` → :3000; Next rewrites `/api/*` to the backend.
- Full browser E2E: `cd frontend && npm run test:e2e` starts a disposable MongoMemoryServer backend with local image storage.
- Headless screenshot: `node scripts/screenshot.mjs <url> <out.png> [--cookie "smp_session=..."] [--width] [--height] [--wait] [--click "css"]`.
- Test images: `python scripts/make_test_png.py <out> <w> <h> <r> <g> <b>`.

## 8. Gotchas (learned the hard way)

- **Windows/Git Bash:** kill the :3000/:4000 listener via PowerShell `Get-NetTCPConnection -LocalPort <p> -State Listen | Select -Expand OwningProcess | % { Stop-Process -Id $_ -Force }` — NEVER `taskkill /IM node.exe` (kills the agent harness too).
- A formatter/linter may run on files between edits (files reformatted with double quotes/Prettier style mid-session in `components/`). Re-Read before Edit if you hit "file modified" errors.
- Phone-frame mockups need definite height (`height:640px; max-height:72vh` on .phone-screen) or inner `height:100%` flex shells collapse.
- YouTube theme CSS vars exist on BOTH `.yt` and `.yt-m` roots (mobile shell has no `.yt` ancestor).
- The security-scanner hook (Mimosa) blocks writes with IDOR patterns — always bind ownership into queries (`Project.exists({_id, ownerSessionId})`, aggregate with `$match` on owner) and never `Math.random` near anything crypto-looking (React keys are fine but it flags; use counters if noisy).
- Server components + backend cookies: forward the `smp_session` cookie header; backend sets cookie on any request that creates a session.
- next build treats `app/api` as routes; after deleting it, remove `output` tweaks if any (none currently) — `next.config.mjs` only sets `images.unoptimized`.

## 9. Context: user preferences observed

- Wants speed ("do it fast") but also completeness; hates half-migrations and unused packages.
- Explicitly rejected copying the reference designs' visuals; wants platform-authentic preview structures in the app's own design system.
- App name is **Preview Lab** (was "Prevu"); keep the PL monogram CSS.
- No homepage/landing — straight into workspace/wizard.
- Don't ask clarifying questions mid-migration; follow the mandate document.

## 10. Original migration mandate (condensed, for fidelity)

Install+use: backend express/mongoose/zod/cloudinary/cors/helmet/dotenv (+vitest/supertest/tsx/typescript/eslint/prettier dev) — done. Frontend keeps next@14.2.15/react@18.3.1/typescript@5.5.4 and has tailwind/eslint/prettier/playwright. Native fetch, no Axios. Cloudinary env remains server-only; MongoDB stores metadata+URL, never binaries; CORS allows the frontend origin. Static/API verification is complete; browser E2E is authored and awaits MongoDB runtime configuration.
