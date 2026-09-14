import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/server-api';
import type { Project, VariantView } from '@/lib/types';
import { OverviewGrid } from '@/components/OverviewGrid';
import { OverviewClientLoader } from '@/components/OverviewClientLoader';

export const dynamic = 'force-dynamic';

/** All-platforms overview: the active creative in every context at once. */
export default async function OverviewPage({
  params,
}: {
  params: { projectId: string };
}) {
  const cookieHeader = cookies().toString();
  let detail: { project: Project; variants: VariantView[] } | null = null;
  if (cookieHeader) {
    try {
      detail = await apiFetch(`/projects/${params.projectId}`, cookieHeader);
    } catch {
      detail = null;
    }
  }

  if (!detail) {
    return <OverviewClientLoader projectId={params.projectId} />;
  }

  const { project, variants } = detail;

  return (
    <div className="subpage">
      <header className="subpage-topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark" aria-hidden="true" />
          Practiscale Preview Lab
        </Link>
        <span className="topbar-divider" aria-hidden="true" />
        <span className="subpage-project truncate">{project.title}</span>
        <span className="topbar-spacer" />
        <Link
          className="btn btn-secondary btn-sm"
          href={`/project/${project.id}/${project.lastPlatform}`}
        >
          Back to workspace
        </Link>
      </header>
      <OverviewGrid
        project={project}
        variants={variants}
        activeVariantId={project.activeVariantId}
      />
    </div>
  );
}
