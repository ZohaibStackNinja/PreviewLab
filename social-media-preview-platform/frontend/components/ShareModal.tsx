'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeviceMode, PlatformId, PreviewTheme, ShareView, VariantView } from '@/lib/types';
import { postJson, ApiError } from '@/lib/client';
import { formatDateTime, timeUntil } from '@/lib/format';
import { PLATFORMS, contextLabel } from '@/lib/platforms';
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
  if (status === 'ACTIVE') return <span className="badge badge-active">Active link</span>;
  if (status === 'EXPIRED') return <span className="badge badge-expired">Expired</span>;
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
  const [expiryChoice, setExpiryChoice] = useState(24);
  const [customExpiry, setCustomExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<ShareView | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Share matching the exact current preview state (variant+platform+context+device).
  const currentShare = useMemo(
    () =>
      shares.find(
        (s) =>
          s.variantId === current.variantId &&
          s.platform === current.platform &&
          s.contextId === current.contextId &&
          s.device === current.device,
      ) || null,
    [shares, current],
  );

  const activeCurrentShare = currentShare && currentShare.status === 'ACTIVE' ? currentShare : null;

  useEffect(() => {
    // Move focus into the modal (A11Y: modal open moves focus).
    urlInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (url: string) => {
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
      variantId: current.variantId,
      platform: current.platform,
      context: current.contextId,
      device: current.device,
      ...(current.theme ? { theme: current.theme } : {}),
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
      const { share } = await postJson<{ share: ShareView }>(`/api/projects/${projectId}/shares`, body);
      setJustCreated(share);
      onSharesChanged([share, ...shares]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      const { share } = await postJson<{ share: ShareView }>(`/api/shares/${id}/revoke`, {});
      onSharesChanged(shares.map((s) => (s.id === id ? share : s)));
      setConfirmingRevoke(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not revoke the link.');
    }
  };

  const variantName = (id: string) => variants.find((v) => v.id === id)?.name || 'Variant';

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Share this preview">
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Share this preview</h2>
            <p className="modal-sub">Anyone with the link can view and comment.</p>
          </div>
          <button className="btn-icon" aria-label="Close share dialog" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Current preview state */}
        <div className="modal-section">
          <div className="modal-section-title">Current preview</div>
          <div className="share-list-item" style={{ background: 'var(--surface)' }}>
            <div className="grow">
              <b>
                {PLATFORMS[current.platform].label} · {contextLabel(current.platform, current.contextId)}
              </b>
              <div className="share-list-meta">
                {current.device === 'desktop' ? 'Desktop' : 'Mobile'} · {variantName(current.variantId)}
              </div>
            </div>
            {activeCurrentShare && <StatusBadge status="ACTIVE" />}
          </div>

          {activeCurrentShare && !justCreated && (
            <div className="share-state-row">
              <span className="status-dot active" />
              <span>
                Active link · expires {formatDateTime(activeCurrentShare.expiresAt)} (
                {timeUntil(activeCurrentShare.expiresAt)})
              </span>
            </div>
          )}

          {justCreated && (
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
                    value={justCreated.url || ''}
                    readOnly
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button className="btn btn-primary" onClick={() => copy(justCreated.url || '')}>
                    {copied === justCreated.url ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                    {copied === justCreated.url ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="field-help">This link opens the exact preview state shown above.</p>
              </div>
              <div className="share-state-row">
                <span className="status-dot active" />
                <span>
                  Active link · expires {formatDateTime(justCreated.expiresAt)} (
                  {timeUntil(justCreated.expiresAt)})
                </span>
              </div>
            </>
          )}

          {!activeCurrentShare && !justCreated && (
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
                    <label className="field-label" htmlFor="share-expiry-custom">
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
                <button className="btn btn-primary" onClick={create} disabled={creating || !current.variantId}>
                  <LinkIcon size={15} /> {creating ? 'Creating link…' : 'Create link'}
                </button>
              </div>
            </>
          )}

          {(activeCurrentShare || justCreated) && (
            <div className="share-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => onViewComments((justCreated || activeCurrentShare)!.id)}>
                View comments
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setJustCreated(null);
                  setExpiryChoice(24);
                  setCustomExpiry('');
                }}
              >
                Create a new link for this state
              </button>
              <button
                className="btn btn-danger-outline btn-sm"
                onClick={() => setConfirmingRevoke((justCreated || activeCurrentShare)!.id)}
              >
                Revoke
              </button>
            </div>
          )}

          {confirmingRevoke && (
            <div className="share-state-row" style={{ color: 'var(--danger)' }}>
              <WarningIcon size={15} />
              <span>Revoke this link? Reviewers will lose access immediately.</span>
              <span style={{ flex: 1 }} />
              <button className="btn btn-sm btn-secondary" onClick={() => setConfirmingRevoke(null)}>
                Cancel
              </button>
              <button className="btn btn-sm btn-danger-outline" onClick={() => revoke(confirmingRevoke)}>
                Confirm revoke
              </button>
            </div>
          )}
        </div>

        {/* All links for the project */}
        {shares.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-title">All links in this project</div>
            <div className="all-shares">
              {shares.map((s) => (
                <div className="share-list-item" key={s.id}>
                  <div className="grow">
                    <b>
                      {PLATFORMS[s.platform].label} · {contextLabel(s.platform, s.contextId)} ·{' '}
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
                  <button className="btn-icon" aria-label="View comments" onClick={() => onViewComments(s.id)}>
                    <CommentsGlyph />
                    {s.commentCount ? (
                      <span className="comment-badge">{s.commentCount}</span>
                    ) : null}
                  </button>
                  {s.status === 'ACTIVE' && (
                    <button className="btn-icon" aria-label={`Revoke ${PLATFORMS[s.platform].label} link`} onClick={() => setConfirmingRevoke(s.id)}>
                      <RevokeGlyph />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentsGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.9A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function RevokeGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m5.7 5.7 12.6 12.6" />
    </svg>
  );
}
