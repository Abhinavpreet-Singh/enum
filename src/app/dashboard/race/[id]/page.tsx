"use client";

import { use } from "react";
import RaceLobby from "@/components/race/race-lobby";

export default function RaceLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RaceLobby competitionId={id} />;
}
