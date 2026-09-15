import type { CropAdjustment, PreviewBrand } from '@/lib/types';

/* Shared building blocks for the platform mockups. These are engineering
 * helpers only — every platform composes them into its own authentic
 * structure (see the individual preview components). */

/**
 * Inline styles that apply a variant's crop adjustment to a creative image
 * (object-position moves the crop origin; scale zooms inside the clipped
 * container). Returns undefined when the adjustment is neutral.
 */
export function creativeImgStyle(
  adj?: CropAdjustment,
): React.CSSProperties | undefined {
  if (!adj || (adj.x === 0 && adj.y === 0 && (adj.scale === 1 || !adj.scale)))
    return undefined;
  return {
    objectPosition: `${50 + adj.x}% ${50 + adj.y}%`,
    transform: adj.scale !== 1 ? `scale(${adj.scale})` : undefined,
    transformOrigin: 'center',
  };
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'B';
}

export function slugHandle(name: string): string {
  return (
    '@' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24)
  );
}

/** Platform avatar: the uploaded brand logo when present, else an initial. */
export function BrandAvatar({
  brand,
  size,
  radius,
  fontSize,
  className,
}: {
  brand: PreviewBrand;
  size: number;
  radius?: string | number;
  fontSize?: number;
  className?: string;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: fontSize ?? Math.max(10, Math.round(size * 0.4)),
    flex: 'none',
  };
  if (brand.logoUrl) {
    return (
      <span
        className={className}
        style={{
          ...style,
          borderRadius: radius ?? '50%',
          overflow: 'hidden',
          display: 'inline-flex',
          background: 'var(--neutral-soft)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.logoUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </span>
    );
  }
  return (
    <span
      className={className}
      style={{
        ...style,
        borderRadius: radius ?? '50%',
        background: 'var(--brand)',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
      }}
    >
      {initials(brand.name)}
    </span>
  );
}

/** Deterministic gradient for dummy content tiles (varied, non-distracting). */
const TILE_PALETTES: Array<[string, string]> = [
  ['#3d5a73', '#6e8ca3'],
  ['#7a5c46', '#a98d72'],
  ['#544a6b', '#8b7fa8'],
  ['#4f6b57', '#84a68f'],
  ['#6b4f57', '#a08089'],
  ['#56636b', '#93a1ab'],
];

export function DummyTile({
  index,
  children,
  className,
  style,
}: {
  index: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [a, b] = TILE_PALETTES[index % TILE_PALETTES.length];
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${a} 0%, ${b} 55%, ${a} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0 18px, rgba(255,255,255,0) 18px 42px)',
        }}
      />
      {children}
    </div>
  );
}

/**
 * Synthetic brand banner (YouTube channel art, Facebook cover, LinkedIn
 * banner): rendered with the brand name, tagline and decorative shapes so the
 * user can judge banner branding without a separate upload. An uploaded
 * banner image replaces this composition.
 */
