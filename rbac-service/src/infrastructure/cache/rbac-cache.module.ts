// src/infrastructure/cache/rbac-cache.module.ts
import { Module } from '@nestjs/common';
import { RbacCacheService } from './rbac-cache.service';



@Module({
  providers: [RbacCacheService],
  exports: [RbacCacheService],   // <-- makes it available to any module that imports this
})
export class RbacCacheModule {}