"use client";

import type { ComponentType } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import AdminPageShell from "@/components/admin/admin-page-shell";
import QuestionForm from "@/components/admin/question-form";
import SimulationForm from "@/components/admin/simulation-form";
import LinuxQuestionForm from "@/components/admin/content/linux-question-form";
import IncidentForm from "@/components/admin/content/incident-form";
import SystemDesignForm from "@/components/admin/content/system-design-form";
import {
  ADMIN_CONTENT_TYPES,
  isAdminContentType,
  type AdminContentType,
} from "@/lib/admin-content-types";

const FORM_BY_TYPE: Record<AdminContentType, ComponentType> = {
  dsa: QuestionForm,
  linux: LinuxQuestionForm,
  simulations: SimulationForm,
  incidents: IncidentForm,
  "system-design": SystemDesignForm,
};

export default function ContentCreateClient() {
  const params = useParams();
  const router = useRouter();
  const rawType = params?.type;
  const type = Array.isArray(rawType) ? rawType[0] : rawType;

  useEffect(() => {
    if (type === "dsa") {
      router.replace("/dashboard/admin/content/dsa?tab=create");
    }
  }, [type, router]);

  if (type === "dsa") {
    return (
      <div className="font-mono text-xs text-gray-400">Redirecting to DSA admin...</div>
    );
  }

  if (!type || !isAdminContentType(type)) {
    notFound();
  }

  const config = ADMIN_CONTENT_TYPES[type];
  const FormComponent = FORM_BY_TYPE[type];

  return (
    <AdminPageShell
      title={`Add ${config.singularLabel}`}
      description={config.description}
    >
      <Link
        href="/dashboard/admin/content/"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to content
      </Link>
      <FormComponent />
    </AdminPageShell>
  );
}
