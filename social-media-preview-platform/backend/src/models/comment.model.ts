import mongoose, { Schema } from "mongoose";

export interface CommentDoc {
  _id: mongoose.Types.ObjectId;
  shareId: mongoose.Types.ObjectId;
  displayName: string;
  body: string;
  createdAt: Date;
}

const commentSchema = new Schema<CommentDoc>(
  {
    shareId: { type: Schema.Types.ObjectId, ref: "ShareLink", required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

commentSchema.index({ shareId: 1, createdAt: 1 });

export const Comment = mongoose.model<CommentDoc>("Comment", commentSchema);
