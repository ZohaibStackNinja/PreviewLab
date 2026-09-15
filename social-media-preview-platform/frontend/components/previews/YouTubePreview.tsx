import { useState } from 'react';
import type { CropAdjustment, DeviceMode, PreviewTheme } from '@/lib/types';
import type { PreviewContext } from './PreviewRenderer';
import { PhoneFrame } from './DeviceFrame';
import {
  BrandAvatar,
  BrandBanner,
  creativeImgStyle,
  DummyTile,
  YT_DUMMY_COMMENTS,
  YT_DUMMY_VIDEOS,
} from './shared';

/**
 * YouTube — simulated app with three placement contexts (watch feed /
 * search results / channel page), dark and light themes, on desktop and a
 * real mobile app shell (top bar + bottom navigation) in the phone frame.
 * The channel identity comes from the project's brand settings (logo,
 * banner, name, handle, tagline); an uploaded banner replaces the generated
 * channel-art composition.
 * Clearly simulated: generic "PrevTube" chrome, no playback controls.
 */

type YtContext = 'watch' | 'search' | 'channel';

function normalizeContext(contextId: string | undefined): YtContext {
  return contextId === 'search' || contextId === 'channel'
    ? contextId
    : 'watch';
}

/* ---------- tiny glyphs (outline, currentColor) ---------- */

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
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
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
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-7 8a7 7 0 0 0 14 0M12 18v3',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4.5 10a2 2 0 0 0 3 0',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z',
  shorts:
    'M9 5h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h6M9 5a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8',
  subs: 'M4 8h16M6 4h12M4 12h16v8H4Zm6 2.5v3l3-1.5Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3.5 2',
  playlist: 'M4 6h12M4 11h12M4 16h7m6 -1v6m-3-3 3 3 3-3',
  video: 'M3 7h12v10H3Zm12 3 5-3v10l-5-3',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  like: 'M7 11v9m-4-8h4l4.2-7.6A2 2 0 0 1 14.7 5L14 10h4.4a2 2 0 0 1 2 2.4l-1.2 5.2a2 2 0 0 1-2 1.4H7Z',
  dislike:
    'M17 13V4m4 8h-4l-4.2 7.6a2 2 0 0 1-3.5-.4L10 14H5.6a2 2 0 0 1-2-2.4l1.2-5.2a2 2 0 0 1 2-1.4H17Z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7m-8 4V3m-4 4 4-4 4 4',
  download: 'M12 4v11m-5-4 5 5 5-5M5 20h14',
  save: 'M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1Z',
  cast: 'M2 20h.01M2 16a4 4 0 0 1 4 4M2 12a8 8 0 0 1 8 8m-8-12a12 12 0 0 1 12 12',
  more: 'M12 5.5v.01M12 12v.01M12 18.5v.01',
  sort: 'M3 6h18M6 12h12M9 18h6',
  play: 'M5 3l14 9-14 9V3z',
  volume: 'M11 5L6 9H2v6h4l5 4V5zm4.5 3.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-2.8l-1.5-.9.1-1.8 1.5-.9a1 1 0 0 0 .4-1.2l-1.4-2.4a1 1 0 0 0-1.2-.4l-1.6.7-1.4-1.2-.2-1.7a1 1 0 0 0-1-1h-2.8a1 1 0 0 0-1 1l-.2 1.7-1.4 1.2-1.6-.7a1 1 0 0 0-1.2.4L3.6 8.9a1 1 0 0 0 .4 1.2l1.5.9.1 1.8-1.5.9a1 1 0 0 0-.4 1.2l1.4 2.4a1 1 0 0 0 1.2.4l1.6-.7 1.4 1.2.2 1.7a1 1 0 0 0 1 1h2.8a1 1 0 0 0 1-1l.2-1.7 1.4-1.2 1.6.7a1 1 0 0 0 1.2-.4l1.4-2.4a1 1 0 0 0-.4-1.2z',
  fullscreen:
    'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  check: 'M20 6L9 17l-5-5',
  heart:
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  pin: 'M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z',
};

