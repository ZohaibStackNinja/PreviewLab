'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  CropAdjustment,
  DeviceMode,
  FitMode,
  PreviewBrand,
  PreviewTheme,
  Project,
  ProjectSummary,
  ShareView,
  VariantView,
} from '@/lib/types';
import type { PlatformId } from '@/lib/types';
import {
  DEFAULT_PLATFORM,
  PLATFORMS,
  PLATFORM_IDS,
  contextLabel,
  defaultContext,
} from '@/lib/platforms';
import {
  ApiError,
  api,
  del,
  patchJson,
  postForm,
  postJson,
} from '@/lib/client';
import { formatBytes, formatDimensions } from '@/lib/format';
import { PreviewRenderer } from '@/components/previews/PreviewRenderer';
import { ShareModal } from '@/components/ShareModal';
import { BrandModal } from '@/components/BrandModal';
import { CommentsPanel, type CommentItem } from '@/components/Comments';
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CommentIcon,
  CropIcon,
  DesktopIcon,
  FacebookIcon,
  GridIcon,
  ImageIcon,
  InstagramIcon,
  LinkedInIcon,
  MenuIcon,
  MobileIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  PresentIcon,
  ResetIcon,
  ShareIcon,
  SwapIcon,
  TikTokIcon,
  TrashIcon,
  UploadIcon,
  YouTubeIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/icons';
import { UploadModal } from '@/components/UploadModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const PLATFORM_ICONS: Record<
  PlatformId,
  (p: { size?: number }) => React.ReactNode
