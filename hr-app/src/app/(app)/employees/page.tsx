"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { employeesApi } from "@/lib/api";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-red-50 text-red-700",
    "on-leave": "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function EmployeesPage() {
  const { hasPermission } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", department: "", position: "", employeeId: "", phone: "", location: "" });

  async function load() {
    try {
      const [e, d] = await Promise.all([employeesApi.getAll(), employeesApi.getDepartments()]);
      setEmployees(e);
      setDepartments(d);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    try {
      await employeesApi.create(form);
      toast.success("Employee created");
      setShowCreate(false);
      setForm({ firstName: "", lastName: "", email: "", department: "", position: "", employeeId: "", phone: "", location: "" });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDeactivate(id: string) {
    try {
      await employeesApi.deactivate(id);
      toast.success("Employee deactivated");
      setSelected(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  const filtered = employees.filter(e =>
    !filter || e.department === filter
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">{employees.length} total employees</p>
        </div>
        <div className="flex gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
            <option value="">All departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {hasPermission("employees:create") && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Employee</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { key: "firstName", label: "First Name", placeholder: "John" },
              { key: "lastName", label: "Last Name", placeholder: "Smith" },
              { key: "email", label: "Email", placeholder: "john@company.com" },
              { key: "employeeId", label: "Employee ID", placeholder: "EMP001" },
              { key: "department", label: "Department", placeholder: "Engineering" },
              { key: "position", label: "Position", placeholder: "Senior Engineer" },
              { key: "phone", label: "Phone", placeholder: "+1 555 0000" },
              { key: "location", label: "Location", placeholder: "New York" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Employee</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Department</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Position</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Location</th>
              <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(emp => (
              <tr key={emp._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-700">
                        {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-slate-500">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{emp.department}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{emp.position}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{emp.location || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={emp.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(emp)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">No employees found</div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 p-6 overflow-auto shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-900">Employee Detail</h2>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-semibold text-blue-700">
                {selected.firstName?.charAt(0)}{selected.lastName?.charAt(0)}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900">{selected.firstName} {selected.lastName}</h3>
            <p className="text-sm text-slate-500">{selected.position}</p>
            <div className="mt-2"><StatusBadge status={selected.status} /></div>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { label: "Employee ID", value: selected.employeeId },
              { label: "Email", value: selected.email },
              { label: "Department", value: selected.department },
              { label: "Phone", value: selected.phone || "—" },
              { label: "Location", value: selected.location || "—" },
              { label: "Employment", value: selected.employmentType },
              { label: "Start Date", value: selected.startDate ? new Date(selected.startDate).toLocaleDateString() : "—" },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-xs font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>

          {hasPermission("employees:delete") && selected.status !== "inactive" && (
            <button onClick={() => handleDeactivate(selected._id)}
              className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Deactivate Employee
            </button>
          )}
        </div>
      )}
    </div>
  );
}