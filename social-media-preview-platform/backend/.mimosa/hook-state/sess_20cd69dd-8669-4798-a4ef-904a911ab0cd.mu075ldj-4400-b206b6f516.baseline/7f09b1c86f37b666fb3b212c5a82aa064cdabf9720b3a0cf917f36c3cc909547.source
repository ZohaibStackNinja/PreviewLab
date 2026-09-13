import { Types } from "mongoose";
import { ApiError } from "../middleware/error.middleware";
import { Asset, AssetDoc } from "../models/asset.model";
import { Project } from "../models/project.model";
import { Variant, VariantDoc } from "../models/variant.model";
import { toVariantView, VariantView, getOwnedProject } from "./project.service";
import { storeImage, deleteImage, readLocalImage } from "./cloudinary.service";

function runFileCheck(file: Express.Multer.File | undefined): void {
  if (!file || file.size === 0) {
    throw new ApiError(400, "NO_FILE", "Please choose an image to upload.");
  }
}

/**
 * POST create variant — stores the binary via the storage service first; the
 * variant is only created once the asset exists (Dev Doc §11.1), so no
 * broken variant can exist. New uploads become the active variant.
 */
export async function createVariant(
  projectId: string,
  sessionId: string,
  file: Express.Multer.File | undefined,
  meta: { width?: number; height?: number; name?: string },
): Promise<VariantView> {
  runFileCheck(file);
  const project = await getOwnedProject(projectId, sessionId);

  const stored = await storeImage(
    file!.buffer,
    file!.mimetype,
    "creatives",
  );
  const asset = await Asset.create({
    projectId: project._id,
    variantId: null,
    fileName: stored.fileName,
    provider: stored.provider,
    publicId: stored.publicId,
    url: stored.url,
    bytes: stored.bytes,
    mimeType: file!.mimetype,
    width: meta.width || 0,
    height: meta.height || 0,
    createdAt: new Date(),
  });

  const fallbackName =
    (file!.originalname || "Creative")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim() || "Creative";
  const name = (meta.name || fallbackName).slice(0, 80);

  const variant = await Variant.create({
    projectId: project._id,
    name,
    assetId: asset._id,
    createdAt: new Date(),
  });
  await Asset.updateOne({ _id: asset._id }, { $set: { variantId: variant._id } });
  await Project.updateOne(
    { _id: project._id },
    { $set: { activeVariantId: variant._id } },
  );

  return toVariantView(variant.toObject() as VariantDoc, asset.toObject() as AssetDoc);
}

/** Loads a variant owned via its parent project (joint ownership check). */
async function loadOwnedVariant(
  variantId: string,
  sessionId: string,
): Promise<{ variant: VariantDoc; projectId: string }> {
  const variant = await Variant.findById(variantId).lean<VariantDoc | null>();
  if (!variant) {
    throw new ApiError(404, "NOT_FOUND", "This variant could not be found.");
  }
  // Joint query: parent project id + session owner.
  const owned = await Project.exists({
    _id: variant.projectId,
    ownerSessionId: sessionId,
  }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This variant could not be found.");
  }
  return { variant, projectId: variant.projectId.toString() };
}

/** POST replace — swaps the source image while keeping the variant identity. */
export async function replaceVariantImage(
  variantId: string,
  sessionId: string,
  file: Express.Multer.File | undefined,
  meta: { width?: number; height?: number },
): Promise<VariantView> {
  runFileCheck(file);
  const { variant, projectId } = await loadOwnedVariant(variantId, sessionId);

  const oldAsset = await Asset.findById(variant.assetId).lean<AssetDoc | null>();
  const stored = await storeImage(file!.buffer, file!.mimetype, "creatives");
  const asset = await Asset.create({
    projectId: new Types.ObjectId(projectId),
    variantId: variant._id,
    fileName: stored.fileName,
    provider: stored.provider,
    publicId: stored.publicId,
    url: stored.url,
    bytes: stored.bytes,
    mimeType: file!.mimetype,
    width: meta.width || 0,
    height: meta.height || 0,
    createdAt: new Date(),
  });

  const updated = await Variant.findByIdAndUpdate(
    variant._id,
    { $set: { assetId: asset._id } },
    { new: true },
  ).lean<VariantDoc | null>();

  if (oldAsset) {
    await Asset.deleteOne({ _id: oldAsset._id });
    await deleteImage(oldAsset);
  }

  return toVariantView(updated as VariantDoc, asset.toObject() as AssetDoc);
}

export async function updateVariant(
  variantId: string,
  sessionId: string,
  dto: { name?: string; adjustments?: Record<string, { x: number; y: number; scale: number }> | null },
): Promise<VariantView> {
  await loadOwnedVariant(variantId, sessionId);
  const patch: Record<string, unknown> = {};
  if (dto.name !== undefined) patch.name = dto.name;
  if (dto.adjustments !== undefined) patch.adjustments = dto.adjustments ?? {};
  const updated = await Variant.findByIdAndUpdate(
    variantId,
    { $set: patch },
    { new: true },
  ).lean<VariantDoc | null>();
  const asset = await Asset.findById(updated?.assetId).lean<AssetDoc | null>();
  return toVariantView(updated as VariantDoc, asset);
}

export async function deleteVariant(variantId: string, sessionId: string): Promise<void> {
  const { variant } = await loadOwnedVariant(variantId, sessionId);
  const asset = await Asset.findById(variant.assetId).lean<AssetDoc | null>();
  await Variant.deleteOne({ _id: variant._id });
  if (asset) {
    await Asset.deleteOne({ _id: asset._id });
    await deleteImage(asset);
  }
  // Orphan prevention (NFR-009): fall back to the first remaining variant.
  const next = await Variant.findOne({ projectId: variant.projectId })
    .sort({ createdAt: 1 })
    .lean<VariantDoc | null>();
  await Project.updateOne(
    { _id: variant.projectId, activeVariantId: variant._id },
    { $set: { activeVariantId: next ? next._id : null } },
  );
}

export async function getVariant(
  variantId: string,
  sessionId: string,
): Promise<VariantView> {
  const { variant } = await loadOwnedVariant(variantId, sessionId);
  const asset = await Asset.findById(variant.assetId).lean<AssetDoc | null>();
  return toVariantView(variant, asset);
}

export interface AssetView {
  id: string;
  url: string;
  mimeType: string;
  bytes: number;
}

export async function getAsset(assetId: string): Promise<AssetView> {
  const asset = await Asset.findById(assetId).lean<AssetDoc | null>();
  if (!asset) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }
  return {
    id: asset._id.toString(),
    url: asset.provider === "cloudinary" ? asset.url : `/api/assets/${asset._id.toString()}`,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
  };
}

/** Raw asset document for the streaming/redirect controller. */
export async function getAssetDocument(assetId: string): Promise<AssetDoc> {
  const asset = await Asset.findById(assetId).lean<AssetDoc | null>();
  if (!asset) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }
  return asset;
}

export { readLocalImage };
