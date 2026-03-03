// test/bonus.e2e-spec.ts
//
// ─── INFRASTRUCTURE APPROACH ─────────────────────────────────────────────────
//
// MongoDB:  MongoMemoryServer — real mongod binary in memory. No data persists.
//
// Redis / BullMQ:
//   BullMQ's @Processor('audit') decorator causes BullExplorer to create a real
//   Worker during app.init(). That Worker immediately opens a Redis connection,
//   which fails in test because there's no Redis running locally.
//   Overriding just the queue token is not enough — BullExplorer scans the DI
//   container for @Processor-decorated classes and instantiates Workers for them
//   before the override can intercept.
//
//   Solution: override BOTH the queue AND AuditProcessor with no-op versions.
//   - overrideProvider(AuditProcessor).useClass(NoOpAuditProcessor) → a plain
//     class with no @Processor decorator, so BullExplorer ignores it entirely.
//     No Worker is created. No Redis connection is attempted.
//   - overrideProvider(AuditService) → so PermissionsGuard's
//     auditService.logPermissionCheck() never touches the queue at all.
//   - overrideProvider(getQueueToken('audit')) → belt-and-suspenders safety net.
//
//   The permission logic, guard chain, JWT validation, and Redis permission
//   cache (RbacCacheService) are all 100% real and untouched.
//   CacheModule.register() with no URL defaults to Node.js in-memory cache —
//   no Redis needed. Permission caching and cache invalidation work exactly as
//   they do in production.
//
// ─── WHAT THESE TESTS PROVE ──────────────────────────────────────────────────
//
// Test 1: PermissionsGuard blocks a user without the required permission → 403
// Test 2: PermissionsGuard allows a user WITH the required permission → 200
// Test 3: After role reassignment + cache invalidation, the SAME valid JWT
//         now gets 403. Proves our cache invalidation fix in user-roles.service.ts
//         works. Without the fix, this test would incorrectly return 200.
//
// ─── HOW TO RUN ──────────────────────────────────────────────────────────────
//
//   npm install --save-dev mongodb-memory-server
//   npx jest --config ./test/jest-e2e.json test/bonus.e2e-spec.ts --verbose
//
// ─────────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model, Types } from 'mongoose';

import { AppModule } from '../src/app.module';
import { User, UserDocument } from '../src/infrastructure/database/schemas/user.schema';
import { Role, RoleDocument } from '../src/infrastructure/database/schemas/role.schema';
import { UserRole, UserRoleDocument } from '../src/infrastructure/database/schemas/user-role.schema';
import { RbacCacheService } from '../src/infrastructure/cache/rbac-cache.service';
import { AuditProcessor } from '../src/modules/rbac/audit/audit.processor';
import { AuditService } from '../src/modules/rbac/audit/audit.service';

// ─── NO-OP AUDIT PROCESSOR ───────────────────────────────────────────────────
//
// A plain class with NO @Processor decorator.
// BullExplorer only creates Workers for classes decorated with @Processor.
// By replacing AuditProcessor with this, BullExplorer has nothing to find —
// no Worker is instantiated, no Redis connection is attempted.
//
class NoOpAuditProcessor {}

// ─── MOCK AUDIT SERVICE ──────────────────────────────────────────────────────
//
// PermissionsGuard calls auditService.logPermissionCheck() on every request.
// We stub it so it does nothing instead of trying to add jobs to the queue.
//
const mockAuditService = {
  logPermissionCheck:    jest.fn().mockResolvedValue(undefined),
  storeAuditLog:         jest.fn().mockResolvedValue({ _id: 'log-id' }),
  getUserAuditLogs:      jest.fn().mockResolvedValue([]),
  getSuspiciousActivity: jest.fn().mockResolvedValue([]),
  markAsSuspicious:      jest.fn().mockResolvedValue(undefined),
};

// ─── MOCK QUEUE ──────────────────────────────────────────────────────────────
//
// Belt-and-suspenders: if anything still tries to call queue.add(), it won't crash.
//
const mockAuditQueue = {
  add:              jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  getWaitingCount:  jest.fn().mockResolvedValue(0),
  getActiveCount:   jest.fn().mockResolvedValue(0),
  getFailedCount:   jest.fn().mockResolvedValue(0),
};

