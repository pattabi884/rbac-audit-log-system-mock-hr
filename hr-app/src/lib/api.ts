import { getToken } from "./auth";

const RBAC = process.env.NEXT_PUBLIC_RBAC_URL || "http://localhost:3010/api";
const HR = process.env.NEXT_PUBLIC_HR_URL || "http://localhost:3011/api";

async function req<T>(base: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || "Request failed");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// RBAC service calls
export const rbacApi = {
  login: (email: string, password: string) =>
    req<any>(RBAC, "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req<any>(RBAC, "/auth/me"),
  myPermissions: (userId: string) => req<string[]>(RBAC, `/user-roles/user/${userId}/permissions`),
  myRoles: (userId: string) => req<any[]>(RBAC, `/user-roles/user/${userId}/roles`),
};

// HR service calls
export const employeesApi = {
  getAll: (department?: string) =>
    req<any[]>(HR, `/employees${department ? `?department=${department}` : ""}`),
  getOne: (id: string) => req<any>(HR, `/employees/${id}`),
  getMe: () => req<any>(HR, "/employees/me"),
  getStats: () => req<any>(HR, "/employees/stats"),
  getDepartments: () => req<string[]>(HR, "/employees/departments"),
  create: (data: any) => req<any>(HR, "/employees", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => req<any>(HR, `/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deactivate: (id: string) => req<any>(HR, `/employees/${id}`, { method: "DELETE" }),
};

export const leaveApi = {
  getAll: (params?: { status?: string; department?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return req<any[]>(HR, `/leave${q ? `?${q}` : ""}`);
  },
  myRequests: () => req<any[]>(HR, "/leave/my-requests"),
  getStats: () => req<any>(HR, "/leave/stats"),
  create: (data: any) => req<any>(HR, "/leave", { method: "POST", body: JSON.stringify(data) }),
  approve: (id: string) => req<any>(HR, `/leave/${id}/approve`, { method: "PATCH" }),
  reject: (id: string, reason: string) =>
    req<any>(HR, `/leave/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
};

export const payrollApi = {
  myPayroll: () => req<any[]>(HR, "/payroll/my-payroll"),
  getAll: () => req<any[]>(HR, "/payroll"),
  byEmployee: (employeeId: string) => req<any[]>(HR, `/payroll/employee/${employeeId}`),
};