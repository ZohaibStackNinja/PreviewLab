import mongoose, { Schema } from "mongoose";

export interface ShareLinkDoc {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  platform: string;
  contextId: string;
  device: "desktop" | "mobile";
  theme: "dark" | "light";
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

const shareLinkSchema = new Schema<ShareLinkDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true },
    platform: { type: String, required: true },
    contextId: { type: String, required: true },
    device: { type: String, enum: ["desktop", "mobile"], required: true },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

export const ShareLink = mongoose.model<ShareLinkDoc>("ShareLink", shareLinkSchema);
