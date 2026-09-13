import type { DeviceMode } from "@/lib/types";
import type { PreviewContext } from "./PreviewRenderer";
import { PhoneFrame } from "./DeviceFrame";
import { BrandAvatar, BrandBanner, creativeImgStyle, DummyTile, FB_DUMMY_POSTS } from "./shared";

/**
 * Facebook — two placement contexts:
 *  - feed: a wider feed card (the uploaded creative post) with generic actions
 *  - page: page structure with cover photo, round profile logo, page name,
 *          tabs and a feed of posts (uploaded creative + dummy posts)
 * Brand identity comes from the project settings. Generic "PrevBook" chrome —
 * a simulation, not an official interface.
 */

type FbContext = "feed" | "page";

function normalizeContext(contextId: string | undefined): FbContext {
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
  globe:
    "M3 12h18M12 3a14.5 14.5 0 0 1 0 18a14.5 14.5 0 0 1 0-18M12 3a9 9 0 0 1 0 18a9 9 0 0 1 0-18Z",
  like: "M7 11v9m-4-8h4l4.2-7.6A2 2 0 0 1 14.7 5L14 10h4.4a2 2 0 0 1 2 2.4l-1.2 5.2a2 2 0 0 1-2 1.4H7Z",
  comment: "M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z",
  share: "M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7m-8 4V3m-4 4 4-4 4 4",
  more: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  plus: "M12 5v14M5 12h14",
  home: "m3 10.5 9-7.5 9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z",
  video: "M3 7h12v10H3Zm12 3 5-3v10l-5-3",
  store: "M4 9h16l-1 11H5L4 9Zm4 0V6a4 4 0 0 1 8 0v3",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4.5 10a2 2 0 0 0 3 0",
};

