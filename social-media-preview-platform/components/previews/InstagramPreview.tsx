import type { DeviceMode } from "@/lib/types";
import type { PreviewContext } from "./PreviewRenderer";
import { PhoneFrame } from "./DeviceFrame";
import {
  BrandAvatar,
  DummyTile,
  IG_DUMMY_POSTS,
  IG_DUMMY_TILES,
} from "./shared";

/**
 * Instagram — two placement contexts:
 *  - feed:    image-forward feed post (the uploaded creative) among other posts
 *  - profile: profile page with avatar, stats, bio, story highlights and a
 *             post grid where the creative is the newest post
 * The brand identity (logo, handle, name, tagline) comes from project settings.
 * Clearly simulated: generic "Prevgram" chrome, not an official interface.
 */

type IgContext = "feed" | "profile";

function normalizeContext(contextId: string | undefined): IgContext {
  return contextId === "profile" ? "profile" : "feed";
}

function handle(brand: PreviewContext["brand"]): string {
  return brand.handle.replace(/^@/, "") || "your.brand";
}

/* ---------- glyphs ---------- */

function G({
  d,
  size = 20,
  fill,
  style,
}: {
  d: string;
  size?: number;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      style={style}
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
  reels:
    "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm-1 4h16M9.5 4l3 4m2.5-4 3 4M10.5 12.5l4 2.3-4 2.3Z",
  shop: "M6 8h12l1 12H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  heart:
    "M12 20.5s-8-4.7-8-10.4C4 7 6 5 8.5 5c1.7 0 3 .9 3.5 2 .5-1.1 1.8-2 3.5-2C18 5 20 7 20 10.1c0 5.7-8 10.4-8 10.4Z",
  comment: "M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z",
  send: "m22 2-7 20-4-9-9-4Z",
  save: "M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z",
  more: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  grid: "M4 4h16v16H4Zm0 5.3h16M4 14.6h16M9.3 4v16M14.6 4v16",
  verified:
    "m12 2 2.4 2.1 3.1-.4 1 3 2.9 1.3-1 3 1 3-2.9 1.3-1 3-3.1-.4L12 22l-2.4-2.1-3.1.4-1-3L2.6 16l1-3-1-3 2.9-1.3 1-3 3.1.4Z",
};

function Icon({ name, size = 20 }: { name: keyof typeof P; size?: number }) {
  return <G d={P[name]} size={size} />;
}

/* ---------- feed post pieces ---------- */

function FeedPost({
  context,
  isCreative,
  dummy,
}: {
  context: PreviewContext;
  isCreative: boolean;
  dummy?: (typeof IG_DUMMY_POSTS)[number];
}) {
  const { imageUrl, variantName, fit, brand } = context;
  const user = handle(brand);
  return (
    <div className="ig-post">
      <div className="ig-head">
        <BrandAvatar brand={brand} size={34} className="ig-avatar-ring" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ig-user truncate">
            {user}
            <span style={{ color: "var(--muted)" }}>
              {" "}
              · {isCreative ? "2h" : dummy?.time}
            </span>
          </div>
          <div className="ig-location">
            {isCreative ? "Sponsored" : "Original audio"}
          </div>
        </div>
        <G d={P.more} size={16} />
      </div>
      {isCreative ? (
        <div className={fit === "contain" ? "ig-image contain" : "ig-image"}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`${variantName} shown as an Instagram feed post`}
            />
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>No image</div>
          )}
        </div>
      ) : (
        <DummyTile
          index={dummy === IG_DUMMY_POSTS[0] ? 1 : 3}
          style={{ aspectRatio: "1 / 1" }}
        />
      )}
      <div className="ig-actions">
        <G d={P.heart} size={21} />
        <G d={P.comment} size={21} />
        <G d={P.send} size={20} />
        <span className="spacer" />
        <G d={P.save} size={20} />
      </div>
      {isCreative ? (
        <>
          <p className="ig-likes">1,248 likes</p>
          <p className="ig-caption">
            <b>{user}</b> {variantName} — coming soon. Tell us what you think!
          </p>
          <p className="ig-view-comments">View all 42 comments</p>
          <p className="ig-time">2 hours ago</p>
        </>
      ) : (
        <>
          <p className="ig-likes">{dummy?.likes} likes</p>
          <p className="ig-caption">
            <b>{user}</b> {dummy?.caption}
          </p>
          <p className="ig-view-comments">
            View all {isCreative ? 42 : 12} comments
          </p>
          <p className="ig-time">{dummy?.time} ago</p>
        </>
      )}
    </div>
  );
}

/* ---------- profile pieces ---------- */

function ProfileHeader({
  context,
  mobile,
}: {
  context: PreviewContext;
  mobile?: boolean;
}) {
  const { brand, variantName } = context;
  const user = handle(brand);
  const stats = [
    { n: "81", l: "posts" },
    { n: "12.4K", l: "followers" },
    { n: "256", l: "following" },
  ];
  return (
    <>
      <div className="ig-pf-head">
        <BrandAvatar
          brand={brand}
          size={mobile ? 77 : 150}
          className="ig-avatar-ring"
        />
        <div className="ig-pf-info">
          <div className="ig-pf-userrow">
            <span className="ig-user" style={{ fontSize: mobile ? 15 : 19 }}>
              {user}
              <G d={P.verified} size={mobile ? 13 : 15} />
            </span>
            {!mobile && <span className="ig-pf-btn">Edit profile</span>}
            {!mobile && <span className="ig-pf-btn">Share</span>}
            <G d={P.more} size={16} />
          </div>
          <div className="ig-pf-stats">
            {stats.map((s) => (
              <span key={s.l}>
                <b>{s.n}</b> {s.l}
              </span>
            ))}
          </div>
          <div className="ig-pf-bio">
            <b>{brand.name}</b>
            {brand.tagline && <div>{brand.tagline}</div>}
            {!brand.tagline && (
              <div>{variantName} — launching soon 🚀 #design #campaign</div>
            )}
            <div style={{ color: "var(--brand-dark)" }}>
              prevu.studio/{user}
            </div>
          </div>
        </div>
      </div>
      <div className="ig-highlights">
        {["New", "Work", "BTS", "Team", "FAQ"].map((h, i) => (
          <span className="ig-highlight" key={h}>
            <DummyTile
              index={i + 2}
              style={{
                width: mobile ? 52 : 74,
                height: mobile ? 52 : 74,
                borderRadius: "50%",
                border: "1px solid var(--border)",
              }}
            />
            <span>{h}</span>
          </span>
        ))}
      </div>
    </>
  );
}

