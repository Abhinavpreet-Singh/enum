"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy.js";
import AdminCompanyDetailModal from "./admin-organization-detail-modal";

interface Company {
  id: string;
  name: string;
  email: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  approvalStatus: string;
  createdAt: string;
  contactName?: string;
  _count?: {
    assessments?: number;
    questionBanks?: number;
  };
}

interface AdminCompaniesTableProps {
  onRefresh?: () => void;
}

export default function AdminCompaniesTable({ onRefresh }: AdminCompaniesTableProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${proxy}/api/v1/admin/companies`, {
        params: {
          page,
          limit,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setCompanies(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCompanies();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [page]);

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${proxy}/api/v1/admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setCompanies(companies.filter((c) => c.id !== companyId));
      alert("Company deleted successfully");
    } catch (err) {
      alert("Failed to delete company");
    }
  };

  const handleApprovalChange = async (companyId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.patch(
        `${proxy}/api/v1/admin/companies/${companyId}/approval`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setCompanies(
        companies.map((c) =>
          c.id === companyId ? { ...c, approvalStatus: newStatus } : c
        )
      );
      alert(`Company ${newStatus} successfully`);
    } catch (err) {
      alert("Failed to update approval status");
    }
  };

  const totalPages = Math.ceil(total / limit);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by company name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded text-sm focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded text-sm focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => {
              fetchCompanies();
              onRefresh?.();
            }}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors rounded"
          >
            REFRESH
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-300 dark:border-neutral-700 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-neutral-900 border-b border-gray-300 dark:border-neutral-700">
            <tr>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                COMPANY NAME
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                EMAIL
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                STATUS
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                JOINED
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                ASSESSMENTS
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No companies found
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition"
                >
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {company.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-neutral-400">
                    {company.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-mono tracking-wider rounded ${getStatusBadgeColor(
                        company.approvalStatus
                      )}`}
                    >
                      {company.approvalStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-neutral-400">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {company._count?.assessments || 0}
                  </td>
                  <td className="px-4 py-3 space-x-1 flex flex-wrap gap-1">
                    <button
                      onClick={() => {
                        setSelectedCompany(company);
                        setShowDetail(true);
                      }}
                      className="px-2 py-1 text-xs font-mono tracking-wider border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-900 transition rounded"
                    >
                      VIEW
                    </button>
                    {company.approvalStatus !== "approved" && (
                      <button
                        onClick={() =>
                          handleApprovalChange(company.id, "approved")
                        }
                        className="px-2 py-1 text-xs font-mono tracking-wider border border-green-300 dark:border-green-900 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition rounded"
                      >
                        APPROVE
                      </button>
                    )}
                    {company.approvalStatus !== "rejected" && (
                      <button
                        onClick={() =>
                          handleApprovalChange(company.id, "rejected")
                        }
                        className="px-2 py-1 text-xs font-mono tracking-wider border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition rounded"
                      >
                        REJECT
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCompany(company.id)}
                      className="px-2 py-1 text-xs font-mono tracking-wider border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition rounded"
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600 dark:text-neutral-400 font-mono">
          Page {page} of {totalPages} ({total} total companies)
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs font-mono border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition rounded"
          >
            PREV
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs font-mono border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition rounded"
          >
            NEXT
          </button>
        </div>
      </div>

      {/* Company Detail Modal */}
      {selectedCompany && (
        <AdminCompanyDetailModal
          company={selectedCompany}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onDeleted={() => {
            setCompanies(companies.filter((c) => c.id !== selectedCompany.id));
            setShowDetail(false);
          }}
        />
      )}
    </div>
  );
}