function truncate(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

/* ---------- feed post ---------- */

function FeedPost({
  context,
  isCreative,
  dummy,
  compact,
}: {
  context: PreviewContext;
  isCreative: boolean;
  dummy?: (typeof FB_DUMMY_POSTS)[number];
  compact?: boolean;
}) {
  const { imageUrl, variantName, fit, brand } = context;
  return (
    <div className="fb-post">
      <div className="fb-head">
        <BrandAvatar brand={brand} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fb-name truncate">{brand.name}</div>
          <div className="fb-sub">
            {isCreative ? "Sponsored" : `${dummy?.time} · `}
            <G d={P.globe} size={12} />
          </div>
        </div>
        <G d={P.more} size={16} />
      </div>
      <p className="fb-copy">
        {isCreative
          ? `${variantName} — launching soon. Preview of the feed creative for review.`
          : dummy?.text}
      </p>
      {isCreative ? (
        <div
          className={fit === "contain" ? "fb-image contain" : "fb-image crop"}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${variantName} shown as a Facebook feed image`}
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
          index={dummy === FB_DUMMY_POSTS[0] ? 1 : 3}
          style={{
            margin: "0 -16px",
            aspectRatio: compact ? "1.91 / 1" : "1.8 / 1",
          }}
        />
      )}
      <div className="fb-counts">
        <span className="fb-reactions" aria-hidden="true">
          <span>👍</span>
          <span>❤️</span>
        </span>
        <span>{isCreative ? "312" : dummy?.reactions}</span>
        <span className="grow" />
        <span>{isCreative ? "58 comments · 12 shares" : dummy?.comments}</span>
      </div>
      <div className="fb-divider" />
      <div className="fb-action-row">
        <span className="fb-action">
          <G d={P.like} size={16} /> Like
        </span>
        <span className="fb-action">
          <G d={P.comment} size={16} /> Comment
        </span>
        <span className="fb-action">
          <G d={P.share} size={16} /> Share
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
    <>
      <BrandBanner
        brand={brand}
        style={{
          aspectRatio: mobile ? "2.9 / 1" : "2.9 / 1",
          width: "100%",
        }}
        imgAlt="Facebook page cover preview"
      />
      <div className="fb-pagehead">
        <span className="fb-pageavatar">
          <BrandAvatar brand={brand} size={mobile ? 72 : 132} />
        </span>
        <div className="fb-pagetitle">
          <h3>{brand.name}</h3>
          <p>{brand.tagline || "Product/service · Design studio"}</p>
          <p className="fb-pagemeta">12K likes · 12.8K followers</p>
        </div>
      </div>
      <div className="fb-pagebtns">
        <span className="fb-btn-primary">
          <G d={P.like} size={15} /> Liked
        </span>
        <span className="fb-btn-secondary">Message</span>
        <span className="fb-btn-secondary">Follow</span>
      </div>
      <div className="fb-pagetabs">
        <span>Home</span>
        <span className="on">Posts</span>
        <span>About</span>
        <span>Reviews</span>
        <span>Photos</span>
      </div>
    </>
  );
}

/* ---------- desktop ---------- */

function FeedDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="mock-shell fb">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          fontWeight: 700,
        }}
      >
        PrevBook
        <span className="yt-search" style={{ maxWidth: 280 }}>
          <G d={P.search} size={14} /> Search PrevBook
        </span>
      </div>
      <div className="fb-feedcol">
        <div className="fb-composer">
          <BrandAvatar brand={context.brand} size={36} />
          <span>Write something…</span>
        </div>
        <FeedPost context={context} isCreative />
        {FB_DUMMY_POSTS.map((p, i) => (
          <FeedPost key={i} context={context} isCreative={false} dummy={p} />
        ))}
      </div>
    </div>
  );
}

function PageDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="mock-shell fb" style={{ width: 700 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          fontWeight: 700,
        }}
      >
        PrevBook
        <span className="yt-search" style={{ maxWidth: 280 }}>
          <G d={P.search} size={14} /> Search PrevBook
        </span>
      </div>
      <PageHeader context={context} />
      <div className="fb-feedcol" style={{ padding: "0 16px 16px" }}>
        <div className="fb-composer">
          <BrandAvatar brand={context.brand} size={36} />
          <span>Write something…</span>
        </div>
        <FeedPost context={context} isCreative />
        {FB_DUMMY_POSTS.map((p, i) => (
          <FeedPost key={i} context={context} isCreative={false} dummy={p} />
        ))}
      </div>
    </div>
  );
}

/* ---------- mobile ---------- */

function FbMobileTop() {
  return (
    <div className="fb-mtop">
      <span
        style={{ fontWeight: 800, fontSize: 19, color: "var(--brand-dark)" }}
      >
        PrevBook
      </span>
      <span style={{ display: "flex", gap: 14 }}>
        <G d={P.search} size={17} />
        <G d={P.bell} size={17} />
        <span className="fb-mavatar" />
      </span>
    </div>
  );
}

function FacebookMobile({
  context,
  ctx,
}: {
  context: PreviewContext;
  ctx: FbContext;
}) {
  return (
    <PhoneFrame label={`Facebook mobile — ${context.brand.name}`}>
      <div className="fb-m">
        <FbMobileTop />
        <div className="fb-mbody">
          {ctx === "page" ? (
            <>
              <PageHeader context={context} mobile />
              <div className="fb-feedcol" style={{ padding: "0 12px 16px" }}>
                <FeedPost context={context} isCreative compact />
                {FB_DUMMY_POSTS.map((p, i) => (
                  <FeedPost
                    key={i}
                    context={context}
                    isCreative={false}
                    dummy={p}
                    compact
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="fb-mtabs">
                <G d={P.home} size={18} />
                <G d={P.video} size={18} />
                <G d={P.store} size={18} />
                <G d={P.bell} size={18} />
              </div>
              <FeedPost context={context} isCreative compact />
              {FB_DUMMY_POSTS.map((p, i) => (
                <FeedPost
                  key={i}
                  context={context}
                  isCreative={false}
                  dummy={p}
                  compact
                />
              ))}
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ---------- entry ---------- */

export function FacebookPreview({
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
    return <FacebookMobile context={context} ctx={ctx} />;
  if (ctx === "page") return <PageDesktop context={context} />;
  return <FeedDesktop context={context} />;
}
