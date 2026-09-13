import type { DeviceMode } from "@/lib/types";
import type { PreviewContext } from "./PreviewRenderer";
import { PhoneFrame } from "./DeviceFrame";
import { BrandAvatar, DummyTile, TK_DUMMY_VIDEOS } from "./shared";

/**
 * TikTok — two placement contexts:
 *  - foryou:  vertical, mobile-first 9:16 feed simulation (still image, no
 *             fake playback controls), desktop shows a centered phone viewport
 *  - profile: the profile structure — avatar, @username, following/followers/
 *             likes, bio, and the video grid (creative first, dummy videos
 *             after). Desktop uses the web layout (side nav + centered
 *             profile column); mobile uses the real app structure.
 * Dark by platform design; clearly simulated generic chrome.
 */

type TkContext = "foryou" | "profile";

function normalizeContext(contextId: string | undefined): TkContext {
  return contextId === "profile" ? "profile" : "foryou";
}

function handleOf(context: PreviewContext): string {
  return context.brand.handle.startsWith("@")
    ? context.brand.handle
    : "@" + context.brand.handle;
}

/* ---------- glyphs ---------- */

function G({
  d,
  size = 18,
  fill,
}: {
  d: string;
  size?: number;
  fill?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const P = {
  home: "m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35",
  compass: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm3.5 5.5-2 5.5-5.5 2 2-5.5Z",
  users:
    "M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6 6 0 0 1 11 0m1.5-5.6a5 5 0 0 1 6.5 4.6",
  heart:
    "M12 20.5s-8-4.7-8-10.4C4 7 6 5 8.5 5c1.7 0 3 .9 3.5 2 .5-1.1 1.8-2 3.5-2C18 5 20 7 20 10.1c0 5.7-8 10.4-8 10.4Z",
  comment: "M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z",
  bookmark: "M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7m-8 4V3m-4 4 4-4 4 4",
  music:
    "M9 18V5l10-2v13m-13 2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  play: "M8 5.5v13l11-6.5Z",
  live: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-6.5-2.5a9 9 0 0 0 0 13m13-13a9 9 0 0 1 0 13",
  grid: "M4 4h16v16H4Zm0 5.3h16M4 14.6h16M9.3 4v16M14.6 4v16",
  lock: "M6 11h12v9H6Zm3 0V7a3 3 0 0 1 6 0v4",
  menu: "M4 6h16M4 12h16M4 18h16",
  inbox: "M4 5h16v10h-6l-4 4v-4H4Z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
};

/* ---------- For You feed (unchanged core) ---------- */

function ForYou({
  context,
  height,
  width,
  radius,
}: {
  context: PreviewContext;
  height?: number | string;
  width?: number | string;
  radius?: number;
}) {
  const { imageUrl, variantName, fit } = context;
  const handle = handleOf(context);
  return (
    <div
      className="tk"
      style={{ width, height, borderRadius: radius, minHeight: 480 }}
    >
      <div className="tk-canvas">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${variantName} shown in a vertical TikTok feed`}
            className={fit === "contain" ? "fit-contain" : undefined}
          />
        ) : (
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>
            No image
          </div>
        )}
      </div>
      <div
        className="tk-top"
        aria-hidden="true"
        style={{ paddingTop: height === "100%" ? 10 : 40 }}
      >
        <span>Following</span>
        <span className="on">For You</span>
      </div>
      <div className="tk-bottom">
        <div className="tk-meta">
          <div className="tk-handle">{handle}</div>
          <div className="tk-caption">
            {variantName} — launch creative preview #design #campaign
          </div>
          <div className="tk-music">
            <G d={P.music} size={13} /> original sound — {handle.slice(1)}
          </div>
        </div>
        <div className="tk-rail" aria-hidden="true">
          <span className="tk-rail-item">
            <span className="tk-rail-icon" style={{ color: "#fe2c55" }}>
              <G d={P.heart} size={22} />
            </span>
            12.4K
          </span>
          <span className="tk-rail-item">
            <span className="tk-rail-icon">
              <G d={P.comment} size={21} />
            </span>
            894
          </span>
          <span className="tk-rail-item">
            <span className="tk-rail-icon">
              <G d={P.bookmark} size={20} />
            </span>
            2.1K
          </span>
          <span className="tk-rail-item">
            <span className="tk-rail-icon">
              <G d={P.share} size={20} />
            </span>
            356
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- profile grid pieces ---------- */

function ProfileStats({
  context,
  row,
}: {
  context: PreviewContext;
  row?: boolean;
}) {
  const stats = [
    { n: "128", l: "Following" },
    { n: "12.4K", l: "Followers" },
    { n: "356.1K", l: "Likes" },
  ];
  return (
    <div
      className={row ? "tk-pf-stats" : "tk-pf-stats"}
      style={row ? { display: "flex", justifyContent: "center" } : undefined}
    >
      {stats.map((s, i) => (
        <span key={s.l} className={i === 1 ? "mid" : ""}>
          <b>{s.n}</b> {s.l}
        </span>
      ))}
    </div>
  );
}

function VideoGrid({
  context,
  count,
}: {
  context: PreviewContext;
  count: number;
}) {
  const { imageUrl, variantName } = context;
  const items = TK_DUMMY_VIDEOS.slice(0, count);
  return (
    <div className="tk-grid">
      <div className="tk-grid-tile">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${variantName} shown as a TikTok video tile`}
          />
        ) : (
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>
            No image
          </span>
        )}
        <span className="tk-grid-views">
          <G d={P.play} size={11} fill /> 812.6K
        </span>
        <span className="tk-grid-pin">Pinned</span>
      </div>
      {items.map((v, i) => (
        <DummyTile key={i} index={i} className="tk-grid-tile">
          <span className="tk-grid-views">
            <G d={P.play} size={11} fill /> {v.views}
          </span>
        </DummyTile>
      ))}
    </div>
  );
}

