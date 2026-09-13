'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { postFormWithProgress, ApiError } from '@/lib/client';
import type { VariantView } from '@/lib/types';
import { formatBytes } from '@/lib/format';
import { Dropzone } from '@/components/Dropzone';

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
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
}

/**
 * Upload modal (reference flow: Upload Image → Uploading image → success):
 * staged via drag & drop or browse, then a progress bar with percentage and
 * cancel. Cancelling never creates a partial variant.
 */
export function UploadModal({
  projectId,
  onClose,
  onUploaded,
}: {
  projectId: string;
  onClose: () => void;
  onUploaded: (variant: VariantView) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && progress === null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, progress]);

  const stage = (f: File) => {
    setFile(f);
    setError(null);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const start = async () => {
    if (!file || progress !== null) return;
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const dims = await readDimensions(file);
      const form = new FormData();
      form.append('file', file);
      form.append('width', String(dims.width));
      form.append('height', String(dims.height));
      const { variant } = await postFormWithProgress<{ variant: VariantView }>(
        `/api/projects/${projectId}/variants`,
        form,
        setProgress,
        controller.signal,
      );
      onUploaded(variant);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UPLOAD_CANCELLED') {
        // keep the staged file so the user can retry immediately
      } else {
        setError(e instanceof ApiError ? e.message : 'The upload failed. Please try again.');
      }
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    if (progress !== null) {
      abortRef.current?.abort();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && progress === null) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Upload image">
        <div className="modal-head">
          <div>
            <h2 className="modal-title">{progress !== null ? 'Uploading image' : 'Upload Image'}</h2>
            {!file && <p className="modal-sub">Add the creative you want to preview.</p>}
          </div>
          {progress === null && (
            <button className="btn-icon" aria-label="Close upload dialog" onClick={onClose}>
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        {file && progress !== null ? (
          <div className="modal-section">
            <div className="upload-progress-row">
              <span className="upload-thumb">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" />
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="upload-file-name truncate">{file.name}</p>
                <p className="upload-file-meta">{formatBytes(file.size)}</p>
              </div>
            </div>
            <div className="upload-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="upload-progress-meta">
              <span>{progress < 100 ? 'Uploading…' : 'Finishing…'}</span>
              <b>{progress}%</b>
            </div>
            {error && (
              <p className="field-error" role="alert" style={{ marginTop: 10 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={cancel}>
                Cancel upload
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-section">
              <Dropzone onFile={stage} error={error} compact />
              {file && (
                <div className="upload-staged">
                  <span className="upload-thumb small">
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="" />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="upload-file-name truncate">{file.name}</p>
                    <p className="upload-file-meta">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    className="btn-icon"
                    aria-label="Remove selected file"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                  >
                    <CloseIcon size={15} />
                  </button>
                </div>
              )}
            </div>
            <div className="share-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={start} disabled={!file}>
                Upload
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
