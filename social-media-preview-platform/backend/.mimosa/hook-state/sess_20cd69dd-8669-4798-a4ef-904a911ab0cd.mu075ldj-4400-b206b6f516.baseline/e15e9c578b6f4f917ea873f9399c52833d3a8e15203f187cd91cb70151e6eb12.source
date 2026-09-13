import mongoose, { Schema } from "mongoose";

/** Per-platform crop adjustment of the creative inside a context. */
export interface CropAdjustment {
  x: number; // -50..50 (%)
  y: number; // -50..50 (%)
  scale: number; // 1..2
}

export interface VariantDoc {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  assetId: mongoose.Types.ObjectId;
  adjustments: Map<string, CropAdjustment>;
  createdAt: Date;
  updatedAt: Date;
}

const cropAdjustmentSchema = new Schema<CropAdjustment>(
  {
    x: { type: Number, min: -50, max: 50, required: true },
    y: { type: Number, min: -50, max: 50, required: true },
    scale: { type: Number, min: 1, max: 2, required: true },
  },
  { _id: false, versionKey: false },
);

const variantSchema = new Schema<VariantDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    assetId: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    adjustments: { type: Map, of: cropAdjustmentSchema, default: {} },
  },
  { timestamps: true, versionKey: false },
);

export const Variant = mongoose.model<VariantDoc>("Variant", variantSchema);
