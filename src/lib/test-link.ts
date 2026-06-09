/** Canonical shareable link candidates paste into the ENUM desktop app. */
export function getTestLink(testCode: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://enum.live";
  return `${origin}/test/${testCode}`;
}
