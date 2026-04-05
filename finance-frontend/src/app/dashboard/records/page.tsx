"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, MoreHorizontal, Loader2, Trash2, Edit2 } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { RecordModal } from "@/components/RecordModal";

interface Record {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  description: string | null;
  createdById: string;
}

export default function RecordsPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<Record[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, categoriesRes] = await Promise.all([
        api.get("/records", {
          params: {
            search: search || undefined,
            type: typeFilter === "ALL" ? undefined : typeFilter.toUpperCase(),
            category: categoryFilter === "ALL" ? undefined : categoryFilter,
          }
        }),
        api.get("/records/categories")
      ]);
      const recordsData = recordsRes.data?.data || [];
      setRecords(Array.isArray(recordsData) ? recordsData : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (error) {
      console.error("Ledger synchronization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [search, typeFilter, categoryFilter]);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(val));
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/records/export", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `zorvyn-ledger-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failure:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to purge this record from the immutable ledger?")) return;
    try {
      await api.delete(`/records/${id}`);
      fetchData();
    } catch (error) {
      console.error("Deletion failure:", error);
    }
  };

  const canWrite = user?.role === 'ADMIN' || user?.role === 'ANALYST';

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Ledger Records</h1>
          <p className="text-sm text-text-dim mt-1 font-mono uppercase tracking-widest">High-Density Transaction View</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="bg-surface border border-sculpted hover:bg-surface-raised text-text-main font-medium py-2 px-4 rounded transition-all text-sm flex items-center gap-2 group"
          >
            <Download className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
            Export CSV
          </button>
          
          {canWrite && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-accent-gradient hover:shadow-neon text-white font-medium py-2 px-4 rounded transition-all text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          )}
        </div>
      </header>

      <RecordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchData}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-surface border border-sculpted p-4 rounded-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions or amount tokens..."
            className="w-full bg-surface-raised border border-sculpted text-text-main text-sm py-2 pl-10 pr-4 rounded focus:outline-none focus:border-accent transition-all font-mono placeholder:text-text-dim/50"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-surface-raised border border-sculpted text-text-main text-sm py-2 pl-4 pr-10 rounded focus:outline-none focus:border-accent font-sans min-w-[140px]"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <Filter className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>
          <div className="relative">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-surface-raised border border-sculpted text-text-main text-sm py-2 pl-4 pr-10 rounded focus:outline-none focus:border-accent font-sans min-w-[160px]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-sculpted rounded-lg overflow-hidden shadow-xl">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-surface-raised/50 border-b border-sculpted text-text-dim text-xs font-mono uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Tx Ref</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium text-right">Amount</th>
              <th className="px-5 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-5 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : (
              records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec.id} className="border-b border-sculpted/50 hover:bg-surface-raised transition-colors group">
                    <td className="px-5 py-3 text-text-dim group-hover:text-text-main transition-colors text-xs">{rec.id.split('-')[0]}</td>
                    <td className="px-5 py-3 text-text-dim">{new Date(rec.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 font-sans text-text-main">{rec.description || "Uncategorized Ledger Item"}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-surface border border-sculpted text-[10px] rounded uppercase tracking-wider text-text-dim">{rec.category}</span>
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${rec.type === 'INCOME' ? 'text-positive' : 'text-text-main'}`}>
                      {rec.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(rec.amount)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(user?.role === 'ADMIN' || rec.createdById === user?.id) && (
                          <>
                            <button className="text-text-dim hover:text-accent transition-colors p-1" title="Edit Entry">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(rec.id)}
                              className="text-text-dim hover:text-negative transition-colors p-1" 
                              title="Purge Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {! (user?.role === 'ADMIN' || rec.createdById === user?.id) && (
                          <div className="text-[10px] text-text-dim italic">Read-only</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-20 text-center text-text-dim italic">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <span>No transactions found matching the security parameters.</span>
                    </div>
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