function Icon({
  name,
  size = 18,
  fill,
}: {
  name: keyof typeof P;
  size?: number;
  fill?: boolean;
}) {
  return <G d={P[name]} size={size} fill={fill} />;
}

function Logo({ small }: { small?: boolean }) {
  return (
    <span className="yt-logo" style={small ? { fontSize: 13 } : undefined}>
      <span
        className="yt-logo-mark"
        style={small ? { width: 22, height: 15 } : undefined}
      >
        <svg width="9" height="7" viewBox="0 0 10 8" aria-hidden="true">
          <path d="M1 .8 9 4 1 7.2Z" fill="#fff" />
        </svg>
      </span>
      PrevTube
      <sup style={{ fontSize: 8, color: 'var(--ytmut)', fontWeight: 400 }}>
        IN
      </sup>
    </span>
  );
}

function Burger() {
  return (
    <span className="yt-burger" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

/* ---------- shared pieces ---------- */

function Thumb({
  url,
  alt,
  fit,
  duration,
  className,
  adj,
}: {
  url: string | null;
  alt: string;
  fit: 'crop' | 'contain';
  duration?: string;
  className?: string;
  adj?: CropAdjustment;
}) {
  return (
    <div className={className ? `yt-thumb ${className}` : 'yt-thumb'}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className={fit === 'contain' ? 'fit-contain' : undefined}
          style={creativeImgStyle(fit === 'contain' ? undefined : adj)}
        />
      ) : (
        <span style={{ color: '#5f6a6d', fontSize: 11 }}>No image</span>
      )}
      {duration && <span className="yt-duration">{duration}</span>}
    </div>
  );
}