export function BrandBanner({
  brand,
  className,
  style,
  imgAlt,
}: {
  brand: PreviewBrand;
  className?: string;
  style?: React.CSSProperties;
  imgAlt?: string;
}) {
  if (brand.bannerUrl) {
    return (
      <div className={className} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.bannerUrl}
          alt={imgAlt || 'Uploaded brand banner'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }
  return (
    <div
      className={className}
      style={{
        background:
          'linear-gradient(112deg, #0a7f7b 0%, #0abab5 46%, #084c4a 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        containerType: 'inline-size',
        ...style,
      }}
      aria-label="Generated brand banner preview"
    >
      {/* decorative shapes */}
      <span
        style={{
          position: 'absolute',
          right: '-6%',
          top: '-70%',
          width: '42%',
          paddingBottom: '42%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: '16%',
          bottom: '-90%',
          width: '34%',
          paddingBottom: '34%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '-4%',
          bottom: '-40%',
          width: '22%',
          paddingBottom: '22%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />
      <div style={{ position: 'relative', padding: '0 6%', minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 'clamp(14px, 2.6cqw, 30px)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {brand.name}
        </div>
        {brand.tagline && (
          <div
            style={{
              fontSize: 'clamp(9px, 1.5cqw, 15px)',
              opacity: 0.9,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {brand.tagline}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- per-platform dummy content ---------- */

export interface YtDummyVideo {
  title: string;
  channel?: string;
  meta: string;
  dur: string;
}

export const YT_DUMMY_VIDEOS: YtDummyVideo[] = [
  {
    title: 'Behind the scenes of our latest shoot',
    channel: 'Creative Studio Pro',
    meta: '48K views · 1 week ago',
    dur: '12:04',
  },
  {
    title: 'How we plan a high-converting campaign in 3 steps',
    channel: 'Brand Strategy Lab',
    meta: '112K views · 3 weeks ago',
    dur: '8:31',
  },
  {
    title: 'Client results after the first 60 days of launch',
    channel: 'Growth Weekly',
    meta: '9.4K views · 1 month ago',
    dur: '5:17',
  },
  {
    title: 'Studio tour + the production gear we actually use',
    channel: 'Visual Cinema Tech',
    meta: '231K views · 2 months ago',
    dur: '15:49',
  },
  {
    title: 'Quick tip: video hooks and thumbnails that get clicks',
    channel: 'Media Masterclass',
    meta: '66K views · 3 months ago',
    dur: '4:02',
  },
  {
    title: 'Creative Direction Q&A: answering your top 10 questions',
    channel: 'Design Matters',
    meta: '18K views · 4 months ago',
    dur: '9:58',
  },
  {
    title: 'Color grading and pacing breakdown for commercial ads',
    channel: 'Colorist Academy',
    meta: '74K views · 5 months ago',
    dur: '14:20',
  },
];

export interface YtDummyComment {
  id: string;
  author: string;
  handle: string;
  avatarColor: string;
  time: string;
  text: string;
  likes: string;
  isPinned?: boolean;
}

export const YT_DUMMY_COMMENTS: YtDummyComment[] = [
  {
    id: 'c1',
    author: 'Brand Team',
    handle: '@creator',
    avatarColor: '#0ABAB5',
    time: '2 hours ago',
    text: 'Thanks for checking out the launch cut! Drop your thoughts on the creative direction and ending call-to-action below.',
    likes: '142',
    isPinned: true,
  },
  {
    id: 'c2',
    author: 'Elena Rostova',
    handle: '@elena_designs',
    avatarColor: '#7c3aed',
    time: '1 hour ago',
    text: 'The color grading in the opening sequence is incredible. It sets the premium tone right away.',
    likes: '38',
  },
  {
    id: 'c3',
    author: 'Marcus Vance',
    handle: '@marcus_vfx',
    avatarColor: '#2563eb',
    time: '45 minutes ago',
    text: 'That transition at 0:14 was super smooth. Much stronger visual impact than the previous draft!',
    likes: '19',
  },
  {
    id: 'c4',
    author: 'Aria Chen',
    handle: '@ariachen_creative',
    avatarColor: '#db2777',
    time: '20 minutes ago',
    text: 'Clean messaging and the call-to-action is crystal clear. Ready to publish in my opinion.',
    likes: '7',
  },
];

export const IG_DUMMY_POSTS = [
  {
    likes: '2,314',
    caption:
      'Concept boards for the autumn drop — which direction do you like?',
    time: '1d',
  },
  {
    likes: '987',
    caption: 'Behind the scenes with the design team today',
    time: '4d',
  },
];

export const IG_DUMMY_TILES = 8; // grid tiles after the uploaded creative

export const FB_DUMMY_POSTS = [
  {
    text: 'Our team is hiring! Looking for a motion designer to join the studio — apply below.',
    reactions: '184',
    comments: '23 comments · 6 shares',
    time: '1d',
  },
  {
    text: 'Throwback to last year’s launch week. Big things coming soon…',
    reactions: '97',
    comments: '11 comments · 3 shares',
    time: '5d',
  },
];

export const TK_DUMMY_VIDEOS = [
  { views: '412.1K', caption: 'packing orders 📦 asmr' },
  { views: '88.9K', caption: 'design process, part 2' },
  { views: '1.2M', caption: 'the reveal you asked for' },
  { views: '73.4K', caption: 'studio reset day' },
  { views: '256K', caption: '3 tips for better grids' },
  { views: '19.7K', caption: 'behind the scenes 🎬' },
];

export const LI_DUMMY_POSTS = [
  {
    text: 'We are excited to share that our team grew by three this month. Welcome aboard!',
    social: ' Aunt Maya and 214 others · 31 Comments',
    time: '3d',
  },
  {
    text: 'New case study: how a refreshed brand system lifted engagement by 38% in one quarter.',
    social: ' 96 Votes · 18 Comments',
    time: '1w',
  },
];
