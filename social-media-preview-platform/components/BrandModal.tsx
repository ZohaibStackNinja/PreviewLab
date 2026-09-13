'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/types';
import { ApiError, del, patchJson, postForm } from '@/lib/client';
import { CloseIcon, ImageIcon, TrashIcon, UploadIcon } from '@/components/icons';

/**
 * Brand identity editor: the name / handle / tagline plus the logo and banner
 * images used by every platform mockup. Without uploads, a generated identity
 * (initial avatar + branded banner composition) is shown in the previews.
 */
export function BrandModal({
  project,
  onClose,
  onBrandChanged,
}: {
  project: Project;
  onClose: () => void;
  onBrandChanged: (patch: Partial<Project>) => void;
}) {
  const [name, setName] = useState(project.brandName || '');
  const [handle, setHandle] = useState(project.brandHandle || '');
  const [tagline, setTagline] = useState(project.brandTagline || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveField = async (field: 'brandName' | 'brandHandle' | 'brandTagline', value: string) => {
    try {
      const { project: updated } = await patchJson<{ project: Project }>(
        `/api/projects/${project.id}`,
        { [field]: value },
      );
      onBrandChanged(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    }
  };

  const upload = async (kind: 'logo' | 'banner', file: File) => {
    setError(null);
    setBusy(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      const { assetId } = await postForm<{ assetId: string }>(
        `/api/projects/${project.id}/brand/${kind}`,
        form,
      );
      onBrandChanged(kind === 'logo' ? { logoAssetId: assetId } : { bannerAssetId: assetId });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The upload failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const clear = async (kind: 'logo' | 'banner') => {
    setError(null);
    setBusy(kind);
    try {
      await del(`/api/projects/${project.id}/brand/${kind}`);
      onBrandChanged(kind === 'logo' ? { logoAssetId: null } : { bannerAssetId: null });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove the image.');
    } finally {
      setBusy(null);
    }
  };

  const logoUrl = project.logoAssetId ? `/api/assets/${project.logoAssetId}` : null;
  const bannerUrl = project.bannerAssetId ? `/api/assets/${project.bannerAssetId}` : null;

  const ASPECT: Record<'logo' | 'banner', string> = { logo: '1 / 1', banner: '4 / 1' };
  const hint: Record<'logo' | 'banner', string> = {
    logo: 'Square PNG/JPG/WebP works best — shown as the channel/profile avatar.',
    banner: 'Wide image for the channel/cover areas. Without an upload, a branded banner is generated from the name and tagline.',
  };

  const assetRow = (kind: 'logo' | 'banner') => {
    const url = kind === 'logo' ? logoUrl : bannerUrl;
    const ref = kind === 'logo' ? logoInputRef : bannerInputRef;
    return (
      <div className="brand-row">
        <div className="brand-preview" style={{ aspectRatio: ASPECT[kind] }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${kind} preview`} />
          ) : (
            <ImageIcon size={22} />
          )}
          {busy === kind && (
            <span className="brand-preview-busy">
              <span className="spinner" />
            </span>
          )}
        </div>
        <div className="brand-rowinfo">
          <p className="brand-hint">{hint[kind]}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => ref.current?.click()} disabled={!!busy}>
              <UploadIcon size={14} /> {url ? 'Replace' : 'Upload'}
            </button>
            {url && (
              <button className="btn btn-danger-outline btn-sm" onClick={() => clear(kind)} disabled={!!busy}>
                <TrashIcon size={14} /> Remove
              </button>
            )}
          </div>
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(kind, f);
            e.target.value = '';
          }}
        />
      </div>
    );
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Brand identity">
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Brand identity</h2>
            <p className="modal-sub">
              Used across every platform preview — channel headers, profile avatars, banners and
              post authors.
            </p>
          </div>
          <button className="btn-icon" aria-label="Close brand settings" onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Identity</div>
          <div className="field">
            <label className="field-label" htmlFor="brand-name">
              Brand name
            </label>
            <input
              id="brand-name"
              className="input"
              value={name}
              maxLength={80}
              placeholder={project.title}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== (project.brandName || '') && saveField('brandName', name)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="brand-handle">
              Handle / username
            </label>
            <input
              id="brand-handle"
              className="input"
              value={handle}
              maxLength={40}
              placeholder={'@' + project.title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)}
              onChange={(e) => setHandle(e.target.value)}
              onBlur={() => handle !== (project.brandHandle || '') && saveField('brandHandle', handle)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="brand-tagline">
              Tagline / bio
            </label>
            <input
              id="brand-tagline"
              className="input"
              value={tagline}
              maxLength={160}
              placeholder="Short description shown in profiles and banners"
              onChange={(e) => setTagline(e.target.value)}
              onBlur={() => tagline !== (project.brandTagline || '') && saveField('brandTagline', tagline)}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Logo / avatar</div>
          {assetRow('logo')}
        </div>

        <div className="modal-section">
          <div className="modal-section-title">Banner / cover</div>
          {assetRow('banner')}
        </div>

        {error && (
          <p className="field-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
