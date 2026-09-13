import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/server-api";
import type { Project, VariantView } from "@/lib/types";
import { OverviewGrid } from "@/components/OverviewGrid";

export const dynamic = "force-dynamic";

/** All-platforms overview: the active creative in every context at once. */
export default async function OverviewPage({
  params,
}: {
  params: { projectId: string };
}) {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) redirect("/");
  let detail: { project: Project; variants: VariantView[] };
  try {
    detail = await apiFetch(`/projects/${params.projectId}`, cookieHeader);
  } catch {
    notFound();
  }
  const { project, variants } = detail!;

  return (
    <div className="subpage">
      <header className="subpage-topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Preview Lab
        </span>
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
