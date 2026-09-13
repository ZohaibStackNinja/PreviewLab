'use client';

import { useState } from 'react';
import { CommentsPanel, type CommentItem } from '@/components/Comments';
import { postJson } from '@/lib/client';

/** Guest comment composer for the public review page (COM-001..008).
 * Anonymous, display-name attribution, no account. */
export function ShareComments({
  token,
  initialComments,
}: {
  token: string;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState<CommentItem[] | null>(initialComments);

  const post = async (displayName: string, body: string) => {
    const { comment } = await postJson<{ comment: CommentItem }>(
      `/api/shares/token/${encodeURIComponent(token)}/comments`,
      { displayName, body },
    );
    setComments((cs) => [...(cs || []), comment]);
  };

  return (
    <div className="share-comments">
      <div className="comments-head">
        <h2>Comments</h2>
        {comments !== null && <span className="comment-count">{comments.length}</span>}
      </div>
      <CommentsPanel comments={comments} onPost={post} asLabel="Guest reviewer" storeName />
    </div>
  );
}
