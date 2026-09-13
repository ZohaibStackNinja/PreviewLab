"use client";

import { useMemo, useState } from "react";
import type { PlatformId, Project, VariantView } from "@/lib/types";
import { PLATFORMS, PLATFORM_IDS, contextLabel, defaultContext } from "@/lib/platforms";
import { PreviewRenderer } from "@/components/previews/PreviewRenderer";
import { SwapIcon } from "@/components/icons";

function PlatformSelect({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: PlatformId;
  onChange: (p: PlatformId) => void;
  label: string;
}) {
  return (
    <label className="compare-select">
      <span className="field-label" style={{ position: "absolute", left: -9999 }}>{label}</span>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as PlatformId)}
      >
        {PLATFORM_IDS.map((p) => (
          <option key={p} value={p}>
            {PLATFORMS[p].label} · {contextLabel(p, defaultContext(p))}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Side-by-side comparison of the creative in two platform contexts. */
export function CompareView({
  project,
  variants,
  activeVariantId,
  initialLeft,
  initialRight,
}: {
  project: Project;
  variants: VariantView[];
  activeVariantId: string | null;
  initialLeft: PlatformId;
  initialRight: PlatformId;
}) {
  const [left, setLeft] = useState<PlatformId>(initialLeft);
  const [right, setRight] = useState<PlatformId>(initialRight);
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

  const renderSide = (p: PlatformId) => (
    <div className="compare-card">
      <h2 className="compare-card-title">
        {PLATFORMS[p].label} · {contextLabel(p, defaultContext(p))}
      </h2>
      <div className="compare-canvas">
        {activeVariant ? (
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
        ) : (
          <p className="comments-empty">Upload a creative to compare platforms.</p>
        )}
      </div>
    </div>
  );

  return (
    <main className="overview-page">
      <header className="overview-head">
        <div>
          <h1 className="overview-title">Compare Platforms</h1>
          <p className="overview-sub">
            {project.title}
            {activeVariant ? ` · ${activeVariant.name}` : ""}
          </p>
        </div>
        <div className="compare-controls">
          <PlatformSelect id="cmp-left" value={left} onChange={setLeft} label="Left platform" />
          <span className="compare-swap" aria-hidden="true">
            <SwapIcon size={16} />
          </span>
          <PlatformSelect id="cmp-right" value={right} onChange={setRight} label="Right platform" />
        </div>
      </header>

      <div className="compare-grid">
        {renderSide(left)}
        {renderSide(right)}
      </div>
    </main>
  );
}
