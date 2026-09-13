import mongoose, { Schema } from "mongoose";

export type DeviceMode = "desktop" | "mobile";

export interface ProjectDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  ownerSessionId: string;
  activeVariantId: mongoose.Types.ObjectId | null;
  lastPlatform: string;
  lastDevice: DeviceMode;
  lastContext?: string;
  brandName?: string | null;
  brandHandle?: string | null;
  brandTagline?: string | null;
  logoAssetId: mongoose.Types.ObjectId | null;
  bannerAssetId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 500 },
    ownerSessionId: { type: String, required: true, index: true },
    activeVariantId: { type: Schema.Types.ObjectId, ref: "Variant", default: null },
    lastPlatform: { type: String, default: "linkedin" },
    lastDevice: { type: String, enum: ["desktop", "mobile"], default: "desktop" },
    lastContext: { type: String, maxlength: 40 },
    brandName: { type: String, default: null, maxlength: 80 },
    brandHandle: { type: String, default: null, maxlength: 40 },
    brandTagline: { type: String, default: null, maxlength: 160 },
    logoAssetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null },
    bannerAssetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null },
  },
  { timestamps: true, versionKey: false },
);

export const Project = mongoose.model<ProjectDoc>("Project", projectSchema);
