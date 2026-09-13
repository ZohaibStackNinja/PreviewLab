'use client';

import { useRef, useState } from 'react';
import { validateFileClient } from '@/lib/validation';

/**
 * Drag-and-drop / browse file picker used by the upload modal and the
 * create-project wizard. Client-side type+size validation gives fast
 * feedback; the server re-validates (Development Document §6.1).
 */
export function Dropzone({
  onFile,
  disabled,
  error,
  compact,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = (file?: File | null) => {
    if (!file) return;
    const problem = validateFileClient(file);
    if (problem) {
      setLocalError(problem);
      return;
    }
    setLocalError(null);
    onFile(file);
  };

  return (
    <div>
      <div
        className={`dropzone ${compact ? 'compact' : ''} ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload image — drag and drop or browse files"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
      >
        <span className="dropzone-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 10h-1.3A5 5 0 1 0 7 12H6a3.5 3.5 0 0 0 0 7h12a4.5 4.5 0 0 0 0-9Z" />
            <path d="M12 16v-5m-2.5 2.5L12 11l2.5 2.5" />
          </svg>
        </span>
        <p className="dropzone-title">Drag &amp; drop your image here</p>
        <p className="dropzone-alt">
          or{' '}
          <button
            type="button"
            className="dropzone-browse"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) inputRef.current?.click();
            }}
          >
            browse files
          </button>
        </p>
        <p className="dropzone-formats">PNG, JPG, WebP · max 10MB</p>
      </div>
      {(error || localError) && (
        <p className="field-error" role="alert" style={{ marginTop: 8 }}>
          {error || localError}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
