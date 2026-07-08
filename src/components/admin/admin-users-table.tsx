"use client";
import { API_BASE_URL } from "@/lib/api-config";
import api from "@/lib/api";
import { getMemoryToken } from "@/lib/tokenStore";

import { useState, useEffect } from "react";
import AdminUserDetailModal from "./admin-user-detail-modal";

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  accountRole: string;
  createdAt: string;
  xp?: number;
  avatar?: string;
  _count?: {
    solutions?: number;
    submissions?: number;
  };
}

interface AdminUsersTableProps {
  onRefresh?: () => void;
}

export default function AdminUsersTable({ onRefresh }: AdminUsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getMemoryToken();
      const response = await api.get("/api/v1/admin/users", {
        params: { page, limit, search: search || undefined },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUsers(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = getMemoryToken();
      await api.delete(`/api/v1/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUsers(users.filter((u) => u.id !== userId));
      alert("User deleted successfully");
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by username, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white rounded text-sm focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>
        <button
          onClick={() => {
            fetchUsers();
            onRefresh?.();
          }}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-mono text-xs tracking-wider hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors rounded"
        >
          REFRESH
        </button>
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
                USERNAME
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                EMAIL
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                ROLE
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                JOINED
              </th>
              <th className="px-4 py-2 text-left font-mono text-xs tracking-wider">
                XP
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/50 transition"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-neutral-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-mono tracking-wider bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded">
                      {user.accountRole.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-neutral-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">
                    {user.xp || 0}
                  </td>
                  <td className="px-4 py-3 space-x-2 flex">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDetail(true);
                      }}
                      className="px-2 py-1 text-xs font-mono tracking-wider border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-900 transition rounded"
                    >
                      VIEW
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
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
          Page {page} of {totalPages} ({total} total users)
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

      {/* User Detail Modal */}
      {selectedUser && (
        <AdminUserDetailModal
          user={selectedUser}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          onDeleted={() => {
            setUsers(users.filter((u) => u.id !== selectedUser.id));
            setShowDetail(false);
          }}
        />
      )}
    </div>
  );
}
