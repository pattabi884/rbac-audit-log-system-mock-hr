"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { employeesApi, leaveApi } from "@/lib/api";

function StatCard({ label, value, sub, color = "blue" }: { label: string; value: any; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${colors[color]}`}>{sub}</span>
      </div>
      <p className="text-3xl font-light text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, permissions, roles, hasPermission } = useAuth();
  const [empStats, setEmpStats] = useState<any>(null);
  const [leaveStats, setLeaveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (hasPermission("employees:read")) {
          const stats = await employeesApi.getStats();
          setEmpStats(stats);
        }
        if (hasPermission("leave:approve")) {
          const lstats = await leaveApi.getStats();
          setLeaveStats(lstats);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [permissions]);

  const primaryRole = roles[0]?.roleId?.name || "Employee";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Good morning, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Role + permissions panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Your Access Level</p>
            <div className="flex items-center gap-2 flex-wrap">
              {roles.map((r: any) => (
                <span key={r._id} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                  {r.roleId?.name || "Unknown"}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">{permissions.length} permissions granted</p>
            <div className="flex flex-wrap gap-1 justify-end max-w-sm">
              {permissions.slice(0, 8).map(p => {
                const action = p.split(":")[1];
                const colors: Record<string, string> = { read: "bg-slate-100 text-slate-600", create: "bg-emerald-50 text-emerald-700", update: "bg-amber-50 text-amber-700", delete: "bg-red-50 text-red-700", approve: "bg-purple-50 text-purple-700" };
                return (
                  <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${colors[action] || "bg-slate-100 text-slate-600"}`}>
                    {p}
                  </span>
                );
              })}
              {permissions.length > 8 && <span className="text-[10px] text-slate-400">+{permissions.length - 8} more</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {(empStats || leaveStats) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {empStats && (
            <>
              <StatCard label="Total Employees" value={empStats.total} sub="Active" color="blue" />
              <StatCard label="Departments" value={empStats.byDepartment?.length || 0} sub="Teams" color="slate" />
            </>
          )}
          {leaveStats && (
            <>
              <StatCard label="Leave Requests" value={leaveStats.total} sub="All time" color="slate" />
              <StatCard label="Pending Approval" value={leaveStats.pending} sub="Needs action" color="amber" />
            </>
          )}
        </div>
      )}

      {/* Department breakdown */}
      {empStats?.byDepartment?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Department Breakdown</h2>
          <div className="space-y-3">
            {empStats.byDepartment.map((d: any) => (
              <div key={d._id} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-600 truncate">{d._id}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${(d.count / empStats.total) * 100}%` }} />
                </div>
                <div className="text-xs text-slate-500 w-8 text-right">{d.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No elevated permissions view */}
      {!hasPermission("employees:read") && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-1">Employee View</h3>
          <p className="text-sm text-slate-500">
            Use the sidebar to manage your leave requests and view your payroll.
          </p>
        </div>
      )}
    </div>
  );
}