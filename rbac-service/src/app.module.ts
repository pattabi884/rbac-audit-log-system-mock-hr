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

// The guard itself
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
   
    ConfigModule.forRoot({ isGlobal: true }),

  
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
      }),
    }),

    /*
      CacheModule sets up Redis caching globally.
      isGlobal: true means RbacCacheService can inject it
      anywhere without re-importing CacheModule each time.
      This is what makes permission checks fast — cached results
      don't need a MongoDB round trip.
    */
    CacheModule.register({ isGlobal: true }),

    /*
      QueueModule sets up BullMQ with Redis connection.
      Must be imported here so the audit queue is available
      across the entire app — specifically for QueueService
      which permissions.guard.ts uses to log every permission check.
    */
    QueueModule,

    /*
      AuthModule sets up JWT validation and Passport.
      Must be imported here because JwtAuthGuard is used
      in controllers across multiple modules.
      AuthModule exports JwtAuthGuard so all other modules
      can use it without importing AuthModule themselves.
    */
    AuthModule,

    /*
      RbacModule brings in everything RBAC related:
      roles, permissions, user-roles, audit, and context evaluation.
      This is the core of your entire system.

      IMPORTANT: RbacModule exports UserRolesModule, AuditModule,
      and ContextEvaluatorService — all of which PermissionsGuard
      needs. Because RbacModule is imported here at the root level,
      those exports are available in AppModule's context, which means
      the global APP_GUARD below can access them.
    */
    RbacModule,

    /*
      UsersModule registers the /users routes and UsersService.
      It depends on AuthModule being loaded first for JwtAuthGuard —
      NestJS handles that dependency order automatically.
    */
    UsersModule,
  ],

  providers: [
    /*
      APP_GUARD is a special NestJS token that registers a guard
      GLOBALLY — meaning it runs on every single route in the entire app.

      WHY THIS SOLVES THE PROBLEM:
      When you use @UseGuards(PermissionsGuard) on a controller inside
      RolesModule, NestJS tries to instantiate PermissionsGuard inside
      RolesModule's context — but RolesModule doesn't know about
      UserRolesService, AuditService, or ContextEvaluatorService.

      By moving PermissionsGuard here with APP_GUARD, it's instantiated
      at the AppModule level, where ALL of those services ARE available
      (because RbacModule is imported here and exports them).

      You can now REMOVE @UseGuards(PermissionsGuard) from individual
      controllers — the guard runs automatically on every route.
      Keep @UseGuards(JwtAuthGuard) since that's a different guard.
      Keep @RequirePermissions(...) decorators — those still work.
      Routes with no @RequirePermissions decorator are passed through
      automatically (the guard checks for this and returns true).
    */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}