function WatchVideoPlayer({
  url,
  alt,
  fit,
  adj,
  className,
}: {
  url: string | null;
  alt: string;
  fit: 'crop' | 'contain';
  adj?: CropAdjustment;
  className?: string;
}) {
  return (
    <div className={`yt-player ${className || ''}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className={fit === 'contain' ? 'fit-contain' : undefined}
          style={creativeImgStyle(fit === 'contain' ? undefined : adj)}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            color: '#888888',
          }}
        >
          <Icon name="video" size={32} />
          <span style={{ fontSize: 12 }}>No video creative uploaded</span>
        </div>
      )}
      <div className="yt-player-overlay" aria-hidden="true">
        <div className="yt-player-progress">
          <div className="yt-player-progress-bar" />
        </div>
        <div className="yt-player-controls">
          <div className="yt-player-ctrl-group">
            <Icon name="play" size={15} fill />
            <Icon name="volume" size={15} />
            <span>03:42 / 12:04</span>
          </div>
          <div className="yt-player-ctrl-group">
            <Icon name="settings" size={15} />
            <Icon name="fullscreen" size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkelThumb({
  className,
  width,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <div
      className={className ? `yt-thumb ${className}` : 'yt-thumb'}
      style={width ? { width, flex: 'none' } : undefined}
    >
      <span className="skel-line" style={{ width: '40%' }} />
    </div>
  );
}

function Lines({ widths, dark }: { widths: number[]; dark?: boolean }) {
  return (
    <>
      {widths.map((w, i) => (
        <span
          key={i}
          className={`skel-line ${i === 0 && dark ? 'dark' : ''}`}
          style={{ width: `${w}%` }}
        />
      ))}
    </>
  );
}

function TopBar({
  query,
  brand,
}: {
  query?: string;
  brand: PreviewContext['brand'];
}) {
  return (
    <div className="yt-top">
      <Burger />
      <Logo />
      <div className="yt-search">
        <Icon name="search" size={16} />
        <span className="q">{query || 'Search'}</span>
      </div>
      <div className="yt-top-actions">
        <Icon name="mic" size={17} />
        <Icon name="plus" size={18} />
        <Icon name="bell" size={17} />
        <BrandAvatar brand={brand} size={30} className="yt-avatar-sm" />
      </div>
    </div>
  );
}

function SideRail() {
  return (
    <div className="yt-rail">
      <span className="yt-rail-item on">
        <Icon name="home" size={18} /> Home
      </span>
      <span className="yt-rail-item">
        <Icon name="shorts" size={18} /> Shorts
      </span>
      <span className="yt-rail-item">
        <Icon name="subs" size={18} /> Subscriptions
      </span>
      <span className="yt-rail-sep" />
      <span className="yt-rail-h">You &gt;</span>
      <span className="yt-rail-item">
        <Icon name="history" size={18} /> History
      </span>
      <span className="yt-rail-item">
        <Icon name="playlist" size={18} /> Playlists
      </span>
      <span className="yt-rail-item">
        <Icon name="video" size={18} /> Your videos
      </span>
      <span className="yt-rail-item">
        <Icon name="clock" size={18} /> Watch later
      </span>
      <span className="yt-rail-item">
        <Icon name="like" size={18} /> Liked videos
      </span>
      <span className="yt-rail-sep" />
    </div>
  );
}

function BottomNav() {
  return (
    <div className="yt-mbottom">
      <span className="yt-mnav">
        <Icon name="home" size={19} fill /> Home
      </span>
      <span className="yt-mnav dim">
        <Icon name="shorts" size={19} /> Shorts
      </span>
      <span className="yt-mcreate">
        <Icon name="plus" size={18} />
      </span>
      <span className="yt-mnav dim">
        <Icon name="subs" size={19} /> Subscriptions
      </span>
      <span className="yt-mnav dim">
        <Icon name="person" size={19} /> You
      </span>
    </div>
  );
}

function truncate(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

/* ---------- desktop contexts ---------- */

function WatchDesktop({ context }: { context: PreviewContext }) {
  const { imageUrl, variantName, fit, brand } = context;
  const [activeChip, setActiveChip] = useState('All');

  return (
    <>
      <TopBar brand={brand} />
      <div className="yt-main" style={{ padding: '16px 24px 32px' }}>
        <div className="yt-watch">
          {/* LEFT: MAIN CONTENT */}
          <div className="yt-watch-main">
            <WatchVideoPlayer
              url={imageUrl}
              alt={`${variantName} shown as a YouTube video player`}
              fit={fit}
              adj={context.adjustment}
            />

            <h1 className="yt-vtitle">{variantName} — campaign hero</h1>

            <div className="yt-chrow">
              <BrandAvatar brand={brand} size={40} />
              <div className="yt-chinfo">
                <div className="yt-chname-wrap">
                  <span className="yt-chname">{brand.name}</span>
                  <span className="yt-badge-check" title="Verified">
                    <Icon name="check" size={13} />
                  </span>
                </div>
                <span className="yt-chsub">128K subscribers</span>
              </div>
              <button type="button" className="yt-subbtn">
                Subscribe
              </button>

              <div className="yt-actions">
                <div className="yt-pill-group">
                  <button type="button" className="yt-pill-btn">
                    <Icon name="like" size={15} /> 24K
                  </button>
                  <span className="yt-pill-divider" />
                  <button
                    type="button"
                    className="yt-pill-btn"
                    aria-label="Dislike"
                  >
                    <Icon name="dislike" size={15} />
                  </button>
                </div>

                <button type="button" className="yt-pill">
                  <Icon name="share" size={15} /> Share
                </button>

                <button type="button" className="yt-pill">
                  <Icon name="download" size={15} /> Download
                </button>

                <button
                  type="button"
                  className="yt-pill"
                  aria-label="More options"
                >
                  <Icon name="more" size={16} />
                </button>
              </div>
            </div>

            <div className="yt-descbox">
              <div className="yt-desc-meta">
                <span>1,248,392 views</span>
                <span>·</span>
                <span>Premiered 2 hours ago</span>
                <span className="yt-desc-tags">#design #campaign #preview</span>
              </div>
              <div className="yt-desc-text">
                Upcoming launch creative — preview context for internal review
                and stakeholder sign-off. Review the creative inside the
                simulated platform watch environment before publishing live.
              </div>
              <div className="yt-desc-more">...more</div>
            </div>

            <div className="yt-comments-section">
              <div className="yt-comments-header">
                <span className="yt-comments-count">482 Comments</span>
                <span className="yt-comments-sort">
                  <Icon name="sort" size={16} /> Sort by
                </span>
              </div>

              <div className="yt-comment-input-row">
                <BrandAvatar brand={brand} size={34} />
                <div className="yt-comment-input-fake">Add a comment...</div>
              </div>

              <div className="yt-comments-list">
                {YT_DUMMY_COMMENTS.map((c) => (
                  <div className="yt-comment" key={c.id}>
                    <span
                      className="yt-comment-avatar"
                      style={{ background: c.avatarColor }}
                    >
                      {c.author.charAt(0)}
                    </span>
                    <div className="yt-comment-content">
                      {c.isPinned && (
                        <div className="yt-comment-pinned">
                          <Icon name="pin" size={12} fill /> Pinned by{' '}
                          {brand.name}
                        </div>
                      )}
                      <div className="yt-comment-author-row">
                        <span className="yt-comment-author">{c.author}</span>
                        {c.isPinned && (
                          <span className="yt-comment-badge-creator">
                            Creator
                          </span>
                        )}
                        <span className="yt-comment-time">{c.time}</span>
                      </div>
                      <div className="yt-comment-text">{c.text}</div>
                      <div className="yt-comment-actions">
                        <span className="yt-comment-action-btn">
                          <Icon name="like" size={13} /> {c.likes}
                        </span>
                        <span className="yt-comment-action-btn">
                          <Icon name="dislike" size={13} />
                        </span>
                        {c.isPinned && (
                          <span
                            className="yt-comment-action-btn"
                            style={{ color: '#ff0033' }}
                          >
                            <Icon name="heart" size={12} fill />
                          </span>
                        )}
                        <span
                          className="yt-comment-action-btn"
                          style={{ fontWeight: 600 }}
                        >
                          Reply
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: RECOMMENDATIONS SIDEBAR */}
          <aside className="yt-watch-side" aria-label="Recommended videos">
            <div className="yt-rec-chips" role="tablist">
              {[
                'All',
                'Related',
                `From ${brand.name}`,
                'Recently uploaded',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`yt-rec-chip ${activeChip === chip ? 'active' : ''}`}
                  onClick={() => setActiveChip(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="yt-rec-list">
              {YT_DUMMY_VIDEOS.map((v, i) => (
                <div className="yt-rec-card" key={i}>
                  <div className="yt-rec-thumb">
                    <DummyTile
                      index={i + 1}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <span className="yt-duration">{v.dur}</span>
                    </DummyTile>
                  </div>
                  <div className="yt-rec-info">
                    <h2 className="yt-rec-title" title={v.title}>
                      {v.title}
                    </h2>
                    <div className="yt-rec-channel">
                      {v.channel || brand.name}
                    </div>
                    <div className="yt-rec-meta">{v.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function SearchDesktop({ context }: { context: PreviewContext }) {
  const { imageUrl, variantName, fit, brand } = context;
  return (
    <>
      <TopBar query={`${variantName} campaign`} brand={brand} />
      <div className="yt-body">
        <SideRail />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="yt-results">
            <div className="yt-result">
              <Thumb
                url={imageUrl}
                alt={`${variantName} shown as a YouTube search result thumbnail`}
                fit={fit}
                duration="3:42"
                adj={context.adjustment}
              />
              <div className="yt-rinfo">
                <p className="yt-rtitle">{variantName} — campaign hero</p>
                <p className="yt-rmeta">1.2K views · 2 hours ago</p>
                <div className="yt-rch">
                  <BrandAvatar brand={brand} size={26} />
                  <span>{brand.name}</span>
                </div>
                <p className="yt-rdesc">
                  Upcoming launch creative — preview context for internal
                  review. See how the thumbnail competes in search before
                  publishing.
                </p>
              </div>
            </div>
            {[0, 1, 2].map((i) => (
              <div className="yt-result" key={i} aria-hidden="true">
                <SkelThumb width={340} />
                <div className="yt-rinfo">
                  <Lines widths={[80, 55]} />
                  <div className="yt-rch" style={{ marginTop: 12 }}>
                    <span
                      className="yt-chavatar"
                      style={{ background: 'var(--ytchip)' }}
                    />
                    <span className="skel-line" style={{ width: 90 }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Lines widths={[92, 70]} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ChannelDesktop({ context }: { context: PreviewContext }) {
  const { imageUrl, variantName, fit, brand } = context;
  return (
    <>
      <TopBar brand={brand} />
      <div className="yt-body">
        <SideRail />
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 26 }}>
          <BrandBanner
            brand={brand}
            className="yt-banner"
            imgAlt="Channel banner preview"
          />
          <div className="yt-chhead">
            <BrandAvatar brand={brand} size={88} className="yt-chavatar-lg" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="yt-chtitle">{brand.name}</div>
              <div className="yt-chstats">
                {brand.handle} · 772 subscribers · 81 videos
              </div>
              <div className="yt-chdesc">
                {brand.tagline ||
                  'Ready-to-publish creative, reviewed before it goes live.'}{' '}
                <span style={{ color: 'var(--yttext)' }}>...more</span>
              </div>
            </div>
            <span className="yt-subbtn">Subscribe</span>
          </div>
          <div className="yt-tabs">
            <span className="yt-tab">Home</span>
            <span className="yt-tab on">Videos</span>
            <span className="yt-tab">Shorts</span>
            <span className="yt-tab">Live</span>
            <span className="yt-tab">Playlists</span>
          </div>
          <div className="yt-chips">
            <span className="yt-chip on">Latest</span>
            <span className="yt-chip">Popular</span>
            <span className="yt-chip">Oldest</span>
          </div>
          <div className="yt-grid">
            <div>
              <Thumb
                url={imageUrl}
                alt={`${variantName} shown as a YouTube video card thumbnail`}
                fit={fit}
                duration="3:42"
                adj={context.adjustment}
              />
              <p className="yt-card-title">{variantName} — campaign hero</p>
              <p className="yt-card-meta">1K views · 3 months ago</p>
            </div>
            {YT_DUMMY_VIDEOS.map((v, i) => (
              <div key={i}>
                <DummyTile
                  index={i}
                  style={{ aspectRatio: '16 / 9', borderRadius: 12 }}
                >
                  <span className="yt-duration">{v.dur}</span>
                </DummyTile>
                <p className="yt-card-title">{v.title}</p>
                <p className="yt-card-meta">{v.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- mobile (real app shell) ---------- */

function MobileTop({ brand }: { brand: PreviewContext['brand'] }) {
  return (
    <div className="yt-mtop">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Burger />
        <Logo small />
      </div>
      <div className="yt-mactions">
        <Icon name="cast" size={17} />
        <Icon name="bell" size={17} />
        <Icon name="search" size={17} />
      </div>
    </div>
  );
}

function YouTubeMobile({
  context,
  ctx,
  theme,
}: {
  context: PreviewContext;
  ctx: YtContext;
  theme: PreviewTheme;
}) {
  const { imageUrl, variantName, fit, brand } = context;
  const shortBrand = truncate(brand.name, 16);

  return (
    <PhoneFrame
      dark={theme !== 'light'}
      label={`YouTube mobile app — ${variantName}`}
    >
      <div className={`yt-m ${theme === 'light' ? 'light' : ''}`}>
        <MobileTop brand={brand} />
        <div className="yt-mbody">
          {ctx === 'watch' && (
            <>
              {/* 1. Main video */}
              <WatchVideoPlayer
                url={imageUrl}
                alt={`${variantName} shown in YouTube mobile watch feed`}
                fit={fit}
                adj={context.adjustment}
                className="yt-bleed"
              />

              {/* 2. Title, 3. Channel, 4. Actions, 5. Metadata */}
              <div className="yt-mwatch">
                <h1 className="yt-mwatch-title">
                  {variantName} — campaign hero
                </h1>

                <div className="yt-mwatch-meta">
                  <span>1.2M views</span>
                  <span>·</span>
                  <span>2 hours ago</span>
                  <span style={{ color: '#3ea6ff' }}>#design #campaign</span>
                </div>

                <div className="yt-mwatch-chrow">
                  <BrandAvatar brand={brand} size={32} fontSize={12} />
                  <div className="yt-chinfo" style={{ flex: 1 }}>
                    <div className="yt-chname-wrap">
                      <span className="yt-chname" style={{ fontSize: 13 }}>
                        {shortBrand}
                      </span>
                      <span className="yt-badge-check">
                        <Icon name="check" size={11} />
                      </span>
                    </div>
                    <span className="yt-chsub" style={{ fontSize: 11 }}>
                      128K subscribers
                    </span>
                  </div>
                  <button
                    type="button"
                    className="yt-subbtn"
                    style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                  >
                    Subscribe
                  </button>
                </div>

                <div className="yt-mchips">
                  <div className="yt-pill-group" style={{ height: 30 }}>
                    <button
                      type="button"
                      className="yt-pill-btn"
                      style={{ fontSize: 11.5, padding: '0 10px' }}
                    >
                      <Icon name="like" size={13} /> 24K
                    </button>
                    <span className="yt-pill-divider" style={{ height: 14 }} />
                    <button
                      type="button"
                      className="yt-pill-btn"
                      style={{ fontSize: 11.5, padding: '0 10px' }}
                    >
                      <Icon name="dislike" size={13} />
                    </button>
                  </div>
                  <span
                    className="yt-pill"
                    style={{ height: 30, fontSize: 11.5, padding: '0 10px' }}
                  >
                    <Icon name="share" size={13} /> Share
                  </span>
                  <span
                    className="yt-pill"
                    style={{ height: 30, fontSize: 11.5, padding: '0 10px' }}
                  >
                    <Icon name="download" size={13} /> Download
                  </span>
                  <span
                    className="yt-pill"
                    style={{ height: 30, fontSize: 11.5, padding: '0 10px' }}
                  >
                    <Icon name="save" size={13} /> Save
                  </span>
                </div>

                <div className="yt-mcomments-box">
                  <div className="yt-mcomments-head">
                    <span>
                      Comments <b style={{ color: 'var(--yttext)' }}>482</b>
                    </span>
                  </div>
                  <div className="yt-mcomments-preview">
                    <span className="yt-mcomments-preview-avatar">E</span>
                    <span className="truncate">
                      The color grading in the opening sequence is incredible...
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Recommendations */}
              <div className="yt-m-rec-header">Up next</div>
              <div className="yt-m-rec-list">
                {YT_DUMMY_VIDEOS.map((v, i) => (
                  <div className="yt-m-rec-item" key={i}>
                    <div className="yt-m-rec-thumb">
                      <DummyTile
                        index={i + 1}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <span className="yt-duration">{v.dur}</span>
                      </DummyTile>
                    </div>
                    <div className="yt-m-rec-info">
                      <h2 className="yt-m-rec-title">{v.title}</h2>
                      <div className="yt-m-rec-meta">
                        {v.channel || brand.name}
                      </div>
                      <div className="yt-m-rec-meta">{v.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ctx === 'search' && (
            <>
              <div style={{ padding: '2px 12px 10px' }}>
                <div className="yt-search" style={{ maxWidth: 'none' }}>
                  <Icon name="search" size={15} />
                  <span className="q">{variantName} campaign</span>
                </div>
              </div>
              <div className="yt-mlist" style={{ paddingTop: 0 }}>
                <div className="yt-result">
                  <Thumb
                    url={imageUrl}
                    alt={`${variantName} shown as a YouTube mobile search result`}
                    fit={fit}
                    duration="3:42"
                    adj={context.adjustment}
                  />
                  <div className="yt-rinfo">
                    <p
                      className="yt-rtitle"
                      style={{ fontSize: 13.5, fontWeight: 600 }}
                    >
                      {variantName} — campaign hero
                    </p>
                    <p className="yt-rmeta">1.2K views · 2 hours ago</p>
                    <div className="yt-rch" style={{ marginTop: 8 }}>
                      <BrandAvatar brand={brand} size={22} fontSize={9} />
                      <span>{shortBrand}</span>
                    </div>
                  </div>
                </div>
                {YT_DUMMY_VIDEOS.slice(0, 3).map((v, i) => (
                  <div className="yt-result" key={i} aria-hidden="true">
                    <DummyTile
                      index={i + 1}
                      style={{
                        width: 148,
                        aspectRatio: '16 / 9',
                        borderRadius: 8,
                        flex: 'none',
                      }}
                    >
                      <span className="yt-duration">{v.dur}</span>
                    </DummyTile>
                    <div className="yt-rinfo">
                      <p
                        className="yt-rtitle"
                        style={{ fontSize: 12.5, fontWeight: 500 }}
                      >
                        {v.title}
                      </p>
                      <p className="yt-rmeta">{v.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {ctx === 'channel' && (
            <>
              <BrandBanner
                brand={brand}
                className="yt-banner"
                style={{
                  margin: '2px 12px 0',
                  aspectRatio: '30 / 9',
                  borderRadius: 10,
                }}
                imgAlt="Channel banner preview"
              />
              <div
                className="yt-chhead"
                style={{ padding: '12px 12px 4px', gap: 12 }}
              >
                <BrandAvatar brand={brand} size={44} fontSize={17} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="yt-chname" style={{ fontSize: 15 }}>
                    {brand.name}
                  </div>
                  <div className="yt-chsub">772 subscribers</div>
                </div>
                <span
                  className="yt-subbtn"
                  style={{ height: 30, padding: '0 14px', fontSize: 12.5 }}
                >
                  Subscribe
                </span>
              </div>
              <div className="yt-tabs" style={{ padding: '0 12px' }}>
                <span className="yt-tab">Home</span>
                <span className="yt-tab on">Videos</span>
                <span className="yt-tab">Shorts</span>
                <span className="yt-tab">Playlists</span>
              </div>
              <div className="yt-mgrid">
                <div>
                  <Thumb
                    url={imageUrl}
                    alt={`${variantName} shown as a YouTube mobile video card`}
                    fit={fit}
                    duration="3:42"
                    adj={context.adjustment}
                  />
                  <p className="yt-card-title">{variantName} — campaign hero</p>
                  <p className="yt-card-meta">1K views · 3 months ago</p>
                </div>
                {YT_DUMMY_VIDEOS.slice(0, 3).map((v, i) => (
                  <div key={i}>
                    <DummyTile
                      index={i + 2}
                      style={{ aspectRatio: '16 / 9', borderRadius: 10 }}
                    >
                      <span className="yt-duration">{v.dur}</span>
                    </DummyTile>
                    <p className="yt-card-title">{v.title}</p>
                    <p className="yt-card-meta">{v.meta}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    </PhoneFrame>
  );
}

/* ---------- entry ---------- */

export function YouTubePreview({
  context,
  device,
  contextId,
  theme = 'dark',
}: {
  context: PreviewContext;
  device: DeviceMode;
  contextId?: string;
  theme?: PreviewTheme;
}) {
  const ctx = normalizeContext(contextId);
  const cls = theme === 'light' ? 'yt light' : 'yt';
  if (device === 'mobile')
    return <YouTubeMobile context={context} ctx={ctx} theme={theme} />;
  if (ctx === 'search')
    return (
      <div className={cls}>
        <SearchDesktop context={context} />
      </div>
    );
  if (ctx === 'channel')
    return (
      <div className={cls}>
        <ChannelDesktop context={context} />
      </div>
    );
  return (
    <div className={cls}>
      <WatchDesktop context={context} />
    </div>
  );
}
