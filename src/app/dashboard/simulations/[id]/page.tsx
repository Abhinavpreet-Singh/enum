import SimulationDetailClient from "./simulation-detail-client";
import { browserSimulations } from "@/data/browser-simulations";
import axios from "axios";
import { proxy } from "@/app/proxy";

export async function generateStaticParams() {
  const local = browserSimulations.map((s) => ({ id: s.id }));

  try {
    const res = await axios.get(`${proxy}/api/v1/simulations/getSimulations`);
    const backend = (res.data?.data ?? []) as Array<{ id?: string }>;
    const remote = backend
      .map((s) => ({ id: s.id ?? "" }))
      .filter((p) => p.id);
    const merged = [...local, ...remote];
    const unique = Array.from(new Map(merged.map((p) => [p.id, p])).values());
    return unique.length > 0 ? unique : [{ id: "placeholder" }];
  } catch {
    return local.length > 0 ? local : [{ id: "placeholder" }];
  }
}

export default function SimulationDetailPage() {
  return <SimulationDetailClient />;
}
