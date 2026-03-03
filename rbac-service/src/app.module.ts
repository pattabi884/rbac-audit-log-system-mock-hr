// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure
import { QueueModule } from '@infrastructure/queues/queue.module';

// Feature modules
import { RbacModule } from '@modules/rbac/rbac.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { BonusModule } from '@modules/bonus/bonus.module'; // NEW

// Global guards
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

// ─── WHY APP_GUARD IS THE RIGHT PATTERN ──────────────────────────────────────
//
// JwtAuthGuard and PermissionsGuard are registered as global APP_GUARDs here
// rather than applied with @UseGuards() on individual controllers.
//
// WHY:
//   If you put @UseGuards(PermissionsGuard) on a controller inside RbacModule,
//   NestJS tries to instantiate PermissionsGuard inside that module's context.
//   But PermissionsGuard depends on UserRolesService, AuditService, and
//   ContextEvaluatorService — none of which are available inside RolesModule.
//   You'd get a "Nest can't resolve dependencies" error.
//
//   By registering them here at AppModule level, NestJS instantiates the guards
//   once in AppModule's context, where RbacModule IS imported and all those
//   services ARE available.
//
// RESULT:
//   Every route in the app is protected without any @UseGuards() decoration.
//   Controllers just use @RequirePermissions() or @Public() — nothing else.
//
// ─── GUARD EXECUTION ORDER ───────────────────────────────────────────────────
//
// Guards run in the ORDER they appear in the providers[] array:
//   1. JwtAuthGuard — validates the token, populates req.user
//   2. PermissionsGuard — checks req.user's permissions (needs req.user, so must run second)
//
// If JwtAuthGuard fails (401), PermissionsGuard never runs.
// If JwtAuthGuard passes but PermissionsGuard fails (403), the controller never runs.
//
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    // Makes ConfigService available everywhere — reads .env files
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection — URI comes from .env via ConfigService
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
      }),
    }),

    // Redis cache — isGlobal: true means RbacCacheService can inject
    // CACHE_MANAGER anywhere without re-importing CacheModule each time.
    CacheModule.register({ isGlobal: true }),

    // BullMQ queues (audit queue) — connects to Redis
    QueueModule,

    // JWT validation + Passport + AuthController (/auth/login, /auth/me, etc.)
    AuthModule,

    // Roles, permissions, user-roles, audit, context evaluator
    RbacModule,

    // User management (CRUD for user accounts)
    UsersModule,

    // NEW: Bonus approval endpoint — requires 'bonus:approve' permission
    // The global guards protect it automatically.
    BonusModule,
  ],

  providers: [
    // Guard 1: validates JWT, populates req.user
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Guard 2: checks permissions from req.user against @RequirePermissions() metadata
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}