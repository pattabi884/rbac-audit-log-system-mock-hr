// src/modules/bonus/bonus.module.ts

import { Module } from '@nestjs/common';
import { BonusController } from './bonus.controller';

// ─── WHY THIS MODULE IS MINIMAL ─────────────────────────────────────────────
//
// BonusModule has no providers[] and no imports[] right now.
//
// Why no providers?
//   BonusController currently returns a static response — there's no
//   BonusService with business logic yet. When you add database persistence
//   (a BonusRequest schema and BonusService), you'd add them here.
//
// Why no imports?
//   Guards are registered globally in AppModule via APP_GUARD.
//   BonusController doesn't need to import AuthModule or UserRolesModule —
//   the guards are already running. @RequirePermissions() is just metadata
//   that the already-running PermissionsGuard reads. Zero coupling.
//
// ─── TO ACTIVATE THIS MODULE ─────────────────────────────────────────────────
//
// Add BonusModule to AppModule's imports[] array:
//
//   import { BonusModule } from '@modules/bonus/bonus.module';
//
//   @Module({
//     imports: [
//       ...existing modules...
//       BonusModule,   // <-- add this line
//     ],
//   })
//   export class AppModule {}
//
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  controllers: [BonusController],
})
export class BonusModule {}