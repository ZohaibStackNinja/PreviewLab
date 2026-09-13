import mongoose, { Schema } from "mongoose";

export interface AssetDoc {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  /** null for brand assets (logo/banner) not tied to a variant. */
  variantId: mongoose.Types.ObjectId | null;
  fileName: string;
  /** "cloudinary" (production) or "local" (dev/demo fallback driver). */
  provider: "cloudinary" | "local";
  publicId: string;
  url: string;
  bytes: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: Date;
}

const assetSchema = new Schema<AssetDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", default: null, index: true },
    fileName: { type: String, required: true },
    provider: { type: String, enum: ["cloudinary", "local"], required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    bytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

export const Asset = mongoose.model<AssetDoc>("Asset", assetSchema);
