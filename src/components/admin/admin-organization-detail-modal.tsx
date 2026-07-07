"use client";
import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect } from "react";
interface CompanyDetail {
  id: string;
  name: string;
  email: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  approvalStatus: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assessments?: number;
    questionBanks?: number;
  };
  assessments?: Array<{
    id: string;
    title: string;
    status: string;
    testCode: string;
    createdAt: string;
    _count?: {
      attempts?: number;
      invites?: number;
    };
  }>;
}

interface AdminCompanyDetailModalProps {
  company: { id: string };
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function AdminCompanyDetailModal({
  company,
  isOpen,
  onClose,
  onDeleted,
}: AdminCompanyDetailModalProps) {
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchCompanyDetail();
  }, [isOpen]);

  const fetchCompanyDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getMemoryToken();
      const response = await api.get(
        `/api/v1/admin/companies/${company.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setCompanyDetail(response.data.data);
    } catch (err) {
      console.error("Failed to fetch company detail:", err);
      setError("Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      const token = getMemoryToken();
      await api.delete(`/api/v1/admin/companies/${company.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("Company deleted successfully");
      onDeleted();
      onClose();
    } catch (err) {
      alert("Failed to delete company");
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400";
      case "rejected":
        return "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400";
      default:
        return "bg-gray-100 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 rounded max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4">
          <h2 className="font-mono text-lg tracking-wider">COMPANY DETAILS</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded">
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : companyDetail ? (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    COMPANY NAME
                  </label>
                  <p className="text-sm font-mono mt-1 font-bold">
                    {companyDetail.name}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    EMAIL
                  </label>
                  <p className="text-sm font-mono mt-1">{companyDetail.email}</p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    WEBSITE
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {companyDetail.website ? (
                      <a
                        href={companyDetail.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {companyDetail.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    STATUS
                  </label>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-mono tracking-wider rounded mt-1 ${getStatusBadgeColor(
                      companyDetail.approvalStatus
                    )}`}
                  >
                    {companyDetail.approvalStatus.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    INDUSTRY
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {companyDetail.industry || "-"}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    SIZE
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {companyDetail.size || "-"}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    LOCATION
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {companyDetail.location || "-"}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                <h3 className="font-mono text-xs tracking-wider mb-3">
                  CONTACT INFORMATION
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      CONTACT NAME
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {companyDetail.contactName || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      CONTACT EMAIL
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {companyDetail.contactEmail || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                <h3 className="font-mono text-xs tracking-wider mb-3">
                  PLATFORM ACTIVITY
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border border-gray-200 dark:border-neutral-800 rounded">
                    <p className="font-mono text-xs text-gray-600 dark:text-neutral-400">
                      Assessments
                    </p>
                    <p className="font-mono text-lg font-bold mt-1">
                      {companyDetail._count?.assessments || 0}
                    </p>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-neutral-800 rounded">
                    <p className="font-mono text-xs text-gray-600 dark:text-neutral-400">
                      Question Banks
                    </p>
                    <p className="font-mono text-lg font-bold mt-1">
                      {companyDetail._count?.questionBanks || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {companyDetail.description && (
                <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    DESCRIPTION
                  </label>
                  <p className="text-sm mt-2 text-gray-700 dark:text-neutral-300">
                    {companyDetail.description}
                  </p>
                </div>
              )}

              {/* Assessments */}
              {companyDetail.assessments && companyDetail.assessments.length > 0 && (
                <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                  <h3 className="font-mono text-xs tracking-wider mb-3">
                    RECENT ASSESSMENTS
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {companyDetail.assessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="p-3 border border-gray-200 dark:border-neutral-800 rounded"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-sm font-bold">
                              {assessment.title}
                            </p>
                            <p className="font-mono text-xs text-gray-600 dark:text-neutral-400 mt-1">
                              Code: {assessment.testCode}
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                            {assessment.status}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs font-mono text-gray-600 dark:text-neutral-400">
                          <span>Attempts: {assessment._count?.attempts || 0}</span>
                          <span>Invites: {assessment._count?.invites || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      CREATED
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {new Date(companyDetail.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      LAST UPDATED
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {new Date(companyDetail.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-neutral-800 p-4 flex gap-2 justify-end bg-gray-50 dark:bg-neutral-900">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-neutral-700 font-mono text-xs tracking-wider hover:bg-gray-100 dark:hover:bg-neutral-900 transition rounded"
          >
            CLOSE
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 font-mono text-xs tracking-wider hover:bg-red-50 dark:hover:bg-red-950/30 transition rounded"
          >
            DELETE COMPANY
          </button>
        </div>
      </div>
    </div>
  );
}
