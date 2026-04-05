"use client";

import { useState } from "react";
import { X, IndianRupee, Calendar, Tag, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presetType?: 'INCOME' | 'EXPENSE';
}

export function RecordModal({ isOpen, onClose, onSuccess, presetType }: RecordModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: presetType || "INCOME",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/records", {
        ...formData,
        amount: Number(formData.amount),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Provisioning failure:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-sculpted w-full max-w-md rounded-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-accent-gradient"></div>
        
        <div className="p-6 border-b border-sculpted flex justify-between items-center">
          <h2 className="text-lg font-bold font-sans tracking-tight">Ledger Entry Provision</h2>
          <button onClick={onClose} className="text-text-dim hover:text-text-main transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Monetary Amount (INR)</label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input 
                required
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
                className="w-full bg-surface-raised border border-sculpted text-text-main text-sm py-2.5 pl-10 pr-4 rounded focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Entry Classification</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                className="w-full bg-surface-raised border border-sculpted text-text-main text-sm py-2.5 px-3 rounded focus:outline-none focus:border-accent font-sans"
              >
                <option value="INCOME">INCOME (CREDIT)</option>
                <option value="EXPENSE">EXPENSE (DEBIT)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Effective Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-surface-raised border border-sculpted text-text-main text-xs py-2.5 pl-9 pr-3 rounded focus:outline-none focus:border-accent font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Allocation Category</label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input 
                required
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="e.g. Infrastructure, SaaS, Dividend"
                className="w-full bg-surface-raised border border-sculpted text-text-main text-sm py-2.5 pl-10 pr-4 rounded focus:outline-none focus:border-accent font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Transaction Narrative</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-text-dim" />
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Optional metadata regarding the allocation..."
                className="w-full bg-surface-raised border border-sculpted text-text-main text-sm py-2.5 pl-10 pr-4 rounded focus:outline-none focus:border-accent font-sans h-24 resize-none"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-raised border border-sculpted text-text-dim hover:text-text-main py-3 rounded text-sm transition-all font-medium"
            >
              Abort
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] bg-accent-gradient hover:shadow-neon text-white py-3 rounded text-sm transition-all font-bold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit to Sequence"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
