import { ApiError } from "../middleware/error.middleware";
import { Types } from "mongoose";
import { Asset, AssetDoc } from "../models/asset.model";
import { Project } from "../models/project.model";
import { storeImage, deleteImage } from "./cloudinary.service";

const KIND_FIELDS = { logo: "logoAssetId", banner: "bannerAssetId" } as const;
type BrandKind = keyof typeof KIND_FIELDS;

export interface BrandAssetView {
  assetId: string | null;
  asset: {
    id: string;
    url: string;
    mimeType: string;
    bytes: number;
  } | null;
}

/**
 * Brand asset upload (logo / banner): stores the binary via the storage
 * service, records the asset, points the project field at it and removes the
 * previous asset so no orphan binaries remain.
 */
export async function uploadBrandAsset(
  projectId: string,
  sessionId: string,
  kind: BrandKind,
  file: Express.Multer.File | undefined,
  meta: { width?: number; height?: number },
): Promise<BrandAssetView> {
  if (!file || file.size === 0) {
    throw new ApiError(400, "NO_FILE", "Please choose an image to upload.");
  }
  const owned = await Project.exists({ _id: projectId, ownerSessionId: sessionId }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This project could not be found.");
  }

  const stored = await storeImage(file.buffer, file.mimetype, "brand");
  const asset = await Asset.create({
    projectId: new Types.ObjectId(projectId),
    variantId: null,
    fileName: stored.fileName,
    provider: stored.provider,
    publicId: stored.publicId,
    url: stored.url,
    bytes: stored.bytes,
    mimeType: file.mimetype,
    width: meta.width || 0,
    height: meta.height || 0,
    createdAt: new Date(),
  });

  const field = KIND_FIELDS[kind];
  const previousProject = await Project.findById(projectId).lean<
    { logoAssetId: import("mongoose").Types.ObjectId | null; bannerAssetId: import("mongoose").Types.ObjectId | null } | null
  >();
  await Project.updateOne({ _id: projectId }, { $set: { [field]: asset._id } });

  const previousId =
    previousProject?.[kind === "logo" ? "logoAssetId" : "bannerAssetId"] || null;
  if (previousId) {
    const old = await Asset.findById(previousId).lean<AssetDoc | null>();
    if (old) {
      await Asset.deleteOne({ _id: old._id });
      await deleteImage(old);
    }
  }

  return {
    assetId: asset._id.toString(),
    asset: {
      id: asset._id.toString(),
      url: stored.url,
      mimeType: file.mimetype,
      bytes: stored.bytes,
    },
  };
}

/** DELETE — clears the brand asset (falls back to generated identity). */
export async function clearBrandAsset(
  projectId: string,
  sessionId: string,
  kind: BrandKind,
): Promise<{ cleared: true }> {
  const owned = await Project.exists({ _id: projectId, ownerSessionId: sessionId }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This project could not be found.");
  }
  const project = await Project.findById(projectId).lean<
    { logoAssetId: import("mongoose").Types.ObjectId | null; bannerAssetId: import("mongoose").Types.ObjectId | null } | null
  >();
  await Project.updateOne({ _id: projectId }, { $set: { [KIND_FIELDS[kind]]: null } });
  const previousId =
    (project?.[kind === "logo" ? "logoAssetId" : "bannerAssetId"] || null) as
      | import("mongoose").Types.ObjectId
      | null;
  if (previousId) {
    const old = await Asset.findById(previousId).lean<AssetDoc | null>();
    if (old) {
      await Asset.deleteOne({ _id: old._id });
      await deleteImage(old);
    }
  }
  return { cleared: true };
}

/** GET — owner view of one brand asset. */
export async function getBrandAsset(
  projectId: string,
  sessionId: string,
  kind: BrandKind,
): Promise<BrandAssetView> {
  const owned = await Project.exists({ _id: projectId, ownerSessionId: sessionId }).exec();
  if (!owned) {
    throw new ApiError(404, "NOT_FOUND", "This project could not be found.");
  }
  const project = await Project.findById(projectId).lean<
    { logoAssetId: import("mongoose").Types.ObjectId | null; bannerAssetId: import("mongoose").Types.ObjectId | null } | null
  >();
  const assetId =
    (project?.[kind === "logo" ? "logoAssetId" : "bannerAssetId"] || null) as
      | import("mongoose").Types.ObjectId
      | null;
  const asset = assetId ? await Asset.findById(assetId).lean<AssetDoc | null>() : null;
  return {
    assetId: assetId ? assetId.toString() : null,
    asset: asset
      ? {
          id: asset._id.toString(),
          url: asset.provider === "cloudinary" ? asset.url : `/api/assets/${asset._id.toString()}`,
          mimeType: asset.mimeType,
          bytes: asset.bytes,
        }
      : null,
  };
}
