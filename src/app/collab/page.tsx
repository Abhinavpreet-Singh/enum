import { redirect } from "next/navigation";

export default function CollabPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();

  for (const key of ["room", "roomId", "code", "invite"]) {
    const value = searchParams?.[key];
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
  }

  redirect(
    params.toString()
      ? `/dashboard/collab?${params.toString()}`
      : "/dashboard/collab",
  );
}
