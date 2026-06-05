import { Suspense } from "react";
import ProjectDetailClient from "./ProjectDetailClient";
import { KettleLoader } from "@/components/KettleLoader";

// Static route — project id passed as `?id=` query param so any id works
// under `output: export` without generateStaticParams.
export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-base">
          <KettleLoader message="Loading project details..." />
        </div>
      }
    >
      <ProjectDetailClient />
    </Suspense>
  );
}
