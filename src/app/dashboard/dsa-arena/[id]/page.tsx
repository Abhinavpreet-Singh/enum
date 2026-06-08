import DSAArenaClientPage from "./ClientPage";

// For `output: "export"`, generateStaticParams must return at least one entry.
// The actual id is read client-side via useParams() at runtime.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function WorkspacePage() {
  return <DSAArenaClientPage />;
}
