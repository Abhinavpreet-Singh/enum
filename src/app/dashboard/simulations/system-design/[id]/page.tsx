import SystemDesignClient from "./system-design-client";
import axios from "axios";
import { proxy } from "@/app/proxy";

export async function generateStaticParams() {
  try {
    const res = await axios.get(`${proxy}/api/v1/system-design/simulations`);
    const items = (res.data?.data ?? []) as Array<{ id?: string }>;
    const params = items
      .map((s) => ({ id: s.id ?? "" }))
      .filter((p) => p.id);
    return params.length > 0 ? params : [{ id: "placeholder" }];
  } catch {
    return [{ id: "placeholder" }];
  }
}

export default function SystemDesignSimulationPage() {
  return <SystemDesignClient />;
}