function PostGrid({ context }: { context: PreviewContext }) {
  const { imageUrl, variantName, fit } = context;
  return (
    <div className="ig-grid">
      <div className="ig-grid-tile">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${variantName} shown as the newest Instagram grid post`}
            className={fit === "contain" ? "contain" : undefined}
          />
        ) : (
          <span style={{ color: "var(--muted)", fontSize: 11 }}>No image</span>
        )}
        <span className="ig-grid-pin">📌 Pinned</span>
      </div>
      {Array.from({ length: IG_DUMMY_TILES }).map((_, i) => (
        <DummyTile key={i} index={i} className="ig-grid-tile">
          <span className="ig-grid-meta">
            <G d={P.heart} size={13} fill /> {(2.1 - i * 0.17).toFixed(1)}K
            <G d={P.comment} size={13} fill style={{ marginLeft: 8 }} />{" "}
            {48 - i * 5}
          </span>
        </DummyTile>
      ))}
    </div>
  );
}

/* ---------- desktop ---------- */

function FeedDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="ig-feedcol">
      <FeedPost context={context} isCreative />
      {IG_DUMMY_POSTS.map((p, i) => (
        <FeedPost key={i} context={context} isCreative={false} dummy={p} />
      ))}
    </div>
  );
}

function ProfileDesktop({ context }: { context: PreviewContext }) {
  return (
    <div className="ig">
      <div className="ig-webtop">
        <span className="ig-weblogo">Prevgram</span>
        <span style={{ display: "flex", gap: 16 }}>
          <G d={P.home} size={20} />
          <G d={P.reels} size={20} />
          <G d={P.send} size={19} />
        </span>
      </div>
      <ProfileHeader context={context} />
      <div className="ig-gridtabs">
        <span className="on">
          <G d={P.grid} size={11} /> POSTS
        </span>
        <span>
          <G d={P.reels} size={11} /> REELS
        </span>
        <span>
          <G d={P.save} size={11} /> TAGGED
        </span>
      </div>
      <PostGrid context={context} />
    </div>
  );
}

/* ---------- mobile ---------- */

function IgBottomNav() {
  return (
    <div className="ig-bottom">
      <G d={P.home} size={22} />
      <G d={P.search} size={22} />
      <G d={P.reels} size={22} />
      <G d={P.shop} size={22} />
      <span className="ig-bottom-avatar" />
    </div>
  );
}

function InstagramMobile({
  context,
  ctx,
}: {
  context: PreviewContext;
  ctx: IgContext;
}) {
  const { brand } = context;
  const user = handle(brand);
  return (
    <PhoneFrame label={`Instagram mobile — ${brand.name}`}>
      <div className="ig-m">
        <div className="ig-mtop">
          {ctx === "profile" ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {user} <G d={P.more} size={15} />
            </span>
          ) : (
            <span className="ig-weblogo" style={{ fontSize: 19 }}>
              Prevgram
            </span>
          )}
          <span style={{ display: "flex", gap: 14 }}>
            <G d={P.heart} size={19} />
            <G d={P.send} size={18} />
          </span>
        </div>
        <div className="ig-mbody">
          {ctx === "profile" ? (
            <>
              <ProfileHeader context={context} mobile />
              <div className="ig-pf-btns">
                <span className="ig-pf-btn" style={{ flex: 1 }}>
                  Following
                </span>
                <span className="ig-pf-btn" style={{ flex: 1 }}>
                  Message
                </span>
              </div>
              <div
                className="ig-gridtabs"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span className="on">
                  <G d={P.grid} size={11} />
                </span>
                <span>
                  <G d={P.reels} size={11} />
                </span>
              </div>
              <PostGrid context={context} />
            </>
          ) : (
            <>
              <div className="ig-mstories">
                {[0, 1, 2, 3].map((i) => (
                  <span className="ig-highlight" key={i}>
                    <DummyTile
                      index={i}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        border: "2px solid #d63384",
                      }}
                    />
                    <span>{["you", "team", "bts", "live"][i]}</span>
                  </span>
                ))}
              </div>
              <FeedPost context={context} isCreative />
              <FeedPost
                context={context}
                isCreative={false}
                dummy={IG_DUMMY_POSTS[0]}
              />
            </>
          )}
        </div>
        <IgBottomNav />
      </div>
    </PhoneFrame>
  );
}

/* ---------- entry ---------- */

export function InstagramPreview({
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
    return <InstagramMobile context={context} ctx={ctx} />;
  if (ctx === "profile") return <ProfileDesktop context={context} />;
  return (
    <div className="ig-feedwrap">
      <FeedDesktop context={context} />
    </div>
  );
}
