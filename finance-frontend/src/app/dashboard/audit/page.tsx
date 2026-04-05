"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Filter, Search, Terminal, Clock, Fingerprint, Activity, Download } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { useAuthStore } from "@/store/authStore";

interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actor: {
    email: string;
    fullName: string;
  };
  details: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const { user: currentUser } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get("/audit-logs", {
           params: {
             action: actionFilter === "ALL" ? undefined : actionFilter,
           }
        });
        // Backend returns PaginatedResponse: { data: AuditLog[], meta: ... }
        const auditData = res.data?.data || [];
        setLogs(Array.isArray(auditData) ? auditData : []);
      } catch (error) {
        console.error("Chronological synchronization failure:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [actionFilter]);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <ShieldAlert className="w-16 h-16 text-negative/20 mb-4" />
        <h2 className="text-xl font-bold font-sans tracking-tight">Security Breach Attempt Logged</h2>
        <p className="text-text-dim text-sm mt-2 max-w-sm">Access to the immutable audit stream is restricted to root-level administrators. Your metadata has been appended to the queue.</p>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-accent" />
            Audit Persistence
          </h1>
          <p className="text-sm text-text-dim mt-1 font-mono uppercase tracking-widest">Immutable System Event Stream</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-surface border border-sculpted hover:bg-surface-raised text-text-main font-medium py-2 px-4 rounded transition-all text-sm flex items-center gap-2 group">
             <Download className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
             Export Sequence
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 mb-6 bg-surface border border-sculpted p-4 rounded-lg">
        <div className="relative">
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none bg-surface-raised border border-sculpted text-text-main text-xs py-2 pl-4 pr-10 rounded focus:outline-none focus:border-accent font-mono min-w-[200px]"
          >
            <option value="ALL">ALL_SEQUENCES</option>
            <option value="LOGIN">LOGIN_EVENT</option>
            <option value="CREATE_RECORD">RECORD_PROVISION</option>
            <option value="UPDATE_RECORD">RECORD_MODIFICATION</option>
            <option value="DELETE_RECORD">RECORD_PURGE</option>
            <option value="CHANGE_ROLE">RBAC_ALTERATION</option>
          </select>
          <Filter className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
        </div>
        <div className="text-[10px] text-text-dim font-mono uppercase border-l border-sculpted pl-4">
          Status: <span className="text-positive">Synchronized</span> | Node: <span className="text-accent underline">V-99-AUDIT</span>
        </div>
      </div>

      <div className="bg-surface border border-sculpted rounded-lg overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
        
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-surface-raised/30 border-b border-sculpted text-text-dim text-[10px] font-mono uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Timestamp (UTC)</th>
              <th className="px-5 py-3 font-medium">Action Directive</th>
              <th className="px-5 py-3 font-medium">Identity Ref</th>
              <th className="px-5 py-3 font-medium">Event Metadata</th>
              <th className="px-5 py-3 font-medium text-right">Sequence ID</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs divide-y divide-sculpted/30">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : (
              logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-raised/50 transition-colors group">
                    <td className="px-5 py-4 text-text-dim flex items-center gap-2">
                       <Clock className="w-3 h-3" />
                       {new Date(log.createdAt).toISOString().split('T')[0]} {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded border ${
                        log.action.includes('DELETE') || log.action.includes('STATUS') ? 'bg-negative/5 border-negative/20 text-negative' : 
                        log.action.includes('CREATE') || log.action.includes('LOGIN') ? 'bg-positive/5 border-positive/20 text-positive' : 
                        'bg-accent/5 border-accent/20 text-accent'
                      }`}>
                         {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 group-hover:text-text-main transition-colors flex items-center gap-2">
                      <Fingerprint className="w-3 h-3 text-text-dim" />
                      {log.actor?.email || "SYSTEM_AGENT"}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate text-[10px] italic">
                      {log.details || "SYSTEM_DEFAULT_EXECUTION"}
                    </td>
                    <td className="px-5 py-4 text-right text-text-dim/50 group-hover:text-accent transition-colors font-bold">
                       {log.id.split('-')[0]}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="px-5 py-20 text-center text-text-dim italic">
                      <Activity className="w-8 h-8 opacity-20 mx-auto mb-2" />
                      No system events recorded in current synchronization window.
                   </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
