import { notFound, redirect } from 'next/navigation';
import type { DeviceMode, PlatformId } from '@/lib/types';
import { getServerSession } from '@/lib/auth';
import { findAsset, findProject, listShares, listVariants } from '@/lib/db';
import { PLATFORMS, defaultContext, isDeviceMode, isPlatformId, isValidContext } from '@/lib/platforms';
import { toShareView, toVariantView } from '@/lib/serialize';
import { Workspace } from '@/components/Workspace';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { projectId: string; platform: string };
  searchParams: { device?: string; context?: string };
}

/**
 * Dedicated platform preview page (NAV-001..005). Each supported platform is
 * a first-class route; the project, variant, placement and device are
 * retained when switching between routes (NAV-006).
 */
export default async function PlatformWorkspacePage({ params, searchParams }: PageProps) {
  const session = getServerSession();
  if (!session) redirect('/');

  const project = findProject(params.projectId);
  if (!project || project.ownerSessionId !== session.id) notFound();
  if (!isPlatformId(params.platform)) notFound();
  const platform: PlatformId = params.platform;

  const variants = listVariants(project.id).map((v) => toVariantView(v, findAsset(v.assetId)));
  const shares = listShares(project.id).map((s) => toShareView(s));

  const initialDevice: DeviceMode = isDeviceMode(searchParams.device || '')
    ? (searchParams.device as DeviceMode)
    : PLATFORMS[platform].mobileFirst
      ? 'mobile'
      : project.lastDevice;

  // Placement context: URL ?context= wins, then the saved project state,
  // then the platform default. Invalid values fall back per SRS §5.1.
  const requested = searchParams.context;
  const initialContext = isValidContext(platform, requested)
    ? (requested as string)
    : isValidContext(platform, project.lastContext)
      ? (project.lastContext as string)
      : defaultContext(platform);

  return (
    <Workspace
      project={project}
      initialVariants={variants}
      initialShares={shares}
      platform={platform}
      initialDevice={initialDevice}
      initialContext={initialContext}
    />
  );
}
