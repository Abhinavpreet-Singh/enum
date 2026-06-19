/** Canonical shareable link candidates paste into the ENUM desktop app. */
export function getTestLink(testCode: string): string {
  const origin =
    process.env.NEXT_PUBLIC_EXAM_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://exam.enum.live";
  return `${origin.replace(/\/$/, "")}/test/${testCode}`;
}
