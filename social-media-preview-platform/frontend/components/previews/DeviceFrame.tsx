import type { DeviceMode, FitMode } from '@/lib/types';
import type { PreviewContext } from './PreviewRenderer';
import { CheckIcon, CommentIcon, GlobeIcon, HeartIcon, MusicIcon, RepostIcon, SendIcon, ShareIcon, ThumbsUpIcon } from '@/components/icons';

/** Phone frame used for the mobile device mode (distinct portrait context —
 * never a scaled-down desktop canvas, per NAV-008). */
export function PhoneFrame({
  children,
  dark,
  label,
}: {
  children: React.ReactNode;
  dark?: boolean;
  label?: string;
}) {
  return (
    <div
      className="phone"
      role="img"
      aria-label={label ? `Mobile preview: ${label}` : 'Mobile preview'}
    >
      <div className="phone-screen" style={dark ? { background: '#000' } : undefined}>
        <div className="phone-notch" />
        <div className="phone-body">{children}</div>
      </div>
    </div>
  );
}

/** The creative image inside a simulated context, honoring the fit rule. */
export function CreativeImage({
  url,
  alt,
  fit,
  containClass,
  cropClass,
}: {
  url: string | null;
  alt: string;
  fit: FitMode;
  containClass?: string;
  cropClass?: string;
}) {
  const cls = fit === 'contain' ? containClass : cropClass;
  if (!url) {
    return (
      <div className={cls} style={{ color: 'var(--muted)', fontSize: 12 }}>
        No image
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={fit === 'contain' ? containClass : undefined} />;
}

export const Engagement = {
  ThumbsUp: ThumbsUpIcon,
  Heart: HeartIcon,
  Comment: CommentIcon,
  Repost: RepostIcon,
  Send: SendIcon,
  Share: ShareIcon,
  Globe: GlobeIcon,
  Music: MusicIcon,
  Check: CheckIcon,
};
