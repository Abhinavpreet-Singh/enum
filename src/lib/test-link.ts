/** Canonical shareable link candidates open in the ENUM exam client (web or desktop). */
export function getExamAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_EXAM_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : "https://exam.enum.live")
  ).replace(/\/$/, "");
}

export function getTestLink(testCode: string): string {
  return `${getExamAppOrigin()}/test/${testCode}`;
}
