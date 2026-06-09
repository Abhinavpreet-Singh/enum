// Server component — required by Next.js static export for dynamic segments.
// This route is used for deep-linking (e.g. when resuming an attempt).
// The real exam state lives in the Zustand store, so we always redirect to /exam.
import ExamRedirectClient from "./redirect-client";

export function generateStaticParams() {
  // Provide a placeholder so the static export builds successfully.
  // In practice, any attemptId is handled client-side by redirecting to /exam.
  return [{ attemptId: "_" }];
}

export default function LegacyAttemptPage() {
  return <ExamRedirectClient />;
}
