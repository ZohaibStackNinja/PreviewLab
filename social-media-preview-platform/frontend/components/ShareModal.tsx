'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DeviceMode,
  PlatformId,
  PreviewTheme,
  ShareView,
  VariantView,
} from '@/lib/types';
import { postJson, ApiError } from '@/lib/client';
import { formatDateTime, timeUntil } from '@/lib/format';
import {
  PLATFORMS,
  PLATFORM_IDS,
  contextLabel,
  defaultContext,
  isValidContext,
} from '@/lib/platforms';
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LinkIcon,
  WarningIcon,
} from '@/components/icons';

const EXPIRY_CHOICES = [
  { hours: 24, label: '24 hours (default)' },
  { hours: 24 * 3, label: '3 days' },
  { hours: 24 * 7, label: '7 days' },
  { hours: 24 * 14, label: '14 days' },
  { hours: 24 * 30, label: '30 days' },
  { hours: 0, label: 'Custom date…' },
];

function StatusBadge({ status }: { status: ShareView['status'] }) {
  if (status === 'ACTIVE')
    return <span className="badge badge-active">Active link</span>;
  if (status === 'EXPIRED')
    return <span className="badge badge-expired">Expired</span>;
  return <span className="badge badge-revoked">Revoked</span>;
}

export function ShareModal({
  projectId,
  variants,
  shares,
  current,
  onClose,
  onSharesChanged,
  onViewComments,
}: {
  projectId: string;
  variants: VariantView[];
  shares: ShareView[];
  current: {
    variantId: string;
    platform: PlatformId;
    contextId: string;
    device: DeviceMode;
    theme?: PreviewTheme;
  };
  onClose: () => void;
  onSharesChanged: (shares: ShareView[]) => void;
  onViewComments: (shareId: string) => void;
}) {
  // Target section state inside the modal (defaults to current workspace state)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>(
    current.platform,
  );
  const [selectedContext, setSelectedContext] = useState<string>(
    current.contextId,
  );
  const [selectedDevice, setSelectedDevice] = useState<DeviceMode>(
    current.device,
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    current.variantId,
  );
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);

  const [expiryChoice, setExpiryChoice] = useState(24);
  const [customExpiry, setCustomExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<ShareView | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handlePlatformChange = (p: PlatformId) => {
    setSelectedPlatform(p);
    if (!isValidContext(p, selectedContext)) {
      setSelectedContext(defaultContext(p));
    }
    setJustCreated(null);
    setSelectedShareId(null);
    setCreatingNew(false);
    setError(null);
  };

  // Active shares matching the selected section (variant + platform + context + device)
  const sectionActiveShares = useMemo(
    () =>
      shares.filter(
        (s) =>
          s.status === 'ACTIVE' &&
          s.platform === selectedPlatform &&
          s.contextId === selectedContext &&
          s.device === selectedDevice &&
          s.variantId === selectedVariantId,
      ),
    [
      shares,
      selectedPlatform,
      selectedContext,
      selectedDevice,
      selectedVariantId,
    ],
  );

  // Active share to display in primary input
  const activeShare = useMemo(() => {
    if (
      justCreated &&
      justCreated.platform === selectedPlatform &&
      justCreated.contextId === selectedContext &&
      justCreated.device === selectedDevice &&
      justCreated.variantId === selectedVariantId &&
      justCreated.status === 'ACTIVE'
    ) {
      return justCreated;
    }
    if (selectedShareId) {
      const found = shares.find(
        (s) => s.id === selectedShareId && s.status === 'ACTIVE',
      );
      if (found) return found;
    }
    return sectionActiveShares[0] || null;
  }, [
    justCreated,
    selectedPlatform,
    selectedContext,
    selectedDevice,
    selectedVariantId,
    selectedShareId,
    shares,
    sectionActiveShares,
  ]);

  const toAbsoluteUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const shareDisplayUrl = useMemo(
    () => toAbsoluteUrl(activeShare?.url),
    [activeShare],
  );

  useEffect(() => {
    urlInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(url);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const create = async () => {
    setError(null);
    let body: Record<string, unknown>;
    const base = {
      variantId: selectedVariantId,
      platform: selectedPlatform,
      context: selectedContext,
      device: selectedDevice,
      ...(selectedPlatform === 'youtube' && current.theme
        ? { theme: current.theme }
        : {}),
      allowMultiple: true,
    };
    if (expiryChoice === 0) {
      if (!customExpiry) {
        setError('Choose a custom expiry date first.');
        return;
      }
      const d = new Date(customExpiry);
      if (d.getTime() <= Date.now()) {
        setError('The expiry must be later than the current time.');
        return;
      }
      body = { ...base, expiresAt: d.toISOString() };
    } else {
      body = { ...base, expiresInHours: expiryChoice };
    }
    setCreating(true);
    try {
      const { share } = await postJson<{ share: ShareView }>(
        `/api/projects/${projectId}/shares`,
        body,
      );
      setJustCreated(share);
      setSelectedShareId(share.id);
      setCreatingNew(false);
      const exists = shares.some((s) => s.id === share.id);
      if (exists) {
        onSharesChanged(shares.map((s) => (s.id === share.id ? share : s)));
      } else {
        onSharesChanged([share, ...shares]);
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not create the link. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  const generateAllPlatforms = async () => {
    setError(null);
    setGeneratingBatch(true);
    try {
      const results = await Promise.all(
        PLATFORM_IDS.map((p) =>
          postJson<{ share: ShareView }>(`/api/projects/${projectId}/shares`, {
            variantId: selectedVariantId,
            platform: p,
            context: defaultContext(p),
            device: selectedDevice,
            expiresInHours: expiryChoice === 0 ? 24 : expiryChoice,
            allowMultiple: true,
          }),
        ),
      );
      const newShares = results.map((r) => r.share);
      const existingIds = new Set(newShares.map((s) => s.id));
      onSharesChanged([
        ...newShares,
        ...shares.filter((s) => !existingIds.has(s.id)),
      ]);
      const match =
        newShares.find((s) => s.platform === selectedPlatform) || newShares[0];
      setJustCreated(match);
      setSelectedShareId(match.id);
      setCreatingNew(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not generate links for all platforms.',
      );
    } finally {
      setGeneratingBatch(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const { share } = await postJson<{ share: ShareView }>(
        `/api/shares/${id}/revoke`,
        {},
      );
      onSharesChanged(shares.map((s) => (s.id === id ? share : s)));
      setConfirmingRevoke(null);
      if (justCreated?.id === id) setJustCreated(null);
      if (selectedShareId === id) setSelectedShareId(null);
      setCreatingNew(false);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not revoke the link.',
      );
    }
  };

  const variantName = (id: string) =>
    variants.find((v) => v.id === id)?.name || 'Variant';

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Share this preview"
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Share this preview</h2>
            <p className="modal-sub">
              Anyone with the link can view and comment.
            </p>
          </div>
          <button
            className="btn-icon"
            aria-label="Close share dialog"
            onClick={onClose}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Target Section Selector */}
        <div className="modal-section">
          <div
            className="modal-section-title"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Preview Section</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={generateAllPlatforms}
              disabled={generatingBatch || !selectedVariantId}
            >
              {generatingBatch
                ? 'Generating…'
                : '⚡ Generate links for all 5 platforms'}
            </button>
          </div>

          {/* Platform Pills */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            {PLATFORM_IDS.map((p) => {
              const isSelected = p === selectedPlatform;
              const hasActive = shares.some(
                (s) => s.platform === p && s.status === 'ACTIVE',
              );
              return (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    position: 'relative',
                  }}
                  onClick={() => handlePlatformChange(p)}
                >
                  {PLATFORMS[p].label}
                  {hasActive && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isSelected
                          ? 'var(--white)'
                          : 'var(--brand)',
                        marginLeft: 6,
                        verticalAlign: 'middle',
                      }}
                      title="Has active link"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Context, Device, Variant controls */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <select
                className="select"
                style={{
                  width: '100%',
                  fontSize: 13,
                  height: 32,
                  padding: '2px 8px',
                }}
                value={selectedContext}
                onChange={(e) => {
                  setSelectedContext(e.target.value);
                  setJustCreated(null);
                  setSelectedShareId(null);
                  setCreatingNew(false);
                }}
              >
                {PLATFORMS[selectedPlatform].contexts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedDevice === 'desktop' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => {
                  setSelectedDevice('desktop');
                  setJustCreated(null);
                  setSelectedShareId(null);
                  setCreatingNew(false);
                }}
              >
                Desktop
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedDevice === 'mobile' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 8px', fontSize: 12 }}
                onClick={() => {
                  setSelectedDevice('mobile');
                  setJustCreated(null);
                  setSelectedShareId(null);
                  setCreatingNew(false);
                }}
              >
                Mobile
              </button>
            </div>

            {variants.length > 1 && (
              <div style={{ flex: 1 }}>
                <select
                  className="select"
                  style={{
                    width: '100%',
                    fontSize: 13,
                    height: 32,
                    padding: '2px 8px',
                  }}
                  value={selectedVariantId}
                  onChange={(e) => {
                    setSelectedVariantId(e.target.value);
                    setJustCreated(null);
                    setSelectedShareId(null);
                    setCreatingNew(false);
                  }}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Current selected section summary badge */}
          <div
            className="share-list-item"
            style={{ background: 'var(--surface)' }}
          >
            <div className="grow">
              <b>
                {PLATFORMS[selectedPlatform].label} ·{' '}
                {contextLabel(selectedPlatform, selectedContext)}
              </b>
              <div className="share-list-meta">
                {selectedDevice === 'desktop' ? 'Desktop' : 'Mobile'} ·{' '}
                {variantName(selectedVariantId)}
              </div>
            </div>
            {activeShare && !creatingNew && <StatusBadge status="ACTIVE" />}
          </div>

          {/* Active Link Review Box */}
          {activeShare && !creatingNew && (
            <>
              <div className="field" style={{ marginTop: 14 }}>
                <label className="field-label" htmlFor="share-url">
                  Review link
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="share-url"
                    ref={urlInputRef}
                    className="input input-readonly"
                    value={shareDisplayUrl}
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => copy(shareDisplayUrl)}
                  >
                    {copied === shareDisplayUrl ? (
                      <CheckIcon size={15} />
                    ) : (
                      <CopyIcon size={15} />
                    )}
                    {copied === shareDisplayUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="field-help">
                  This link opens the preview state shown above.
                </p>
              </div>
              <div className="share-state-row">
                <span className="status-dot active" />
                <span>
                  Active link · expires {formatDateTime(activeShare.expiresAt)}{' '}
                  ({timeUntil(activeShare.expiresAt)})
                </span>
              </div>
            </>
          )}

          {/* Create Link / Generate Additional Link Form */}
          {(!activeShare || creatingNew) && (
            <>
              <div className="share-expiry-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label className="field-label" htmlFor="share-expiry">
                    Link expiry
                  </label>
                  <select
                    id="share-expiry"
                    className="select"
                    value={expiryChoice}
                    onChange={(e) => setExpiryChoice(Number(e.target.value))}
                  >
                    {EXPIRY_CHOICES.map((c) => (
                      <option key={c.label} value={c.hours}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {expiryChoice === 0 && (
                  <div className="field">
                    <label
                      className="field-label"
                      htmlFor="share-expiry-custom"
                    >
                      Custom expiry
                    </label>
                    <input
                      id="share-expiry-custom"
                      type="datetime-local"
                      className="input"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                    />
                  </div>
                )}
              </div>
              {error && (
                <p className="field-error" role="alert">
                  <WarningIcon size={13} /> {error}
                </p>
              )}
              <div className="share-actions">
                <button
                  className="btn btn-primary"
                  onClick={create}
                  disabled={creating || !selectedVariantId}
                >
                  <LinkIcon size={15} />{' '}
                  {creating ? 'Creating link…' : 'Create link'}
                </button>
                {creatingNew && activeShare && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setCreatingNew(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}

          {activeShare && !creatingNew && (
            <div className="share-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onViewComments(activeShare.id)}
              >
                View comments
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCreatingNew(true);
                  setJustCreated(null);
                  setExpiryChoice(24);
                  setCustomExpiry('');
                }}
              >
                + Generate another link for this section
              </button>
              <button
                className="btn btn-danger-outline btn-sm"
                onClick={() => setConfirmingRevoke(activeShare.id)}
              >
                Revoke
              </button>
            </div>
          )}

          {confirmingRevoke && (
            <div className="share-state-row" style={{ color: 'var(--danger)' }}>
              <WarningIcon size={15} />
              <span>
                Revoke this link? Reviewers will lose access immediately.
              </span>
              <span style={{ flex: 1 }} />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setConfirmingRevoke(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-danger-outline"
                onClick={() => revoke(confirmingRevoke)}
              >
                Confirm revoke
              </button>
            </div>
          )}
        </div>

        {/* All links for the project */}
        {shares.length > 0 && (
          <div className="modal-section">
            <div
              className="modal-section-title"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>All links in this project ({shares.length})</span>
            </div>
            <div className="all-shares">
              {shares.map((s) => {
                const isSelected = activeShare?.id === s.id;
                const linkUrl = toAbsoluteUrl(s.url);
                return (
                  <div
                    className="share-list-item"
                    key={s.id}
                    style={{
                      cursor: 'pointer',
                      outline: isSelected ? '2px solid var(--brand)' : 'none',
                      transition: 'outline 0.15s ease',
                    }}
                    onClick={() => {
                      setSelectedPlatform(s.platform);
                      setSelectedContext(s.contextId);
                      setSelectedDevice(s.device);
                      setSelectedVariantId(s.variantId);
                      setSelectedShareId(s.id);
                      setJustCreated(null);
                      setCreatingNew(false);
                    }}
                  >
                    <div className="grow">
                      <b>
                        {PLATFORMS[s.platform].label} ·{' '}
                        {contextLabel(s.platform, s.contextId)} ·{' '}
                        {s.device === 'desktop' ? 'Desktop' : 'Mobile'}
                      </b>
                      <div className="share-list-meta truncate">
                        {variantName(s.variantId)} ·{' '}
                        {s.status === 'ACTIVE'
                          ? `expires ${formatDateTime(s.expiresAt)} (${timeUntil(s.expiresAt)})`
                          : s.status === 'EXPIRED'
                            ? `expired ${formatDateTime(s.expiresAt)}`
                            : `revoked ${formatDateTime(s.revokedAt || s.createdAt)}`}
                      </div>
                    </div>
                    <StatusBadge status={s.status} />

                    {/* Dedicated Copy Button for Every Active Link */}
                    {linkUrl && s.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(linkUrl);
                        }}
                      >
                        {copied === linkUrl ? (
                          <CheckIcon size={12} />
                        ) : (
                          <CopyIcon size={12} />
                        )}
                        {copied === linkUrl ? 'Copied' : 'Copy'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="View comments"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewComments(s.id);
                      }}
                    >
                      <CommentsGlyph />
                      {s.commentCount ? (
                        <span className="comment-badge">{s.commentCount}</span>
                      ) : null}
                    </button>

                    {s.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label={`Revoke ${PLATFORMS[s.platform].label} link`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingRevoke(s.id);
                        }}
                      >
                        <RevokeGlyph />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function RevokeGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="5.7" y1="5.7" x2="18.3" y2="18.3" />
    </svg>
  );
}
