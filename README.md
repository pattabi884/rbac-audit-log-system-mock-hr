# RBAC Audit Log System — Mock HR Platform

A production-grade Role-Based Access Control engine with a fully integrated HR management system built to demonstrate real-world microservice architecture, dynamic permission enforcement, and audit logging.

---

## Live Demo

| Service | URL |
|---------|-----|
| HR App (Employee Portal) | https://rbac-audit-log-system-mock-hr.vercel.app |
| RBAC Service (API) | https://rbac-audit-log-system-mock-hr-production.up.railway.app/api |
| HR Service (API) | https://splendid-presence-production-b6e0.up.railway.app/api |

### Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| HR Admin | hradmin@test.com | hr123 | Full system — all employees, leave approval, payroll, add/remove staff |
| HR Manager | manager@test.com | mgr123 | View employees, approve/reject leave requests |
| Employee | employee@test.com | emp123 | Own profile, own leave requests, own payroll only |

> Login as each user and observe how the UI changes in real time based on RBAC permissions — no page reload, no code change needed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        hr-app (Next.js)                     │
│                   Vercel — localhost:3001                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ JWT + permission-gated UI
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────┐       ┌──────────────────────┐
│   rbac-service   │       │     hr-service        │
│   NestJS :3010   │◄──────│     NestJS :3011      │
│                  │ token │                       │
│  JWT Auth        │ valid │  Employees            │
│  Roles           │ + perm│  Leave Requests       │
│  Permissions     │ check │  Payroll              │
│  Audit Logs      │       │                       │
│  Redis Cache     │       └──────────────────────┘
│  BullMQ Queue    │
└──────────────────┘
        │                │
        ▼                ▼
   MongoDB Atlas    Upstash Redis
```

**Key design decision**: `hr-service` has zero JWT logic. It delegates all token validation and permission checks to `rbac-service` via HTTP. This means changing a user's role in the RBAC system takes effect immediately across all services — no redeploy needed.

---

## Tech Stack

**rbac-service**
- NestJS with TypeScript
- MongoDB + Mongoose (user, role, permission, audit schemas)
- Redis + BullMQ (async audit logging queue)
- JWT + Passport (authentication)
- Custom permission guard with context evaluation (business hours, IP, MFA rules)
- Suspicious activity detection service

**hr-service**
- NestJS with TypeScript
- MongoDB + Mongoose (employee, leave, payroll schemas)
- Delegates all auth to rbac-service — no JWT secret needed
- Permission guard that calls rbac-service on every protected route

**hr-app**
- Next.js 15 with App Router
- React Context for auth state + permission-based UI rendering
- Tailwind CSS — clean neutral design
- Sonner for toast notifications
- Cookie-based token storage with js-cookie

**Infrastructure**
- MongoDB Atlas (shared cluster, separate databases per service)
- Upstash Redis (TLS, free tier)
- Railway (NestJS backends, auto-deploy on push)
- Vercel (Next.js frontend, auto-deploy on push)

---

## Features

### RBAC Engine (rbac-service)
- Register and login with JWT tokens
- Create roles with arbitrary permission sets
- Assign multiple roles to users
- Dynamic permission evaluation — no hardcoded checks
- Context-aware rules engine (business hours, session age, IP whitelist, MFA requirement)
- Every permission check logged asynchronously via BullMQ
- Suspicious activity detection on audit logs
- Redis caching for permission lookups (5 min TTL, invalidated on role change)

### HR System (hr-service)
- Employee directory with department filtering
- Leave request submission and approval workflow
- Payroll records per employee
- All routes protected by permission guard delegating to rbac-service
- `GET /employees/me` — context-aware own-profile endpoint (no permission needed)
- `GET /payroll/my-payroll` — any authenticated user can view own payroll

### HR Portal (hr-app)
- Login with any registered user
- Sidebar and page content adapts based on live permission data
- HR Admin sees Add Employee button, deactivate controls, all leave requests, all payroll
- HR Manager sees employee list, can approve/reject leave — no payroll
- Employee sees directory, own leave history, own payroll only
- Permission badges in sidebar showing exact access level

---

## Project Structure

```
rbac-audit-log-system/
├── rbac-service/                  # Auth + RBAC engine
│   ├── src/
│   │   ├── infrastructure/
│   │   │   ├── cache/             # Redis cache service
│   │   │   ├── database/schemas/  # User, Role, Permission, AuditLog
│   │   │   └── queues/            # BullMQ audit queue
│   │   └── modules/
│   │       ├── auth/              # JWT, guards, strategies
│   │       └── rbac/
│   │           ├── audit/         # Audit processor + suspicious activity
│   │           ├── context/       # Context evaluator + attribute rules
│   │           ├── permissions/   # Permission CRUD + seed
│   │           ├── roles/         # Role CRUD
│   │           └── user-roles/    # Role assignment + permission lookup
│
├── hr-service/                    # HR business logic
│   └── src/
│       ├── common/guards/         # JWT + permission guards (delegates to rbac-service)
│       └── modules/
│           ├── employees/         # Employee CRUD
│           ├── leave/             # Leave requests + approval
│           └── payroll/           # Payroll records
│
└── hr-app/                        # Employee portal frontend
    └── src/
        ├── app/
        │   ├── (auth)/login/      # Login page
        │   └── (app)/             # Protected dashboard routes
        │       ├── dashboard/     # Stats + department breakdown
        │       ├── employees/     # Employee table + detail panel
        │       ├── leave/         # Leave management
        │       └── payroll/       # Payroll history
        ├── context/               # Auth context with permissions
        └── lib/                   # API client + cookie auth
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- MongoDB running on localhost:27017
- Redis running on localhost:6379

