// src/modules/bonus/bonus.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { RequirePermissions } from '@modules/auth/decorators/require-permissions.decorator';

// ─── WHY THIS CONTROLLER EXISTS ─────────────────────────────────────────────
//
// /approve-bonus is a protected business action.
// It exists as its own controller (not crammed into another controller)
// because it represents a distinct bounded context — bonus operations.
//
// In a larger system this would be a full BonusModule with its own service,
// schema, and business logic. For the scope of this project it's a single
// endpoint that proves the RBAC system enforces permissions correctly.
//
// ─── HOW THE GUARD CHAIN WORKS FOR THIS ENDPOINT ────────────────────────────
//
// When POST /approve-bonus is called:
//
//   Step 1 — JwtAuthGuard (global APP_GUARD, runs first):
//     - Extracts the Bearer token from Authorization header
//     - Calls jwtService.verify(token) using JWT_SECRET
//     - Calls JwtStrategy.validate(payload) which queries MongoDB for the user
//       and checks user.isActive
//     - If token is invalid or user is deactivated → 401 Unauthorized
//     - If valid → attaches { userId, email, name, isActive } to req.user
//
//   Step 2 — PermissionsGuard (global APP_GUARD, runs second):
//     - Reads @RequirePermissions('bonus:approve') metadata via Reflector
//     - Calls userRolesService.hasPermission(req.user.userId, 'bonus:approve')
//     - hasPermission() checks Redis cache first, falls back to MongoDB
//     - Checks direct match, resource wildcard ('bonus:*'), super admin ('*:*')
//     - If not found → throws ForbiddenException → 403
//     - If found → calls contextEvaluator.evaluatePermission('bonus:approve', ctx)
//     - PERMISSION_RULES['bonus:approve'] is undefined → no attribute rules →
//       context evaluator returns { granted: true } immediately
//     - Guard returns true → request reaches the controller method
//
//   Step 3 — Controller method runs → returns { message, employeeId, amount }
//
// ─────────────────────────────────────────────────────────────────────────────

@Controller('approve-bonus')
export class BonusController {

  // POST /approve-bonus
  //
  // Body: { employeeId: string, amount: number }
  //
  @Post()
  @RequirePermissions('bonus:approve')
  approveBonus(
    @Body() body: { employeeId: string; amount: number },
  ) {
    return {
      message:    'Bonus approved',
      employeeId: body.employeeId,
      amount:     body.amount,
    };
  }
}