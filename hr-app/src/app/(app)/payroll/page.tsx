"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { payrollApi } from "@/lib/api";
import { toast } from "sonner";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    processed: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status]}`}>{status}</span>;
}

export default function PayrollPage() {
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = hasPermission("payroll:read")
          ? await payrollApi.getAll()
          : await payrollApi.myPayroll();
        setRecords(data);
      } catch (err: any) { toast.error(err.message); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalNet = records.reduce((sum, r) => sum + r.netSalary, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Payroll</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {hasPermission("payroll:read") ? "All payroll records" : "Your payroll history"}
        </p>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Total Records</p>
            <p className="text-3xl font-light text-slate-900">{records.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Total Net</p>
            <p className="text-3xl font-light text-slate-900">${totalNet.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Latest Month</p>
            <p className="text-3xl font-light text-slate-900">
              {records[0] ? MONTHS[records[0].month - 1] : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Period</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Basic Salary</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Bonus</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Deductions</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Net Salary</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map(record => (
              <tr key={record._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {MONTHS[record.month - 1]} {record.year}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">${record.basicSalary.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-emerald-600">+${record.bonus.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-500">-${record.deductions.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">${record.netSalary.toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">No payroll records found</div>
        )}
      </div>
    </div>
  );
}