### rbac-service
```bash
cd rbac-service
cp .env.example .env
# fill in .env values
npm install
npm run start:dev
# runs on http://localhost:3010/api
```

### hr-service
```bash
cd hr-service
cp .env.example .env
# fill in .env values
npm install
npm run start:dev
# runs on http://localhost:3011/api
```

### hr-app
```bash
cd hr-app
# create .env with:
# NEXT_PUBLIC_RBAC_URL=http://localhost:3010/api
# NEXT_PUBLIC_HR_URL=http://localhost:3011/api
npm install
npm run dev -- -p 3001
# runs on http://localhost:3001
```

### Seed data
```bash
# After rbac-service is running:
curl -X POST http://localhost:3010/api/permissions/seed

# Then create roles + users via Postman or the guide in /docs
```

---

## API Reference

### rbac-service (port 3010)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register user |
| POST | /api/auth/login | Public | Login, returns JWT |
| GET | /api/auth/me | JWT | Get current user |
| POST | /api/auth/check-permission | JWT | Check if user has permission |
| GET | /api/roles | roles:read | List all roles |
| POST | /api/roles | roles:create | Create role |
| POST | /api/user-roles/assign | roles:assign | Assign role to user |
| GET | /api/user-roles/user/:id/permissions | JWT | Get user permissions |
| POST | /api/permissions/seed | Public (dev only) | Seed all permissions |

### hr-service (port 3011)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/employees | employees:read | List employees |
| POST | /api/employees | employees:create | Create employee |
| GET | /api/employees/me | Any | Own profile |
| PATCH | /api/employees/:id | employees:update | Update employee |
| DELETE | /api/employees/:id | employees:delete | Deactivate employee |
| GET | /api/leave | leave:read | All leave requests |
| POST | /api/leave | Any | Submit leave request |
| GET | /api/leave/my-requests | Any | Own requests |
| PATCH | /api/leave/:id/approve | leave:approve | Approve request |
| PATCH | /api/leave/:id/reject | leave:approve | Reject request |
| GET | /api/payroll | payroll:read | All payroll |
| GET | /api/payroll/my-payroll | Any | Own payroll |

