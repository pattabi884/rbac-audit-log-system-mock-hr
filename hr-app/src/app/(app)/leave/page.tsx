"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { leaveApi, employeesApi } from "@/lib/api";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status]}`}>{status}</span>;
}

export default function LeavePage() {
  const { hasPermission, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"all" | "mine">("mine");
  const [form, setForm] = useState({
    employeeId: "", employeeName: "", department: "",
    leaveType: "annual", startDate: "", endDate: "", totalDays: 1, reason: "",
  });

  async function load() {
    try {
      const mine = await leaveApi.myRequests();
      setMyRequests(mine);
      if (hasPermission("leave:read")) {
        const [all, emps] = await Promise.all([leaveApi.getAll(), employeesApi.getAll()]);
        setRequests(all);
        setEmployees(emps);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    try {
      await leaveApi.create(form);
      toast.success("Leave request submitted");
      setShowCreate(false);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleApprove(id: string) {
    try {
      await leaveApi.approve(id);
      toast.success("Request approved");
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await leaveApi.reject(id, reason);
      toast.success("Request rejected");
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  const displayList = tab === "mine" ? myRequests : requests;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage time off requests</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          Request Leave
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Leave Request</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Employee Name</label>
              <input value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })}
                placeholder="Your name"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                placeholder="Your department"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Employee ID</label>
              <input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}
                placeholder="EMP001"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Leave Type</label>
              <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {["annual", "sick", "personal", "maternity", "paternity"].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Total Days</label>
              <input type="number" value={form.totalDays} onChange={e => setForm({ ...form, totalDays: parseInt(e.target.value) })}
                min={1}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-slate-600">Reason</label>
              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Brief reason for leave..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Submit</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {hasPermission("leave:read") && (
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("mine")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            My Requests
          </button>
          <button onClick={() => setTab("all")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            All Requests
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Employee</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Dates</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Days</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
              {hasPermission("leave:approve") && tab === "all" && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayList.map(req => (
              <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{req.employeeName}</p>
                  <p className="text-xs text-slate-500">{req.department}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700 capitalize">{req.leaveType}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{req.totalDays}d</td>
                <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                {hasPermission("leave:approve") && tab === "all" && (
                  <td className="px-4 py-3 text-right">
                    {req.status === "pending" && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleApprove(req._id)}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-900">Approve</button>
                        <button onClick={() => handleReject(req._id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800">Reject</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {displayList.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">No leave requests found</div>
        )}
      </div>
    </div>
  );
}