/* ---------- desktop ---------- */

function ForYouDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="tk-desktop-wrap">
      <div
        className="phone"
        style={{
          width: 344,
          background: "#1c2124",
          padding: 8,
          boxShadow: "none",
        }}
        role="img"
        aria-label={`TikTok vertical preview — ${context.variantName}`}
      >
        <div
          className="phone-screen"
          style={{ background: "#000", minHeight: 520 }}
        >
          <ForYou context={context} width="100%" height="100%" radius={0} />
        </div>
      </div>
    </div>
  );
}

function ProfileDesktop({ context }: { context: PreviewContext }) {
  const { brand } = context;
  return (
    <div className="tk tk-web" style={{ width: 960, minHeight: 560 }}>
      <div className="tk-webbody">
        <div className="tk-webnav" aria-hidden="true">
          <span className="tk-weblogo">
            <svg width="20" height="22" viewBox="0 0 20 24" aria-hidden="true">
              <path
                d="M14 2h-3.4v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V8.9a6.6 6.6 0 0 0-.9-.1 6.6 6.6 0 1 0 6.6 6.6V8.4a7.6 7.6 0 0 0 4.4 1.4V6.3A4.6 4.6 0 0 1 14 2Z"
                fill="#fff"
              />
            </svg>
          </span>
          <span className="on">
            <G d={P.home} size={19} /> For You
          </span>
          <span>
            <G d={P.compass} size={19} /> Explore
          </span>
          <span>
            <G d={P.users} size={19} /> Following
          </span>
          <span>
            <G d={P.live} size={19} /> LIVE
          </span>
          <span>
            <G d={P.person} size={19} /> Profile
          </span>
        </div>
        <div className="tk-webmain">
          <div className="tk-pf-head">
            <BrandAvatar brand={brand} size={112} />
            <div className="tk-pf-info">
              <h3 className="tk-pf-handle">{handleOf(context)}</h3>
              <span className="tk-pf-btn">Follow</span>
              <span className="tk-pf-btn ghost">Message</span>
              <ProfileStats context={context} />
              <p className="tk-pf-name">{brand.name}</p>
              {brand.tagline && <p className="tk-pf-bio">{brand.tagline}</p>}
            </div>
          </div>
          <div className="tk-pf-tabs">
            <span className="on">Videos</span>
            <span>
              <G d={P.lock} size={12} /> Repost
            </span>
            <span>Liked</span>
          </div>
          <VideoGrid context={context} count={6} />
        </div>
      </div>
    </div>
  );
}

/* ---------- mobile ---------- */

function ForYouMobile({ context }: { context: PreviewContext }) {
  return (
    <PhoneFrame dark label={`TikTok For You feed — ${context.variantName}`}>
      <ForYou context={context} width="100%" height="100%" radius={0} />
    </PhoneFrame>
  );
}

function ProfileMobile({ context }: { context: PreviewContext }) {
  const { brand, variantName } = context;
  return (
    <PhoneFrame dark label={`TikTok mobile profile — ${variantName}`}>
      <div className="tk-m">
        <div className="tk-mtop">
          <G d={P.menu} size={19} />
          <span className="tk-mhandle">{handleOf(context)}</span>
          <G d={P.inbox} size={18} />
        </div>
        <div className="tk-mbody">
          <div
            className="tk-pf-head"
            style={{ flexDirection: "column", padding: "10px 16px 0", gap: 10 }}
          >
            <BrandAvatar brand={brand} size={92} />
            <h3 className="tk-pf-handle" style={{ fontSize: 16 }}>
              {handleOf(context)}
            </h3>
            <ProfileStats context={context} row />
            <span
              className="tk-pf-btn"
              style={{
                width: "100%",
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              Follow
            </span>
            <p className="tk-pf-name" style={{ textAlign: "center" }}>
              {brand.name}
            </p>
            {brand.tagline && (
              <p className="tk-pf-bio" style={{ textAlign: "center" }}>
                {brand.tagline}
              </p>
            )}
          </div>
          <div className="tk-pf-tabs" style={{ marginTop: 14 }}>
            <span className="on">
              <G d={P.grid} size={12} />
            </span>
            <span>
              <G d={P.lock} size={12} />
            </span>
            <span>
              <G d={P.heart} size={12} />
            </span>
          </div>
          <VideoGrid context={context} count={6} />
        </div>
        <div className="tk-mbottom">
          <span className="tk-mnav">
            <G d={P.home} size={19} /> Home
          </span>
          <span className="tk-mnav">
            <G d={P.compass} size={19} /> Explore
          </span>
          <span className="tk-mnav">
            <G d={P.plus} size={19} /> +
          </span>
          <span className="tk-mnav">
            <G d={P.inbox} size={19} /> Inbox
          </span>
          <span className="tk-mnav on">
            <G d={P.person} size={19} /> Profile
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------- entry ---------- */

export function TikTokPreview({
  context,
  device,
  contextId,
}: {
  context: PreviewContext;
  device: DeviceMode;
  contextId?: string;
}) {
  const ctx = normalizeContext(contextId);
  if (device === "mobile") {
    return ctx === "profile" ? (
      <ProfileMobile context={context} />
    ) : (
      <ForYouMobile context={context} />
    );
  }
  return ctx === "profile" ? (
    <ProfileDesktop context={context} />
  ) : (
    <ForYouDesktop context={context} />
  );
}
