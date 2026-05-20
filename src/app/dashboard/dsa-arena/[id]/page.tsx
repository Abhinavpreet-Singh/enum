import WorkspaceClient from "./workspace-client";
import { fetchQuestions } from "@/data/dsa-questions";

export async function generateStaticParams() {
  const questions = await fetchQuestions();
  const params = questions
    .map((q) => ({ id: q.id }))
    .filter((p) => p.id);
  return params.length > 0 ? params : [{ id: "placeholder" }];
}

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