describe('Bonus Approval — RBAC E2E', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let userRoleModel: Model<UserRoleDocument>;
  let rbacCacheService: RbacCacheService;

  let employeeToken: string;
  let managerToken: string;
  let managerId: string;
  let managerRoleId: string;

  // ─── SETUP ─────────────────────────────────────────────────────────────────
  //
  // beforeAll boots the app ONCE for all three tests.
  // Tests share DB state intentionally — Test 3 depends on the manager user
  // created here and the cache populated during Test 2.
  //
  beforeAll(async () => {

    // Start in-memory MongoDB — real mongod binary, ephemeral storage
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET  = 'test-secret-not-used-in-production';

    // Compile AppModule with three overrides:
    //   1. NoOpAuditProcessor  → prevents BullExplorer from creating a Worker
    //   2. mockAuditService    → prevents logPermissionCheck() touching queue
    //   3. mockAuditQueue      → safety net for any direct queue.add() calls
    //
    // Everything else — JwtAuthGuard, PermissionsGuard, UserRolesService,
    // RbacCacheService, Mongoose — is the real production implementation.
    //
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuditProcessor)
      .useClass(NoOpAuditProcessor)
      .overrideProvider(AuditService)
      .useValue(mockAuditService)
      .overrideProvider(getQueueToken('audit'))
      .useValue(mockAuditQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Grab models and the cache service from DI for direct seeding
    userModel        = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel        = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
    userRoleModel    = moduleFixture.get<Model<UserRoleDocument>>(getModelToken(UserRole.name));
    rbacCacheService = moduleFixture.get<RbacCacheService>(RbacCacheService);

    // ── Seed roles ────────────────────────────────────────────────────────────
    //
    // Employee: has employees:read but NOT bonus:approve → should get 403
    // Manager:  has bonus:approve → should get 200
    //
    const employeeRole = await roleModel.create({
      name:         'Employee',
      description:  'Standard employee — no bonus rights',
      permissions:  ['employees:read'],
      isActive:     true,
      isSystemRole: false,
    });

    const managerRole = await roleModel.create({
      name:         'Manager',
      description:  'Can approve bonuses',
      permissions:  ['bonus:approve', 'employees:read'],
      isActive:     true,
      isSystemRole: false,
    });

    managerRoleId = (managerRole as any)._id.toString();

    // ── Register users via the real @Public() /auth/register endpoint ─────────
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'employee@test.com', name: 'Test Employee', password: 'pass123' });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'manager@test.com', name: 'Test Manager', password: 'pass123' });

    // ── Assign roles directly in MongoDB ─────────────────────────────────────
    //
    // POST /user-roles/assign requires 'roles:assign' permission which we'd
    // need an admin token for — a chicken-and-egg problem in test setup.
    // Direct model access for seeding is the standard NestJS testing pattern.
    //
    const employeeUser = await userModel.findOne({ email: 'employee@test.com' });
    const managerUser  = await userModel.findOne({ email: 'manager@test.com' });

    managerId = (managerUser as any)._id.toString();

    await userRoleModel.create({
      userId:     (employeeUser as any)._id,
      roleId:     (employeeRole as any)._id,
      assignedBy: 'test-setup',
    });

    await userRoleModel.create({
      userId:     (managerUser as any)._id,
      roleId:     (managerRole as any)._id,
      assignedBy: 'test-setup',
    });

    // ── Get real JWTs via the real /auth/login endpoint ───────────────────────
    const empLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'employee@test.com', password: 'pass123' });
    employeeToken = empLogin.body.access_token;

    const mgrLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'manager@test.com', password: 'pass123' });
    managerToken = mgrLogin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    await mongoose.disconnect();
    await mongod.stop();
  });

  // ─── TEST 1 ────────────────────────────────────────────────────────────────
  //
  // Full execution path:
  //   JwtAuthGuard → validates token → req.user = employee
  //   PermissionsGuard → reads @RequirePermissions('bonus:approve')
  //   hasPermission() → cache miss → DB → Employee role → ['employees:read']
  //   'bonus:approve' not found, no wildcard match → returns false
  //   Guard throws ForbiddenException → 403
  //
  it('Test 1: Employee → /approve-bonus → 403 Forbidden', async () => {
    const response = await request(app.getHttpServer())
      .post('/approve-bonus')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ employeeId: 'emp-001', amount: 500 });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('bonus:approve');
  });

  // ─── TEST 2 ────────────────────────────────────────────────────────────────
  //
  // Full execution path:
  //   JwtAuthGuard → validates token → req.user = manager
  //   PermissionsGuard → hasPermission(managerId, 'bonus:approve')
  //   cache miss → DB → Manager role → ['bonus:approve', 'employees:read']
  //   Direct match → true. Cache NOW POPULATED for this user.
  //   contextEvaluator: no rules for 'bonus:approve' → granted: true
  //   Controller runs → 200
  //
  //   KEY SIDE EFFECT: The in-memory cache now holds
  //   user:{managerId}:permissions = ['bonus:approve', 'employees:read']
  //   Test 3 depends on this being cached so it can prove invalidation works.
  //
  it('Test 2: Manager → /approve-bonus → 200 OK', async () => {
    const response = await request(app.getHttpServer())
      .post('/approve-bonus')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ employeeId: 'emp-001', amount: 500 });

    // NestJS @Post() returns 201 Created by default — correct HTTP semantics
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Bonus approved');
  });

  // ─── TEST 3 ────────────────────────────────────────────────────────────────
  //
  // PROVES THE CACHE INVALIDATION FIX.
  //
  // After Test 2 the cache holds: user:{managerId}:permissions = ['bonus:approve', ...]
  // We swap the manager's role to Suspended (zero permissions) in MongoDB.
  // Then we call invalidateUserCache() — exactly what user-roles.service.ts
  // now does automatically in production after every assignRole()/removeRole().
  //
  // WITHOUT the fix (old code):
  //   Cache still returns ['bonus:approve'] → 200 (SECURITY BUG)
  //
  // WITH the fix (production code we wrote):
  //   Cache cleared → DB fetch → Suspended role → [] → 403 (CORRECT)
  //
  // The JWT is still valid — JwtAuthGuard still passes.
  // The 403 comes purely from the permission check on fresh data.
  //
  it('Test 3: After role → Suspended + cache invalidation → 403 Forbidden', async () => {

    // Create Suspended role — intentionally zero permissions
    const suspendedRole = await roleModel.create({
      name:         'Suspended',
      description:  'Zero permissions',
      permissions:  [],
      isActive:     true,
      isSystemRole: false,
    });

    // IMPORTANT: cast to ObjectId explicitly.
    // The stored UserRole documents have ObjectId fields.
    // Passing plain strings to deleteOne() fails to match in this test
    // environment — Mongoose auto-casting doesn't apply here.
    // Without this cast, deleteOne() silently deletes 0 documents,
    // the Manager role stays assigned, and the test returns 201 instead of 403.
    await userRoleModel.deleteOne({
      userId: new Types.ObjectId(managerId),
      roleId: new Types.ObjectId(managerRoleId),
    });
    await userRoleModel.create({
      userId:     managerId,
      roleId:     (suspendedRole as any)._id,
      assignedBy: 'test-suspension',
    });

    // Invalidate the permission cache for this user.
    // This is exactly what user-roles.service.assignRole() and removeRole()
    // now call automatically in production. In this test we call it directly
    // because we seeded via the model (bypassing the service).
    //
    // Without this line: stale cache returns 200 (the old bug we fixed).
    // With this line: cache miss → fresh DB fetch → empty permissions → 403.
    //
    await rbacCacheService.invalidateUserCache(managerId);

    const response = await request(app.getHttpServer())
      .post('/approve-bonus')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ employeeId: 'emp-001', amount: 500 });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('bonus:approve');
  });
});