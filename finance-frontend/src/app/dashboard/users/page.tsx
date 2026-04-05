"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, Shield, Mail, Calendar, MoreVertical, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { useAuthStore } from "@/store/authStore";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (currentUser?.role !== 'ADMIN') return;
      
      try {
        const res = await api.get("/users");
        const userData = res.data?.data || [];
        setUsers(Array.isArray(userData) ? userData : []);
      } catch (error) {
        console.error("User list synchronization failed:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [currentUser]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}/status`, { status: currentStatus ? 'INACTIVE' : 'ACTIVE' });
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (error) {
      console.error("Role update failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Shield className="w-16 h-16 text-negative/20 mb-4" />
        <h2 className="text-xl font-bold font-sans">Access Revoked</h2>
        <p className="text-text-dim text-sm mt-2 max-w-sm">This terminal is restricted to ADMIN level clearance. Your current identity has been logged.</p>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Access Control (RBAC)</h1>
          <p className="text-sm text-text-dim mt-1 font-mono uppercase tracking-widest">User Identity Management</p>
        </div>
        <button className="bg-accent-gradient hover:shadow-neon text-white font-medium py-2 px-4 rounded transition-all text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Provision New Identity
        </button>
      </header>

      <div className="bg-surface border border-sculpted rounded-lg overflow-hidden shadow-2xl relative">
        {/* Aesthetic top gradient line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-accent/30"></div>
        
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-surface-raised/50 border-b border-sculpted text-text-dim text-xs font-mono uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">Identity / Name</th>
              <th className="px-6 py-4 font-medium">Assigned Role</th>
              <th className="px-6 py-4 font-medium">Stability Status</th>
              <th className="px-6 py-4 font-medium">Created At</th>
              <th className="px-6 py-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sculpted/50 font-sans text-sm">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                </tr>
              ))
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-raised/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-raised border border-sculpted flex items-center justify-center text-accent font-bold text-xs">
                        {u.fullName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-main">{u.fullName} {u.id === currentUser.id && "(You)"}</span>
                        <span className="text-[10px] text-text-dim font-mono flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> {u.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block group/select">
                      <select 
                        disabled={u.id === currentUser.id || actionLoading === u.id}
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="appearance-none bg-surface-raised border border-sculpted text-text-main text-[11px] font-mono py-1 pl-3 pr-8 rounded focus:outline-none focus:border-accent disabled:opacity-50 cursor-pointer"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                      <Shield className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      disabled={u.id === currentUser.id || actionLoading === u.id}
                      onClick={() => handleToggleStatus(u.id, u.isActive)}
                      className={`flex items-center gap-2 px-3 py-1 rounded text-[11px] font-mono border transition-all ${
                        u.isActive 
                        ? 'bg-positive/10 border-positive/30 text-positive shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                        : 'bg-negative/10 border-negative/30 text-negative'
                      } disabled:opacity-50`}
                    >
                      {u.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          STABLE
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          DEACTIVATED
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-text-dim font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      disabled={u.id === currentUser.id}
                      className="p-1.5 text-text-dim hover:text-accent transition-colors disabled:opacity-30"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
