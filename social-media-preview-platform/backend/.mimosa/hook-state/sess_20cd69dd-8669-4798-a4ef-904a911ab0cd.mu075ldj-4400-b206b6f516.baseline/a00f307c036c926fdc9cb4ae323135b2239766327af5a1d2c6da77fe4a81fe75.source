// Platform context catalogue (SRS §5) — shared data used by share/preview
// validation. Mirrors the frontend catalogue in lib/platforms.ts.

export interface PlatformContextDef {
  id: string;
  label: string;
}

export interface PlatformDef {
  id: string;
  label: string;
  contexts: PlatformContextDef[];
  ratio: number;
  mobileFirst: boolean;
  accent: string;
}

export const PLATFORMS: Record<string, PlatformDef> = {
  youtube: {
    id: "youtube",
    label: "YouTube",
    contexts: [
      { id: "watch", label: "Watch feed" },
      { id: "search", label: "Search results" },
      { id: "channel", label: "Channel page" },
    ],
    ratio: 16 / 9,
    mobileFirst: false,
    accent: "#FF0033",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    contexts: [
      { id: "feed", label: "Feed post" },
      { id: "profile", label: "Profile grid" },
    ],
    ratio: 4 / 5,
    mobileFirst: false,
    accent: "#D63384",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    contexts: [
      { id: "feed", label: "Feed post" },
      { id: "page", label: "Page + feed" },
    ],
    ratio: 1.91,
    mobileFirst: false,
    accent: "#1877F2",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    contexts: [
      { id: "foryou", label: "For You feed" },
      { id: "profile", label: "Profile grid" },
    ],
    ratio: 9 / 16,
    mobileFirst: true,
    accent: "#111111",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    contexts: [
      { id: "feed", label: "Feed post" },
      { id: "page", label: "Page + feed" },
    ],
    ratio: 1.91,
    mobileFirst: false,
    accent: "#0A66C2",
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORMS);

export function isPlatformId(value: string): boolean {
  return PLATFORM_IDS.includes(value);
}

export function isValidContext(platform: string, contextId: unknown): boolean {
  if (typeof contextId !== "string") return false;
  return PLATFORMS[platform]?.contexts.some((c) => c.id === contextId) ?? false;
}

export function defaultContext(platform: string): string {
  return PLATFORMS[platform]?.contexts[0]?.id ?? "feed";
}

export function contextLabel(platform: string, contextId: string | null | undefined): string {
  const found = PLATFORMS[platform]?.contexts.find((c) => c.id === contextId);
  return found ? found.label : (PLATFORMS[platform]?.contexts[0]?.label ?? "Feed");
}

export function slugHandle(name: string): string {
  return (
    "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24)
  );
}
