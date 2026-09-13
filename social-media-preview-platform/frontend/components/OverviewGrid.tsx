"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PlatformId, Project, VariantView } from "@/lib/types";
import { PLATFORMS, PLATFORM_IDS, contextLabel, defaultContext } from "@/lib/platforms";
import { PreviewRenderer } from "@/components/previews/PreviewRenderer";
import { GridIcon } from "@/components/icons";

/** Rendered width of each platform's desktop mockup, for overview scaling. */
const MOCK_WIDTH: Record<PlatformId, number> = {
  youtube: 960,
  instagram: 470,
  facebook: 700,
  tiktok: 960,
  linkedin: 640,
};

/**
 * All-platforms overview: the active creative rendered in every platform
 * context at once (scaled thumbnails), like a contact sheet.
 */
export function OverviewGrid({
  project,
  variants,
  activeVariantId,
}: {
  project: Project;
  variants: VariantView[];
  activeVariantId: string | null;
}) {
  const router = useRouter();
  const activeVariant =
    variants.find((v) => v.id === activeVariantId) || variants[0] || null;
  const brand = useMemo(
    () => ({
      name: project.brandName || project.title,
      handle: project.brandHandle
        ? project.brandHandle.startsWith("@")
          ? project.brandHandle
          : "@" + project.brandHandle
        : "@" + project.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20),
      tagline: project.brandTagline || project.description || "",
      logoUrl: project.logoAssetId ? `/api/assets/${project.logoAssetId}` : null,
      bannerUrl: project.bannerAssetId ? `/api/assets/${project.bannerAssetId}` : null,
    }),
    [project],
  );

  return (
    <main className="overview-page">
      <header className="overview-head">
        <div>
          <h1 className="overview-title">All Platforms</h1>
          <p className="overview-sub">
            {project.title}
            {activeVariant ? ` · ${activeVariant.name}` : ""}
            {activeVariant?.asset
              ? ` · ${activeVariant.asset.width}×${activeVariant.asset.height}`
              : ""}
          </p>
        </div>
        <span className="chip">
          <GridIcon size={12} /> {PLATFORM_IDS.length} platforms
        </span>
      </header>

      {!activeVariant ? (
        <div className="home-empty">
          <p>
            No creative yet. Go back to the workspace and upload an image to see it across every
            platform.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={() =>
              router.push(`/project/${project.id}/${project.lastPlatform || "linkedin"}`)
            }
          >
            Back to workspace
          </button>
        </div>
      ) : (
        <div className="overview-grid">
          {PLATFORM_IDS.map((p) => {
            const def = PLATFORMS[p];
            const Icon = { youtube: "▶", instagram: "◎", facebook: "f", tiktok: "♪", linkedin: "in" }[p];
            const scale = 340 / MOCK_WIDTH[p];
            return (
              <button
                key={p}
                className="overview-card"
                onClick={() => router.push(`/project/${project.id}/${p}`)}
                aria-label={`Open ${def.label} preview`}
              >
                <div className="overview-card-top">
                  <span className="overview-platform">
                    <b className="overview-glyph" style={{ color: def.accent }}>
                      {Icon}
                    </b>
                    {def.label}
                  </span>
                  <span className="overview-ratio">
                    {def.ratio >= 1 ? `${def.ratio.toFixed(2).replace(/\.?0+$/, "")}:1` : `1:${(1 / def.ratio).toFixed(2).replace(/\.?0+$/, "")}`}
                  </span>
                </div>
                <div className="overview-preview">
                  <div
                    style={{
                      width: `${100 / scale}%`,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <PreviewRenderer
                      platform={p}
                      contextId={defaultContext(p)}
                      device="desktop"
                      context={{
                        projectName: project.title,
                        variantName: activeVariant.name,
                        imageUrl: `/api/assets/${activeVariant.assetId}`,
                        fit: "crop",
                        brand,
                        adjustment: activeVariant.adjustments?.[p],
                      }}
                    />
                  </div>
                </div>
                <div className="overview-card-foot">
                  <span className="truncate">
                    {brand.name} · {contextLabel(p, defaultContext(p))}
                  </span>
                  <span className="overview-open">Open →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
