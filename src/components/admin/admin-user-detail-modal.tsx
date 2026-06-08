"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { proxy } from "@/app/proxy.js";

interface UserDetail {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  accountRole: string;
  createdAt: string;
  updatedAt: string;
  bio?: string;
  avatar?: string;
  xp?: number;
  currentStreak?: number;
  _count?: {
    solutions?: number;
    submissions?: number;
    candidateAttempts?: number;
  };
  candidateAttempts?: Array<{
    id: string;
    score: number;
    status: string;
    createdAt: string;
  }>;
}

interface AdminUserDetailModalProps {
  user: { id: string };
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function AdminUserDetailModal({
  user,
  isOpen,
  onClose,
  onDeleted,
}: AdminUserDetailModalProps) {
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchUserDetail();
  }, [isOpen]);

  const fetchUserDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${proxy}/api/v1/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUserDetail(response.data.data);
    } catch (err) {
      console.error("Failed to fetch user detail:", err);
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${proxy}/api/v1/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      alert("User deleted successfully");
      onDeleted();
      onClose();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 rounded max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 p-4">
          <h2 className="font-mono text-lg tracking-wider">USER DETAILS</h2>
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
          ) : userDetail ? (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    USERNAME
                  </label>
                  <p className="text-sm font-mono mt-1">{userDetail.username}</p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    EMAIL
                  </label>
                  <p className="text-sm font-mono mt-1">{userDetail.email}</p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    DISPLAY NAME
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {userDetail.displayName || "-"}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    ROLE
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {userDetail.accountRole.toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    XP
                  </label>
                  <p className="text-sm font-mono mt-1 font-bold">
                    {userDetail.xp || 0}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    CURRENT STREAK
                  </label>
                  <p className="text-sm font-mono mt-1">
                    {userDetail.currentStreak || 0} days
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                <h3 className="font-mono text-xs tracking-wider mb-3">
                  ACTIVITY STATS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border border-gray-200 dark:border-neutral-800 rounded">
                    <p className="font-mono text-xs text-gray-600 dark:text-neutral-400">
                      Solutions
                    </p>
                    <p className="font-mono text-lg font-bold mt-1">
                      {userDetail._count?.solutions || 0}
                    </p>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-neutral-800 rounded">
                    <p className="font-mono text-xs text-gray-600 dark:text-neutral-400">
                      Submissions
                    </p>
                    <p className="font-mono text-lg font-bold mt-1">
                      {userDetail._count?.submissions || 0}
                    </p>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-neutral-800 rounded">
                    <p className="font-mono text-xs text-gray-600 dark:text-neutral-400">
                      Assessments
                    </p>
                    <p className="font-mono text-lg font-bold mt-1">
                      {userDetail._count?.candidateAttempts || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      JOINED
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {new Date(userDetail.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                      LAST UPDATED
                    </label>
                    <p className="text-sm font-mono mt-1">
                      {new Date(userDetail.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {userDetail.bio && (
                <div className="border-t border-gray-200 dark:border-neutral-800 pt-4">
                  <label className="font-mono text-xs tracking-wider text-gray-600 dark:text-neutral-400">
                    BIO
                  </label>
                  <p className="text-sm mt-2 text-gray-700 dark:text-neutral-300">
                    {userDetail.bio}
                  </p>
                </div>
              )}
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
            DELETE USER
          </button>
        </div>
      </div>
    </div>
  );
}
