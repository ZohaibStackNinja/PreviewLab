import type { DeviceMode } from "@/lib/types";
import type { PreviewContext } from "./PreviewRenderer";
import { PhoneFrame } from "./DeviceFrame";
import { BrandAvatar, BrandBanner, creativeImgStyle, DummyTile, LI_DUMMY_POSTS } from "./shared";

/**
 * LinkedIn — two placement contexts:
 *  - feed: professional feed post (the uploaded creative) with author header,
 *          reaction summary and Like / Comment / Repost / Send row
 *  - page: page structure with banner, square logo, name, tagline, follower
 *          stats and a feed of posts (uploaded creative + dummy posts)
 * Brand identity comes from project settings. Generic "PrevLink" chrome —
 * a simulation, not an official interface.
 */

type LiContext = "feed" | "page";

function normalizeContext(contextId: string | undefined): LiContext {
  return contextId === "page" ? "page" : "feed";
}

/* ---------- glyphs ---------- */

function G({
  d,
  size = 16,
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
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35",
  globe: "M3 12h18M12 3a14.5 14.5 0 0 1 0 18a14.5 14.5 0 0 1 0-18Z",
  more: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  like: "M7 11v9m-4-8h4l4.2-7.6A2 2 0 0 1 14.7 5L14 10h4.4a2 2 0 0 1 2 2.4l-1.2 5.2a2 2 0 0 1-2 1.4H7Z",
  comment: "M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z",
  repost:
    "m4 9 3-3 3 3m-3-3v9a3 3 0 0 0 3 3h2m10 6-3 3-3-3m3 3V9a3 3 0 0 0-3-3h-2",
  send: "m22 2-7 20-4-9-9-4Z",
  home: "m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z",
  users:
    "M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6 6 0 0 1 11 0m1.5-5.6a5 5 0 0 1 6.5 4.6",
  briefcase: "M4 8h16v12H4Zm5 0V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 6h8",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4.5 10a2 2 0 0 0 3 0",
  grid: "M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z",
};

function truncate(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

/* ---------- feed post ---------- */

function FeedPost({
  context,
  isCreative,
  dummy,
}: {
  context: PreviewContext;
  isCreative: boolean;
  dummy?: (typeof LI_DUMMY_POSTS)[number];
}) {
  const { imageUrl, variantName, fit, brand } = context;
  return (
    <div className="li-post">
      <div className="li-head">
        <BrandAvatar brand={brand} size={44} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="li-name truncate">{brand.name}</div>
          <div className="li-sub truncate">
            {brand.tagline || "Marketing team · Promo"}
          </div>
          <div className="li-time">
            {isCreative ? "2h" : dummy?.time} · <G d={P.globe} size={12} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--brand-dark)",
            }}
          >
            + Follow
          </span>
          <G d={P.more} size={16} />
        </div>
      </div>
      <p className="li-copy">
        {isCreative
          ? `Excited to share ${variantName} — our latest campaign creative. Feedback welcome before we go live. #marketing #launch`
          : dummy?.text}
      </p>
      {isCreative ? (
        <div
          className={fit === "contain" ? "li-image contain" : "li-image crop"}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${variantName} shown as a LinkedIn post image`}
              style={creativeImgStyle(fit === "contain" ? undefined : context.adjustment)}
            />
          ) : (
            <div style={{ padding: 40, color: "var(--muted)", fontSize: 12 }}>
              No image
            </div>
          )}
        </div>
      ) : (
        <DummyTile
          index={dummy === LI_DUMMY_POSTS[0] ? 2 : 4}
          style={{ margin: "0 16px", aspectRatio: "1.8 / 1", borderRadius: 8 }}
        />
      )}
      <div className="li-social">
        <span className="reactions" aria-hidden="true">
          <span>👍</span>
          <span>❤️</span>
        </span>
        <span>{isCreative ? "96" : "148"}</span>
        <span className="grow" />
        <span>
          {isCreative ? "14 comments · 6 reposts" : "21 comments · 9 reposts"}
        </span>
      </div>
      <div className="li-action-row">
        <span className="li-action">
          <G d={P.like} size={16} /> Like
        </span>
        <span className="li-action">
          <G d={P.comment} size={16} /> Comment
        </span>
        <span className="li-action">
          <G d={P.repost} size={16} /> Repost
        </span>
        <span className="li-action">
          <G d={P.send} size={16} /> Send
        </span>
      </div>
    </div>
  );
}

/* ---------- page context ---------- */

function PageHeader({
  context,
  mobile,
}: {
  context: PreviewContext;
  mobile?: boolean;
}) {
  const { brand } = context;
  return (
    <div className="li-pagehead">
      <BrandBanner
        brand={brand}
        style={{
          aspectRatio: mobile ? "3.2 / 1" : "4 / 1",
          borderRadius: mobile ? "8px 8px 0 0" : "8px 8px 0 0",
        }}
        imgAlt="LinkedIn page banner preview"
      />
      <div className="li-pagelogo">
        <BrandAvatar brand={brand} size={mobile ? 64 : 76} radius={10} />
      </div>
      <div className="li-pageinfo">
        <h3>{brand.name}</h3>
        <p>{brand.tagline || "Design studio · Marketing & advertising"}</p>
        <p className="li-pagemeta">
          12.8K followers ·{" "}
          <span style={{ color: "var(--brand-dark)", fontWeight: 600 }}>
            + Follow
          </span>
        </p>
      </div>
      <div className="li-pagebtns">
        <span className="li-btn-primary">+ Follow</span>
        <span className="li-btn-secondary">Message</span>
      </div>
      <div className="li-pagenav">
        <span>Home</span>
        <span className="on">Posts</span>
        <span>About</span>
        <span>Jobs</span>
      </div>
    </div>
  );
}

/* ---------- desktop ---------- */

function FeedDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="mock-shell li">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          Prev<span style={{ color: "var(--brand-dark)" }}>Link</span>
        </span>
        <span className="yt-search" style={{ maxWidth: 240 }}>
          <G d={P.search} size={14} /> Search
        </span>
      </div>
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <FeedPost context={context} isCreative />
        {LI_DUMMY_POSTS.map((p, i) => (
          <FeedPost key={i} context={context} isCreative={false} dummy={p} />
        ))}
      </div>
    </div>
  );
}

function PageDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="mock-shell li" style={{ width: 640 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          Prev<span style={{ color: "var(--brand-dark)" }}>Link</span>
        </span>
        <span className="yt-search" style={{ maxWidth: 240 }}>
          <G d={P.search} size={14} /> Search
        </span>
      </div>
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <PageHeader context={context} />
        <FeedPost context={context} isCreative />
        {LI_DUMMY_POSTS.map((p, i) => (
          <FeedPost key={i} context={context} isCreative={false} dummy={p} />
        ))}
      </div>
    </div>
  );
}

/* ---------- mobile ---------- */

function LiMobileTop() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>
        Prev<span style={{ color: "var(--brand-dark)" }}>Link</span>
      </span>
      <span style={{ display: "flex", gap: 14, color: "var(--text-2)" }}>
        <G d={P.grid} size={17} />
        <G d={P.search} size={16} />
      </span>
    </div>
  );
}

function LinkedInMobile({
  context,
  ctx,
}: {
  context: PreviewContext;
  ctx: LiContext;
}) {
  return (
    <PhoneFrame label={`LinkedIn mobile — ${context.brand.name}`}>
      <div className="li-m">
        <LiMobileTop />
        <div className="li-mbody">
          {ctx === "page" && <PageHeader context={context} mobile />}
          <FeedPost context={context} isCreative />
          {LI_DUMMY_POSTS.map((p, i) => (
            <FeedPost key={i} context={context} isCreative={false} dummy={p} />
          ))}
        </div>
        <div className="li-mbottom">
          <span style={{ color: "var(--text-2)" }}>
            <G d={P.home} size={19} />
          </span>
          <span style={{ color: "var(--text-2)" }}>
            <G d={P.users} size={19} />
          </span>
          <span style={{ color: "var(--text-2)" }}>
            <G d={P.briefcase} size={19} />
          </span>
          <span style={{ color: "var(--text-2)" }}>
            <G d={P.comment} size={19} />
          </span>
          <BrandAvatar brand={context.brand} size={22} radius={4} />
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------- entry ---------- */

export function LinkedInPreview({
  context,
  device,
  contextId,
}: {
  context: PreviewContext;
  device: DeviceMode;
  contextId?: string;
}) {
  const ctx = normalizeContext(contextId);
  if (device === "mobile")
    return <LinkedInMobile context={context} ctx={ctx} />;
  return ctx === "page" ? (
    <PageDesktop context={context} />
  ) : (
    <FeedDesktop context={context} />
  );
}