> = {
  youtube: (p) => <YouTubeIcon {...p} />,
  instagram: (p) => <InstagramIcon {...p} />,
  facebook: (p) => <FacebookIcon {...p} />,
  tiktok: (p) => <TikTokIcon {...p} />,
  linkedin: (p) => <LinkedInIcon {...p} />,
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function Workspace({
  project: initialProject,
  initialVariants,
  initialShares,
  platform,
  initialDevice,
  initialContext,
}: {
  project: Project;
  initialVariants: VariantView[];
  initialShares: ShareView[];
  platform: PlatformId;
  initialDevice: DeviceMode;
  initialContext: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [variants, setVariants] = useState(initialVariants);
  const [shares, setShares] = useState(initialShares);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    initialProject.activeVariantId &&
      initialVariants.some((v) => v.id === initialProject.activeVariantId)
      ? initialProject.activeVariantId
      : (initialVariants[0]?.id ?? null),
  );
  const [device, setDevice] = useState<DeviceMode>(initialDevice);
  const [ctx, setCtx] = useState<string>(initialContext);
  const [ytTheme, setYtTheme] = useState<PreviewTheme>('dark');
  const [brandOpen, setBrandOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [fit, setFit] = useState<FitMode>('crop');
  const [zoom, setZoom] = useState(1);
  const [presenting, setPresenting] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [railDrawer, setRailDrawer] = useState(false);
  const [commentsDrawer, setCommentsDrawer] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adj, setAdj] = useState<CropAdjustment>({ x: 0, y: 0, scale: 1 });
  const [adjDirty, setAdjDirty] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    kind: 'delete' | 'replace';
    variant: VariantView;
  } | null>(null);
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renameFor, setRenameFor] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; error?: boolean }>
  >([]);

  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<string | null>(null);
  const failedSaveRef = useRef<(() => Promise<void>) | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  const platformDef = PLATFORMS[platform];
  const activeVariant = variants.find((v) => v.id === activeVariantId) || null;
  const imageUrl = activeVariant
    ? `/api/assets/${activeVariant.assetId}`
    : null;

  // Brand identity resolved from project settings (logo/banner/name/handle).
  const brand: PreviewBrand = useMemo(
    () => ({
      name: project.brandName || project.title,
      handle: project.brandHandle
        ? project.brandHandle.startsWith('@')
          ? project.brandHandle
          : '@' + project.brandHandle
        : '@' +
          project.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '')
            .slice(0, 20),
      tagline: project.brandTagline || project.description || '',
      logoUrl: project.logoAssetId
        ? `/api/assets/${project.logoAssetId}`
        : null,
      bannerUrl: project.bannerAssetId
        ? `/api/assets/${project.bannerAssetId}`
        : null,
    }),
    [project],
  );

  // Project switcher (lazy-loads the list while open).
  useEffect(() => {
    if (!switcherOpen) return;
    api<{ projects: ProjectSummary[] }>('/api/projects')
      .then((d) => setProjects(d.projects))
      .catch(() => setProjects([]));
    const onDoc = (e: MouseEvent) => {
      const el = switcherRef.current;
      if (el && !el.contains(e.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [switcherOpen]);

  const toast = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, error }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      2600,
    );
  }, []);

  const newProject = useCallback(async () => {
    setSwitcherOpen(false);
    router.push('/start');
  }, [router]);

  // ---------- save-state wrapper ----------
  const withSave = useCallback(
    async (run: () => Promise<unknown>) => {
      setSaveState('saving');
      try {
        await run();
        failedSaveRef.current = null;
        setSaveState('saved');
      } catch (e) {
        failedSaveRef.current = () => withSave(run);
        setSaveState('error');
        toast(
          e instanceof Error ? e.message : 'Save failed. Please try again.',
          true,
        );
      }
    },
    [toast],
  );

  const retrySave = useCallback(() => {
    failedSaveRef.current?.();
  }, []);

  // ---------- project + state mutations ----------
  const renameProject = useCallback(
    (title: string) => {
      const t = title.trim();
      if (!t || t === project.title) return;
      withSave(() =>
        patchJson(`/api/projects/${project.id}`, { title: t }).then(() =>
          setProject((p) => ({ ...p, title: t })),
        ),
      );
    },
    [project.id, project.title, withSave],
  );

  const selectVariant = useCallback(
    (id: string) => {
      if (id === activeVariantId) return;
      setActiveVariantId(id);
      withSave(() =>
        patchJson(`/api/projects/${project.id}`, { activeVariantId: id }),
      );
    },
    [activeVariantId, project.id, withSave],
  );

  /** Persists the crop adjustment for the active variant + platform. */
  const applyAdjust = useCallback(
    (next: CropAdjustment) => {
      if (!activeVariant) return;
      const adjustments = {
        ...(activeVariant.adjustments || {}),
        [platform]: next,
      };
      withSave(() =>
        patchJson<{ variant: VariantView }>(
          `/api/variants/${activeVariant.id}`,
          {
            adjustments,
          },
        ).then(({ variant }) => {
          setVariants((vs) =>
            vs.map((v) => (v.id === variant.id ? variant : v)),
          );
          setAdjDirty(false);
          toast(`Crop applied to ${PLATFORMS[platform].label}.`);
        }),
      );
    },
    [activeVariant, platform, toast, withSave],
  );

  /** Opens the crop-adjust panel with the stored values. */
  const openAdjust = useCallback(() => {
    setAdj(activeVariant?.adjustments?.[platform] || { x: 0, y: 0, scale: 1 });
    setAdjDirty(false);
    setAdjustOpen(true);
  }, [activeVariant, platform]);

  const switchDevice = useCallback(
    (next: DeviceMode) => {
      if (next === device) return;
      setDevice(next);
      withSave(() =>
        patchJson(`/api/projects/${project.id}`, { lastDevice: next }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set('device', next);
      window.history.replaceState(null, '', url.toString());
    },
    [device, project.id, withSave],
  );

  const switchContext = useCallback(
    (next: string) => {
      if (next === ctx) return;
      setCtx(next);
      withSave(() =>
        patchJson(`/api/projects/${project.id}`, { lastContext: next }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set('context', next);
      window.history.replaceState(null, '', url.toString());
    },
    [ctx, project.id, withSave],
  );

  const switchPlatform = useCallback(
    (next: PlatformId) => {
      if (next === platform) {
        setRailDrawer(false);
        return;
      }
      setRailDrawer(false);
      setCtx(defaultContext(next)); // placement resets per destination
      patchJson(`/api/projects/${project.id}`, { lastPlatform: next })
        .catch(() => undefined)
        .finally(() => router.push(`/project/${project.id}/${next}`));
    },
    [platform, project.id, router],
  );

  // ---------- uploads ----------
  const readDimensions = (
    file: File,
  ): Promise<{ width: number; height: number }> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      if (!(SUPPORTED_TYPES as string[]).includes(file.type)) {
        setUploadError(
          'Unsupported file type. Please upload a PNG, JPEG or WebP image.',
        );
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(
          'That image is larger than 10 MB. Please upload a smaller file.',
        );
        return;
      }
      setUploading(true);
      try {
        const dims = await readDimensions(file);
        const form = new FormData();
        form.append('file', file);
        form.append('width', String(dims.width));
        form.append('height', String(dims.height));
        const { variant } = await postForm<{ variant: VariantView }>(
          `/api/projects/${project.id}/variants`,
          form,
        );
        setVariants((vs) => [...vs, variant]);
        setActiveVariantId(variant.id);
        setProject((p) => ({ ...p, activeVariantId: variant.id }));
        setSaveState('saved');
        toast(`“${variant.name}” added as a new variant.`);
      } catch (e) {
        setUploadError(
          e instanceof ApiError
            ? e.message
            : 'The upload failed. Please try again.',
        );
      } finally {
        setUploading(false);
      }
    },
    [project.id, toast],
  );

  const replaceImage = useCallback(
    async (file: File) => {
      const variantId = replaceTargetRef.current;
      if (!variantId) return;
      setUploadError(null);
      if (!(SUPPORTED_TYPES as string[]).includes(file.type)) {
        setUploadError(
          'Unsupported file type. Please upload a PNG, JPEG or WebP image.',
        );
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(
          'That image is larger than 10 MB. Please upload a smaller file.',
        );
        return;
      }
      setUploading(true);
      try {
        const dims = await readDimensions(file);
        const form = new FormData();
        form.append('file', file);
        form.append('width', String(dims.width));
        form.append('height', String(dims.height));
        const { variant } = await postForm<{ variant: VariantView }>(
          `/api/variants/${variantId}/replace`,
          form,
        );
        setVariants((vs) => vs.map((v) => (v.id === variant.id ? variant : v)));
        setSaveState('saved');
        toast(`“${variant.name}” image replaced.`);
      } catch (e) {
        setUploadError(
          e instanceof ApiError
            ? e.message
            : 'The replacement failed. Please try again.',
        );
      } finally {
        setUploading(false);
        replaceTargetRef.current = null;
      }
    },
    [toast],
  );

  const renameVariant = useCallback(
    (id: string, name: string) => {
      const n = name.trim();
      if (!n) return;
      withSave(() =>
        patchJson<{ variant: VariantView }>(`/api/variants/${id}`, {
          name: n,
        }).then(({ variant }) =>
          setVariants((vs) => vs.map((v) => (v.id === id ? variant : v))),
        ),
      );
    },
    [withSave],
  );

  const removeVariant = useCallback(
    (id: string) => {
      withSave(() =>
        del(`/api/variants/${id}`).then(() => {
          setVariants((vs) => {
            const rest = vs.filter((v) => v.id !== id);
            if (id === activeVariantId) {
              const next = rest[0]?.id ?? null;
              setActiveVariantId(next);
              if (next) {
                patchJson(`/api/projects/${project.id}`, {
                  activeVariantId: next,
                }).catch(() => undefined);
              }
            }
            return rest;
          });
        }),
      );
      toast('Variant removed.');
    },
    [activeVariantId, project.id, toast, withSave],
  );

  // ---------- comments (owner view of the selected share) ----------
  const currentShare = useMemo(
    () =>
      shares.find(
        (s) =>
          s.variantId === activeVariantId &&
          s.platform === platform &&
          s.contextId === ctx &&
          s.device === device,
      ) || null,
    [shares, activeVariantId, platform, ctx, device],
  );

  const shownShare = useMemo(() => {
    if (selectedShareId && shares.some((s) => s.id === selectedShareId))
      return selectedShareId;
    return currentShare?.id ?? null;
  }, [selectedShareId, shares, currentShare]);

  useEffect(() => {
    setSelectedShareId(null);
  }, [activeVariantId, platform, ctx, device, ytTheme]);

  useEffect(() => {
    if (!shownShare) {
      setComments(null);
      return;
    }
    let cancelled = false;
    api<{ comments: CommentItem[] }>(`/api/shares/${shownShare}/comments`)
      .then((d) => !cancelled && setComments(d.comments))
      .catch(() => !cancelled && setComments([]));
    return () => {
      cancelled = true;
    };
  }, [shownShare]);

  const postOwnerComment = useCallback(
    async (displayName: string, body: string) => {
      if (!shownShare) return;
      const { comment } = await postJson<{ comment: CommentItem }>(
        `/api/shares/${shownShare}/comments`,
        { displayName, body },
      );
      setComments((cs) => [...(cs || []), comment]);
    },
    [shownShare],
  );

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalOpen) return; // modal handles its own Escape
      if (railDrawer || commentsDrawer) {
        setRailDrawer(false);
        setCommentsDrawer(false);
        return;
      }
      setMenuFor(null);
      if (presenting) setPresenting(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, railDrawer, commentsDrawer, presenting]);

  // ---------- rendering ----------
  const def = platformDef;
  const placement = contextLabel(platform, ctx);
  const stageTitle = `${def.label} · ${placement}`;
  const stageSub = `${device === 'desktop' ? 'Desktop' : 'Mobile'} · ${project.title}${
    activeVariant ? ` · ${activeVariant.name}` : ''
  }`;

  const saveIndicator = (
    <span
      className={`save-state ${saveState === 'saved' ? 'saved' : ''} ${saveState === 'error' ? 'error' : ''}`}
      role={saveState === 'error' ? 'alert' : 'status'}
    >
      {saveState === 'saving' ? (
        <>
          <span className="spinner" aria-hidden="true" /> Saving…
        </>
      ) : saveState === 'error' ? (
        <button
          className="btn-icon"
          onClick={retrySave}
          aria-label="Retry save"
          style={{ padding: 0, width: 'auto', gap: 6, color: 'var(--danger)' }}
        >
          ⚠ Save failed — retry
        </button>
      ) : (
        <>
          <span className="dot" aria-hidden="true" /> Saved just now
        </>
      )}
    </span>
  );

  const railContent = (
    <>
      <div className="rail-section">
        <button
          className="btn btn-primary btn-block"
          onClick={() => setUploadModalOpen(true)}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Uploading…
            </>
          ) : (
            <>
              <UploadIcon size={16} /> Upload image
            </>
          )}
        </button>
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) replaceImage(f);
            e.target.value = '';
          }}
        />
        {uploadError && (
          <p className="field-error" role="alert">
            {uploadError}
          </p>
        )}
      </div>

      <div
        className="rail-section"
        role="navigation"
        aria-label="Workspace views"
      >
        <h3 className="rail-heading">Views</h3>
        <button
          className="nav-item"
          onClick={() => router.push(`/project/${project.id}/overview`)}
        >
          <span className="nav-icon">
            <GridIcon size={18} />
          </span>
          <span className="nav-platform-label">All platforms</span>
        </button>
        <button
          className="nav-item"
          onClick={() => router.push(`/project/${project.id}/compare`)}
        >
          <span className="nav-icon">
            <SwapIcon size={18} />
          </span>
          <span className="nav-platform-label">Compare platforms</span>
        </button>
      </div>

      <div
        className="rail-section"
        role="navigation"
        aria-label="Preview destinations"
      >
        <h3 className="rail-heading">Preview destination</h3>
        {PLATFORM_IDS.map((p) => {
          const Icon = PLATFORM_ICONS[p];
          return (
            <button
              key={p}
              className={`nav-item ${p === platform ? 'active' : ''}`}
              onClick={() => switchPlatform(p)}
              aria-current={p === platform ? 'page' : undefined}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-platform-label">{PLATFORMS[p].label}</span>
            </button>
          );
        })}
      </div>

      {PLATFORMS[platform].contexts.length > 1 && (
        <div className="rail-section" role="navigation" aria-label="Placement">
          <h3 className="rail-heading">Placement</h3>
          {PLATFORMS[platform].contexts.map((c) => (
            <button
              key={c.id}
              className={`nav-item ${c.id === ctx ? 'active' : ''}`}
              onClick={() => switchContext(c.id)}
              aria-current={c.id === ctx ? 'true' : undefined}
            >
              <span className="nav-platform-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rail-section">
        <h3 className="rail-heading">Device</h3>
        <div className="seg" role="group" aria-label="Device mode">
          <button
            className={`seg-btn ${device === 'desktop' ? 'active' : ''}`}
            onClick={() => switchDevice('desktop')}
            aria-pressed={device === 'desktop'}
          >
            <DesktopIcon size={15} /> Desktop
          </button>
          <button
            className={`seg-btn ${device === 'mobile' ? 'active' : ''}`}
            onClick={() => switchDevice('mobile')}
            aria-pressed={device === 'mobile'}
          >
            <MobileIcon size={15} /> Mobile
          </button>
        </div>
      </div>

      <div className="rail-section">
        <h3 className="rail-heading">
          Creative variants{' '}
          {variants.length > 0 && (
            <span style={{ fontWeight: 400, textTransform: 'none' }}>
              · {variants.length}
            </span>
          )}
        </h3>
        {variants.length === 0 && (
          <p className="variants-empty">
            No creatives yet. Upload an image to create the first variant.
          </p>
        )}
        {variants.map((v) => (
          <div
            key={v.id}
            className={`variant-card ${v.id === activeVariantId ? 'selected' : ''}`}
            onClick={() => selectVariant(v.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectVariant(v.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={v.id === activeVariantId}
          >
            <span className="variant-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/assets/${v.assetId}`} alt="" />
            </span>
            <span className="variant-info">
              {renameFor === v.id ? (
                <input
                  className="input"
                  style={{ padding: '4px 8px', fontSize: 12.5 }}
                  value={renameValue}
                  autoFocus
                  maxLength={80}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    renameVariant(v.id, renameValue);
                    setRenameFor(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameVariant(v.id, renameValue);
                      setRenameFor(null);
                    }
                    if (e.key === 'Escape') setRenameFor(null);
                  }}
                  aria-label="Variant name"
                />
              ) : (
                <>
                  <span className="variant-name truncate">{v.name}</span>
                  <span className="variant-meta truncate">
                    {v.asset
                      ? `${formatDimensions(v.asset.width, v.asset.height)} · ${formatBytes(v.asset.bytes)}`
                      : 'image'}
                  </span>
                </>
              )}
            </span>
            <span
              style={{ position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="btn-icon variant-menu-btn"
                aria-label={`Variant options for ${v.name}`}
                aria-expanded={menuFor === v.id}
                onClick={() => setMenuFor(menuFor === v.id ? null : v.id)}
              >
                <MoreIcon size={15} />
              </button>
              {menuFor === v.id && (
                <div className="variant-menu" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setRenameValue(v.name);
                      setRenameFor(v.id);
                      setMenuFor(null);
                    }}
                  >
                    <PencilIcon size={14} /> Rename
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      replaceTargetRef.current = v.id;
                      setConfirmAction({ kind: 'replace', variant: v });
                      setMenuFor(null);
                    }}
                  >
                    <ImageIcon size={14} /> Replace image
                  </button>
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setConfirmAction({ kind: 'delete', variant: v });
                      setMenuFor(null);
                    }}
                  >
                    <TrashIcon size={14} /> Delete
                  </button>
                </div>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const commentsRailContent = (
    <>
      <div className="comments-head">
        <h2>Comments</h2>
        {comments !== null && (
          <span className="comment-count">{comments.length}</span>
        )}
        <span style={{ flex: 1 }} />
        {shownShare && (
          <span
            className="chip"
            title="Comments are attached to the shared review"
          >
            shared review
          </span>
        )}
        <button
          className="btn-icon"
          aria-label="Hide comments"
          title="Hide comments"
          onClick={() => {
            setCommentsVisible(false);
            setCommentsDrawer(false);
          }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
      {!shownShare ? (
        <>
          <div className="comments-list">
            <p className="comments-empty">
              Share this preview to collect review comments here.
            </p>
          </div>
          <div className="composer">
            <button
              className="btn btn-primary btn-block"
              onClick={() => setModalOpen(true)}
              disabled={!activeVariant}
            >
              <ShareIcon size={15} /> Share this preview
            </button>
          </div>
        </>
      ) : (
        <CommentsPanel
          comments={comments}
          onPost={postOwnerComment}
          defaultName="Project owner"
          asLabel="Comment as"
        />
      )}
    </>
  );

  return (
    <div
      className={`app ${presenting ? 'presenting' : ''} ${!commentsVisible ? 'comments-hidden' : ''} ${adjustOpen ? 'adjusting' : ''}`}
    >
      <header className="topbar">
        <button
          className="btn-icon mobile-only"
          aria-label="Open preview controls"
          onClick={() => setRailDrawer(true)}
        >
          <MenuIcon size={18} />
        </button>
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" aria-hidden="true" />
          Practiscale Preview Lab
        </Link>
        <span className="topbar-divider" aria-hidden="true" />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            minWidth: 0,
          }}
          ref={switcherRef}
        >
          <input
            ref={titleRef}
            className="project-name-input truncate"
            value={project.title}
            maxLength={120}
            aria-label="Project name"
            onChange={(e) =>
              setProject((p) => ({ ...p, title: e.target.value }))
            }
            onBlur={(e) => renameProject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') titleRef.current?.blur();
            }}
          />
          <button
            className="btn-icon"
            aria-label="Switch project"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen((o) => !o)}
          >
            <ChevronDownIcon size={15} />
          </button>
          {switcherOpen && (
            <div className="project-switcher-menu" role="menu">
              <button className="ps-new" role="menuitem" onClick={newProject}>
                <PlusIcon size={15} /> New project
              </button>
              <div className="ps-list">
                {projects === null && (
                  <div
                    className="skeleton"
                    style={{ height: 36, margin: '4px 8px' }}
                  />
                )}
                {projects?.map((p) => (
                  <button
                    key={p.id}
                    className={`ps-item ${p.id === project.id ? 'on' : ''}`}
                    role="menuitem"
                    onClick={() => {
                      setSwitcherOpen(false);
                      if (p.id !== project.id)
                        router.push(`/project/${p.id}/${p.lastPlatform}`);
                    }}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="ps-meta">
                      {p.variantCount} var.
                      {p.id === project.id && <CheckIcon size={13} />}
                    </span>
                  </button>
                ))}
                {projects !== null && projects.length === 0 && (
                  <p className="ps-empty">No projects yet</p>
                )}
              </div>
            </div>
          )}
        </div>
        {saveIndicator}
        <span className="topbar-spacer" />
        <button
          className="btn btn-secondary btn-sm comments-toggle"
          aria-pressed={commentsVisible}
          onClick={() => setCommentsVisible((visible) => !visible)}
        >
          <CommentIcon size={15} />
          {commentsVisible ? 'Hide comments' : 'Show comments'}
        </button>
        <button
          className="btn-icon mobile-only"
          aria-label={`Open comments${comments ? ` (${comments.length})` : ''}`}
          onClick={() => setCommentsDrawer(true)}
        >
          <CommentIcon size={18} />
        </button>
        <button
          className="btn btn-secondary btn-sm brand-btn"
          onClick={() => setBrandOpen(true)}
          aria-label="Brand identity settings"
          title="Brand identity — logo, banner, names"
        >
          <ImageIcon size={15} /> Brand
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModalOpen(true)}
          disabled={!activeVariant}
        >
          <ShareIcon size={15} /> Share
        </button>
        <span className="avatar-placeholder" aria-hidden="true">
          {(project.title.charAt(0) || 'P').toUpperCase()}
        </span>
      </header>

      <nav className="rail" aria-label="Preview controls">
        {railContent}
      </nav>

      <main className="stage">
        <div className="stage-head">
          <div>
            <h1 className="stage-title">
              {stageTitle}
              <span className="sim-badge">Simulated preview</span>
            </h1>
            <p className="stage-sub">{stageSub}</p>
          </div>
          <div className="stage-toolbar">
            {platform === 'youtube' && (
              <div
                className="seg"
                role="group"
                aria-label="Simulated app theme"
              >
                <button
                  className={`seg-btn ${ytTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => setYtTheme('dark')}
                  aria-pressed={ytTheme === 'dark'}
                  title="Dark app theme"
                >
                  Dark
                </button>
                <button
                  className={`seg-btn ${ytTheme === 'light' ? 'active' : ''}`}
                  onClick={() => setYtTheme('light')}
                  aria-pressed={ytTheme === 'light'}
                  title="Light app theme"
                >
                  Light
                </button>
              </div>
            )}
            <div className="seg" role="group" aria-label="Image fit">
              <button
                className={`seg-btn ${fit === 'crop' ? 'active' : ''}`}
                onClick={() => setFit('crop')}
                aria-pressed={fit === 'crop'}
                title="Context crop — the platform's natural placement ratio"
              >
                Crop
              </button>
              <button
                className={`seg-btn ${fit === 'contain' ? 'active' : ''}`}
                onClick={() => setFit('contain')}
                aria-pressed={fit === 'contain'}
                title="Fit — show the whole image inside the context"
              >
                Fit
              </button>
            </div>
            <div className="zoom-group" role="group" aria-label="Zoom">
              <button
                className="btn-icon"
                aria-label="Zoom out"
                onClick={() =>
                  setZoom((z) =>
                    Math.max(0.5, Math.round((z - 0.25) * 100) / 100),
                  )
                }
                disabled={zoom <= 0.5}
              >
                <ZoomOutIcon size={15} />
              </button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button
                className="btn-icon"
                aria-label="Zoom in"
                onClick={() =>
                  setZoom((z) =>
                    Math.min(1.75, Math.round((z + 0.25) * 100) / 100),
                  )
                }
                disabled={zoom >= 1.75}
              >
                <ZoomInIcon size={15} />
              </button>
            </div>
            <button
              className="btn-icon"
              aria-label="Reset preview adjustments"
              title="Reset zoom and fit"
              onClick={() => {
                setZoom(1);
                setFit('crop');
              }}
            >
              <ResetIcon size={15} />
            </button>
            <button
              className={`btn-icon ${adjustOpen ? 'on' : ''}`}
              aria-label={
                adjustOpen ? 'Close adjust panel' : 'Adjust image crop'
              }
              title="Adjust image crop"
              aria-pressed={adjustOpen}
              disabled={!activeVariant}
              onClick={() => (adjustOpen ? setAdjustOpen(false) : openAdjust())}
            >
              <CropIcon size={16} />
            </button>
            <button
              className="btn-icon"
              aria-label={
                presenting
                  ? 'Exit presentation mode'
                  : 'Enter presentation mode'
              }
              title={presenting ? 'Exit presentation' : 'Presentation mode'}
              aria-pressed={presenting}
              onClick={() => setPresenting((p) => !p)}
            >
              <PresentIcon size={16} />
            </button>
          </div>
        </div>

        <div
          className={`stage-canvas ${dragOver ? 'dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) uploadFile(f);
          }}
        >
          {variants.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                <UploadIcon size={24} />
              </span>
              <h3>Upload an image to preview it here</h3>
              <p>
                See how {def.label} would present your creative in a{' '}
                {placement.toLowerCase()} before publishing.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setUploadModalOpen(true)}
                disabled={uploading}
              >
                <UploadIcon size={16} />{' '}
                {uploading ? 'Uploading…' : 'Upload image'}
              </button>
              <p className="empty-note">
                PNG, JPEG or WebP · up to 10 MB · images only in MVP
              </p>
            </div>
          ) : (
            <div className="zoom-wrap" style={{ transform: `scale(${zoom})` }}>
              <PreviewRenderer
                platform={platform}
                contextId={ctx}
                device={device}
                theme={platform === 'youtube' ? ytTheme : undefined}
                context={{
                  projectName: project.title,
                  variantName: activeVariant?.name || 'Creative',
                  imageUrl,
                  fit,
                  brand,
                  adjustment: adjustOpen
                    ? adj
                    : activeVariant?.adjustments?.[platform],
                }}
              />
            </div>
          )}
        </div>
      </main>

      {adjustOpen ? (
        <aside className="adjust-panel" aria-label="Adjust image">
          <div className="comments-head">
            <h2>Adjust image</h2>
            <span style={{ flex: 1 }} />
            <button
              className="btn-icon"
              aria-label="Close adjust panel"
              onClick={() => setAdjustOpen(false)}
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="adjust-body">
            <p className="adjust-hint">
              Nudge how the creative is cropped inside the {def.label}{' '}
              {placement.toLowerCase()}. Changes preview live and apply per
              platform.
            </p>
            <div className="adjust-field">
              <label className="field-label" htmlFor="adj-x">
                Position X
              </label>
              <div className="adjust-stepper">
                <button
                  className="btn-icon"
                  aria-label="Decrease X"
                  onClick={() => {
                    setAdj((a) => ({ ...a, x: Math.max(-50, a.x - 5) }));
                    setAdjDirty(true);
                  }}
                >
                  −
                </button>
                <input
                  id="adj-x"
                  type="number"
                  className="input"
                  min={-50}
                  max={50}
                  value={adj.x}
                  onChange={(e) => {
                    const v = Math.max(
                      -50,
                      Math.min(50, Number(e.target.value) || 0),
                    );
                    setAdj((a) => ({ ...a, x: v }));
                    setAdjDirty(true);
                  }}
                />
                <button
                  className="btn-icon"
                  aria-label="Increase X"
                  onClick={() => {
                    setAdj((a) => ({ ...a, x: Math.min(50, a.x + 5) }));
                    setAdjDirty(true);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="adjust-field">
              <label className="field-label" htmlFor="adj-y">
                Position Y
              </label>
              <div className="adjust-stepper">
                <button
                  className="btn-icon"
                  aria-label="Decrease Y"
                  onClick={() => {
                    setAdj((a) => ({ ...a, y: Math.max(-50, a.y - 5) }));
                    setAdjDirty(true);
                  }}
                >
                  −
                </button>
                <input
                  id="adj-y"
                  type="number"
                  className="input"
                  min={-50}
                  max={50}
                  value={adj.y}
                  onChange={(e) => {
                    const v = Math.max(
                      -50,
                      Math.min(50, Number(e.target.value) || 0),
                    );
                    setAdj((a) => ({ ...a, y: v }));
                    setAdjDirty(true);
                  }}
                />
                <button
                  className="btn-icon"
                  aria-label="Increase Y"
                  onClick={() => {
                    setAdj((a) => ({ ...a, y: Math.min(50, a.y + 5) }));
                    setAdjDirty(true);
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div className="adjust-field">
              <label className="field-label" htmlFor="adj-scale">
                Scale {Math.round(adj.scale * 100)}%
              </label>
              <input
                id="adj-scale"
                type="range"
                className="adjust-slider"
                min={100}
                max={200}
                step={5}
                value={Math.round(adj.scale * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  setAdj((a) => ({ ...a, scale: v }));
                  setAdjDirty(true);
                }}
              />
            </div>
            <button
              className="adjust-reset"
              onClick={() => {
                setAdj({ x: 0, y: 0, scale: 1 });
                setAdjDirty(true);
              }}
            >
              Reset
            </button>
            <button
              className="btn btn-primary btn-block"
              onClick={() => applyAdjust(adj)}
              disabled={!adjDirty || !activeVariant}
            >
              Apply changes
            </button>
          </div>
        </aside>
      ) : (
        <aside className="comments" aria-label="Review comments">
          {commentsRailContent}
        </aside>
      )}

      {railDrawer && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setRailDrawer(false)}
          />
          <div className="drawer" role="dialog" aria-label="Preview controls">
            <div className="drawer-head">
              <b>Preview controls</b>
              <button
                className="btn-icon"
                aria-label="Close"
                onClick={() => setRailDrawer(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            {railContent}
          </div>
        </>
      )}

      {commentsDrawer && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setCommentsDrawer(false)}
          />
          <div
            className="drawer right"
            role="dialog"
            aria-label="Review comments"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div className="drawer-head">
              <b>Comments</b>
              <button
                className="btn-icon"
                aria-label="Close"
                onClick={() => setCommentsDrawer(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {commentsRailContent}
            </div>
          </div>
        </>
      )}

      {brandOpen && (
        <BrandModal
          project={project}
          onClose={() => setBrandOpen(false)}
          onBrandChanged={(patch) => setProject((p) => ({ ...p, ...patch }))}
        />
      )}

      {uploadModalOpen && (
        <UploadModal
          projectId={project.id}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={(variant) => {
            setUploadModalOpen(false);
            setUploadError(null);
            setVariants((vs) => [...vs, variant]);
            setActiveVariantId(variant.id);
            setProject((p) => ({ ...p, activeVariantId: variant.id }));
            setSaveState('saved');
            toast(`“${variant.name}” added as a new variant.`);
          }}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.kind === 'delete'
              ? 'Delete variant?'
              : 'Replace image?'
          }
          body={
            confirmAction.kind === 'delete'
              ? `Are you sure you want to delete “${confirmAction.variant.name}”? This action cannot be undone.`
              : `Replace the source image for “${confirmAction.variant.name}”? The current image will be removed and the variant keeps its name.`
          }
          confirmLabel={confirmAction.kind === 'delete' ? 'Delete' : 'Replace'}
          onConfirm={() => {
            if (confirmAction.kind === 'delete') {
              removeVariant(confirmAction.variant.id);
            } else {
              replaceTargetRef.current = confirmAction.variant.id;
              replaceInputRef.current?.click();
            }
          }}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {modalOpen && (
        <ShareModal
          projectId={project.id}
          variants={variants}
          shares={shares}
          current={{
            variantId: activeVariantId || '',
            platform,
            contextId: ctx,
            device,
            theme: platform === 'youtube' ? ytTheme : undefined,
          }}
          onClose={() => setModalOpen(false)}
          onSharesChanged={(next) => setShares(next)}
          onViewComments={(shareId) => {
            setSelectedShareId(shareId);
            setModalOpen(false);
            setCommentsDrawer(true);
            setComments(null);
          }}
        />
      )}

      {presenting && (
        <button
          className="btn btn-secondary btn-sm"
          style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 80 }}
          onClick={() => setPresenting(false)}
        >
          <CloseIcon size={14} /> Exit presentation
        </button>
      )}

      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.error ? 'error' : ''}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
