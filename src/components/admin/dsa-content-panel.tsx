"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import QuestionForm from "@/components/admin/question-form";
import QuestionsManager from "@/components/admin/questions-manager";
import EditQuestionModal from "@/components/admin/edit-question-modal";
import type { Question } from "@/data/dsa-questions";
import { panelSurface } from "@/components/admin/content/admin-form-styles";

export type DsaContentTab = "create" | "edit" | "delete";

const TABS: {
  id: DsaContentTab;
  label: string;
  icon: typeof Plus;
}[] = [
  { id: "create", label: "Create", icon: Plus },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "delete", label: "Delete", icon: Trash2 },
];

function isDsaContentTab(value: string | null): value is DsaContentTab {
  return value === "create" || value === "edit" || value === "delete";
}

export default function DsaContentPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DsaContentTab = isDsaContentTab(tabParam) ? tabParam : "create";

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [inventoryKey, setInventoryKey] = useState(0);

  const setTab = useCallback(
    (tab: DsaContentTab) => {
      router.replace(`/dashboard/admin/content/dsa?tab=${tab}`);
    },
    [router],
  );

  const handleInventoryChanged = () => {
    setInventoryKey((key) => key + 1);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/content/"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-black dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to content
      </Link>

      <div className={`${panelSurface} p-1 flex flex-wrap gap-1`}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              activeTab === id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "create" && (
        <QuestionForm
          redirectOnSuccess="/dashboard/admin/content/dsa?tab=edit"
          onSuccess={handleInventoryChanged}
        />
      )}

      {activeTab === "edit" && (
        <QuestionsManager
          key={`dsa-edit-${inventoryKey}`}
          mode="edit"
          onEdit={setEditingQuestion}
          onChanged={handleInventoryChanged}
        />
      )}

      {activeTab === "delete" && (
        <QuestionsManager
          key={`dsa-delete-${inventoryKey}`}
          mode="delete"
          onChanged={handleInventoryChanged}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSuccess={() => {
            setEditingQuestion(null);
            handleInventoryChanged();
          }}
        />
      )}
    </div>
  );
}
