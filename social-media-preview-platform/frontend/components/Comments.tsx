'use client';

import { useEffect, useRef, useState } from 'react';
import { initials, relativeTime, tintIndex } from '@/lib/format';
import { SendIcon, WarningIcon } from '@/components/icons';

interface CommentItem {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
}

/**
 * Shared comment panel (UI/UX §16): count beside the heading, calm empty
 * state, guest composer with display name, and retryable errors that keep
 * typed content (COM-007).
 */
export function CommentsPanel({
  comments,
  onPost,
  postDisabled,
  postDisabledNote,
  defaultName = '',
  asLabel = 'Guest reviewer',
  storeName = false,
}: {
  comments: CommentItem[] | null;
  onPost: (displayName: string, body: string) => Promise<void>;
  postDisabled?: boolean;
  postDisabledNote?: string;
  defaultName?: string;
  asLabel?: string;
  storeName?: boolean;
}) {
  const [name, setName] = useState(defaultName);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (storeName && !name) {
      const saved = window.localStorage.getItem('smp_reviewer_name');
      if (saved) setName(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (submitting) return;
    if (!name.trim()) {
      setError('Please add a display name first.');
      return;
    }
    if (!body.trim()) {
      setError('Please write a comment before sending.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onPost(name.trim(), body.trim());
      if (storeName) window.localStorage.setItem('smp_reviewer_name', name.trim());
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tint = (n: string) =>
    tintIndex(n) === 0 ? '' : tintIndex(n) === 1 ? 'alt' : 'alt2';

  return (
    <>
      <div className="comments-list">
        {comments === null && (
          <>
            <div className="skeleton" style={{ height: 40 }} />
            <div className="skeleton" style={{ height: 40, width: '85%' }} />
          </>
        )}
        {comments !== null && comments.length === 0 && (
          <p className="comments-empty">No comments yet — leave the first note.</p>
        )}
        {comments?.map((c) => (
          <div className="comment-item" key={c.id}>
            <span className={`comment-avatar ${tint(c.displayName)}`} aria-hidden="true">
              {initials(c.displayName)}
            </span>
            <div className="comment-bubble">
              <span className="comment-author">{c.displayName}</span>
              <span className="comment-time">{relativeTime(c.createdAt)}</span>
              <div className="comment-body">{c.body}</div>
            </div>
          </div>
        ))}
      </div>

      {postDisabled ? (
        <div className="composer">
          <p className="comments-empty" style={{ padding: '8px 0' }}>
            {postDisabledNote || 'Commenting is closed for this preview.'}
          </p>
        </div>
      ) : (
        <div className="composer">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="composer-name">
              {asLabel === 'Guest reviewer' ? 'Your name' : 'Comment as'}
            </label>
            <input
              id="composer-name"
              className="input"
              value={name}
              maxLength={80}
              placeholder={asLabel}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="composer-row">
            <label className="sr-only" htmlFor="composer-body" style={{ position: 'absolute', left: -9999 }}>
              Comment
            </label>
            <textarea
              id="composer-body"
              ref={bodyRef}
              className="textarea"
              value={body}
              maxLength={2000}
              placeholder="Leave feedback…"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={submit}
              disabled={submitting || !body.trim() || !name.trim()}
              aria-label="Send comment"
              style={{ height: 38 }}
            >
              {submitting ? <span className="spinner" aria-hidden="true" /> : <SendIcon size={15} />}
            </button>
          </div>
          {error && (
            <p className="field-error" role="alert">
              <WarningIcon size={13} /> {error}
            </p>
          )}
          <p className="composer-helper">No account needed</p>
        </div>
      )}
    </>
  );
}

export type { CommentItem };
