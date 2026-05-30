import ProjectDetailClient from "./ProjectDetailClient";

// Required for Next.js static export with dynamic routes.
// Returns a dummy ID to satisfy the build process for static export.
// Client-side navigation (router.push) still works for any ID.
export function generateStaticParams() {
  return [{ id: "dummy" }];
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
