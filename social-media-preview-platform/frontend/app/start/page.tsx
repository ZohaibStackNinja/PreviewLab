'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProjectSummary, VariantView } from '@/lib/types';
import type { PlatformId } from '@/lib/types';
import { PLATFORMS, PLATFORM_IDS, DEFAULT_PLATFORM } from '@/lib/platforms';
import {
  patchJson,
  postFormWithProgress,
  postJson,
  ApiError,
} from '@/lib/client';
import { Dropzone } from '@/components/Dropzone';
import {
  CheckIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
} from '@/components/icons';

const WIZARD_ICONS: Record<
  PlatformId,
  (p: { size?: number }) => React.ReactNode
> = {
  youtube: (p) => <YouTubeIcon {...p} />,
  instagram: (p) => <InstagramIcon {...p} />,
  facebook: (p) => <FacebookIcon {...p} />,
  tiktok: (p) => <TikTokIcon {...p} />,
  linkedin: (p) => <LinkedInIcon {...p} />,
};

const STEPS = ['Project details', 'Add creative', 'Select platform'] as const;

/** Three-step create-project flow (name → first creative → first platform). */
export default function StartWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<PlatformId>(DEFAULT_PLATFORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async () => {
    setError(null);
    setCreating(true);
    try {
      const { project } = await postJson<{ project: ProjectSummary }>(
        '/api/projects',
        {
          title,
          description,
          lastPlatform: platform,
        },
      );
      let firstVariant: VariantView | null = null;
      if (file) {
        try {
          const form = new FormData();
          form.append('file', file);
          const { variant } = await postFormWithProgress<{
            variant: VariantView;
          }>(`/api/projects/${project.id}/variants`, form, () => undefined);
          firstVariant = variant;
        } catch (e) {
          // The project exists; surface the upload problem in the workspace.
          setError(
            e instanceof ApiError
              ? e.message
              : 'The project was created, but the image could not be uploaded.',
          );
        }
      }
      router.replace(`/project/${project.id}/${platform}`);
      void firstVariant;
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not create the project.',
      );
      setCreating(false);
    }
  }, [title, description, file, platform, router]);

  const canContinue = step === 1 ? title.trim().length > 0 : true;

  return (
    <main className="wizard-page">
      <header className="wizard-topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" aria-hidden="true" />
          Practiscale Preview Lab
        </Link>
        <span className="topbar-spacer" />
        <span className="wizard-help">
          Preview your creative before it goes live
        </span>
      </header>

      <div className="wizard-card">
        <div className="wizard-meta">
          <span className="wizard-step-label">STEP {step} OF 3</span>
          <span className="wizard-step-title">{STEPS[step - 1]}</span>
        </div>
        <div className="wizard-dots" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`wizard-dot ${n === step ? 'on' : n < step ? 'done' : ''}`}
            >
              {n < step ? <CheckIcon size={12} /> : n}
            </span>
          ))}
          <span className="wizard-track" aria-hidden="true">
            <span style={{ width: `${((step - 1) / 2) * 100}%` }} />
          </span>
        </div>

        {step === 1 && (
          <>
            <h1 className="wizard-title">Name your project</h1>
            <p className="wizard-sub">
              Give your preview workspace a clear name. You can update these
              details later.
            </p>
            <div className="field">
              <label className="field-label" htmlFor="wiz-title">
                Project name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="wiz-title"
                className="input"
                value={title}
                maxLength={120}
                placeholder="e.g. Q4 Brand Launch"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && canContinue && setStep(2)
                }
                autoFocus
              />
              <p className="field-help">Use a name your team will recognize.</p>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="wiz-desc">
                Description{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                  Optional
                </span>
              </label>
              <textarea
                id="wiz-desc"
                className="textarea"
                value={description}
                maxLength={500}
                placeholder="Add context, campaign goals or review notes…"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="wizard-title">Upload your first image</h1>
            <p className="wizard-sub">
              Add the creative you want to preview. You can upload more variants
              once your project is ready.
            </p>
            <Dropzone onFile={setFile} />
            {file && (
              <div className="upload-staged">
                <span className="upload-thumb small">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt="" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="upload-file-name truncate">{file.name}</p>
                  <p className="upload-file-meta">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <button
                  className="btn-icon"
                  aria-label="Remove selected file"
                  onClick={() => setFile(null)}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="wizard-title">Choose your first platform</h1>
            <p className="wizard-sub">
              Choose a starting platform. You can switch between all five
              anytime.
            </p>
            <div
              className="wizard-platforms"
              role="radiogroup"
              aria-label="Starting platform"
            >
              {PLATFORM_IDS.map((p) => {
                const Icon = WIZARD_ICONS[p];
                return (
                  <button
                    key={p}
                    className={`wizard-platform ${platform === p ? 'on' : ''}`}
                    role="radio"
                    aria-checked={platform === p}
                    onClick={() => setPlatform(p)}
                  >
                    <span className="wiz-platform-icon">
                      <Icon size={22} />
                    </span>
                    <span>{PLATFORMS[p].label}</span>
                    {platform === p && (
                      <span className="wizard-platform-check">
                        <CheckIcon size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <p className="field-error" role="alert" style={{ marginTop: 14 }}>
            {error}
          </p>
        )}

        <div className="wizard-actions">
          {step > 1 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep((s) => s - 1)}
              disabled={creating}
            >
              Back
            </button>
          )}
          <span style={{ flex: 1 }} />
          {step === 2 && (
            <button
              className="btn btn-ghost"
              onClick={() => setStep(3)}
              disabled={creating}
            >
              Skip for now
            </button>
          )}
          {step < 3 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
            >
              Continue
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={create}
              disabled={creating || !title.trim()}
            >
              {creating ? 'Creating…' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
