"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, ArrowDownRight, IndianRupee, Wallet, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/Skeleton";
import { RecordModal } from "@/components/RecordModal";

interface DashboardSummary {
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
  recordCount: number;
}

interface Transaction {
  id: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  description: string | null;
}

interface TrendData {
  month: string;
  income: string;
  expense: string;
  net: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, activityRes, trendRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/recent-activity"),
        api.get("/dashboard/monthly-trend")
      ]);

      setSummary(summaryRes.data || null);
      setTransactions(Array.isArray(activityRes.data) ? activityRes.data : []);
      setTrends(Array.isArray(trendRes.data) ? trendRes.data : []);
    } catch (error) {
      console.error("Failed to synchronize with ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(val));
  };

  const summaryCards = [
    { 
      title: "Net Balance", 
      value: summary ? formatCurrency(summary.netBalance) : "₹0.00", 
      change: "+2.4%", 
      isPositive: true, 
      icon: Wallet 
    },
    { 
      title: "Total Income", 
      value: summary ? formatCurrency(summary.totalIncome) : "₹0.00", 
      change: "+12.5%", 
      isPositive: true, 
      icon: ArrowUpRight 
    },
    { 
      title: "Total Expenses", 
      value: summary ? formatCurrency(summary.totalExpenses) : "₹0.00", 
      change: "-4.1%", 
      isPositive: false, 
      icon: ArrowDownRight 
    },
    { 
      title: "Total Records", 
      value: summary ? summary.recordCount.toLocaleString() : "0", 
      change: "Active", 
      isPositive: true, 
      icon: Activity 
    },
  ];

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Institutional Ledger</h1>
          <p className="text-sm text-text-dim mt-1 font-mono uppercase tracking-widest">Global Aggregation View</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-accent-gradient hover:shadow-neon text-white font-medium py-2 px-4 rounded transition-all text-sm flex items-center gap-2 group"
        >
          <IndianRupee className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Deposit Funds
        </button>
      </header>

      <RecordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchDashboardData}
        presetType="INCOME"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))
        ) : (
          summaryCards.map((card, idx) => (
            <div key={idx} className="bg-surface border border-sculpted p-5 rounded-lg relative overflow-hidden flex flex-col justify-between h-36">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">{card.title}</span>
                <div className="p-1.5 bg-surface-raised border border-sculpted rounded text-text-dim">
                  <card.icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-semibold mt-4 text-text-main tracking-tight truncate">{card.value}</div>
                <div className={`text-xs font-mono mt-1 ${card.isPositive ? 'text-positive' : 'text-negative'} flex items-center gap-1`}>
                  {card.change} <span className="text-text-dim">vs last period</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-surface border border-sculpted p-6 rounded-lg relative overflow-hidden mt-8">
        <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wider mb-6">Velocity / Monthly Trend</h2>
        <div className="h-48 flex items-end justify-between space-x-2 relative">
          <div className="absolute inset-0 flex items-end justify-between z-0 border-b border-sculpted/50 pb-6 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute w-full border-t border-sculpted/20" style={{ bottom: `${(i * 20)}%` }}></div>
            ))}
          </div>
          
          {loading ? (
            <div className="flex items-end justify-between w-full h-full pb-6 gap-2">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="w-full" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            trends.length > 0 ? (() => {
              const maxTotal = Math.max(...trends.map(t => Number(t.income) + Number(t.expense)), 1);
              return trends.map((item, i) => {
                const total = Number(item.income) + Number(item.expense);
                const height = Math.max((total / maxTotal) * 100, 5); // Min 5% height for visibility
                return (
                  <div key={i} className="relative z-10 w-full flex flex-col justify-end group h-full pb-6">
                    <div 
                      className="w-full bg-accent/20 border-t-2 border-accent transition-all group-hover:bg-accent/40 rounded-t-sm" 
                      style={{ height: `${height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-sculpted p-1 text-[10px] rounded whitespace-nowrap z-20">
                        {formatCurrency(total)}
                      </div>
                    </div>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-mono text-text-dim mt-2 uppercase">
                      {(() => {
                        const month = item.month.split('-')[1];
                        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                        return months[parseInt(month) - 1] || month;
                      })()}
                    </span>
                  </div>
                );
              });
            })() : (
              <div className="w-full h-full flex items-center justify-center text-text-dim text-xs font-mono italic">
                No temporal data available in block
              </div>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pb-12">
        <div className="lg:col-span-3 bg-surface border border-sculpted rounded-lg overflow-hidden">
          <div className="p-5 border-b border-sculpted bg-surface flex justify-between items-center">
            <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wider">Live Ledger Persistence</h2>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-raised/50 border-b border-sculpted text-text-dim text-xs font-mono uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Tx Ref</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : (
                transactions.length > 0 ? (
                  transactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id} className="border-b border-sculpted/50 hover:bg-surface-raised transition-colors group">
                      <td className="px-5 py-4 text-text-dim group-hover:text-text-main transition-colors text-xs">{tx.id.split('-')[0]}</td>
                      <td className="px-5 py-4 font-sans text-text-main">{tx.description || "Uncategorized Transaction"}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-surface border border-sculpted text-[10px] rounded uppercase tracking-wider text-text-dim">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-dim text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className={`px-5 py-4 text-right ${tx.type === 'INCOME' ? 'text-positive' : 'text-text-main'}`}>
                        {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-text-dim italic text-xs">
                      No recent activities recorded in the ledger.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
