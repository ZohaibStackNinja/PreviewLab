import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/server-api";
import type { Project, VariantView } from "@/lib/types";
import { isPlatformId } from "@/lib/platforms";
import { CompareView } from "@/components/CompareView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { projectId: string };
  searchParams: { left?: string; right?: string };
}

/** Side-by-side comparison of the creative in two platform contexts. */
export default async function ComparePage({ params, searchParams }: PageProps) {
  const cookieHeader = cookies().toString();
  if (!cookieHeader) redirect("/");
  let detail: { project: Project; variants: VariantView[] };
  try {
    detail = await apiFetch(`/projects/${params.projectId}`, cookieHeader);
  } catch {
    notFound();
  }
  const { project, variants } = detail!;

  const left = isPlatformId(searchParams.left || "") ? (searchParams.left as never) : "instagram";
  const right = isPlatformId(searchParams.right || "") ? (searchParams.right as never) : "facebook";

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
      <CompareView
        project={project}
        variants={variants}
        activeVariantId={project.activeVariantId}
        initialLeft={left}
        initialRight={right}
      />
    </div>
  );
}
