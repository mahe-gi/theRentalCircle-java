"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ArrowLeft, Loader2, Shield, UserX, UserCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { listAdminUsers, suspendUser, restoreUser } from "@/lib/connections-api";
import type { AdminUserResponse } from "@/types/property";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = () => {
    setLoading(true);
    listAdminUsers(0, 50)
      .then((res) => setUsers(res.content || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSuspend = async (userId: number) => {
    if (!confirm("Are you sure you want to suspend this user?")) return;
    setActionLoading(userId);
    try {
      await suspendUser(userId);
      loadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (userId: number) => {
    setActionLoading(userId);
    try {
      await restoreUser(userId);
      loadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-charcoal">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-charcoal-light hover:text-forest transition font-medium mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-forest-light text-forest">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal">
                User Management
              </h1>
              <p className="text-xs text-charcoal-light">
                Monitor platform users, tenants, and landlords. Suspend accounts for policy violations.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-charcoal-light">
            <Loader2 className="w-8 h-8 animate-spin text-forest" />
            <span className="text-xs">Loading user directory...</span>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E4DD] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand/60 border-b border-[#E8E4DD] text-charcoal-light uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Mobile</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Roles</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-sand/30 transition">
                    <td className="p-3.5 font-bold text-charcoal">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-3.5 text-charcoal">{u.email}</td>
                    <td className="p-3.5 text-charcoal-light">{u.mobile || "—"}</td>
                    <td className="p-3.5 font-medium">{u.userType}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map((r) => (
                          <span
                            key={r}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r === "ROLE_ADMIN"
                                ? "bg-rose-100 text-rose-800"
                                : r === "ROLE_OWNER"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {r.replace("ROLE_", "")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {u.active ? "ACTIVE" : "SUSPENDED"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {u.active ? (
                        <button
                          type="button"
                          onClick={() => handleSuspend(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 text-[11px] font-semibold hover:bg-rose-100 transition inline-flex items-center gap-1"
                        >
                          <UserX className="w-3 h-3" />
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestore(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 text-[11px] font-semibold hover:bg-emerald-100 transition inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
