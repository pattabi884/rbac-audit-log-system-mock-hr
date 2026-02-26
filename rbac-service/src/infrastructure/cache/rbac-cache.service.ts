import { Injectable ,Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RbacCacheService{
    private readonly TTL = 300;
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache){}

    //CACHE USER PERMISSIONS
    async getUserPermissions(userId: string): Promise<string[] | null>{
        const key = `user:${userId}:permissions`;
        return ( await this.cacheManager.get(key)) ?? null;
    }
    async setUserPermissions(userId: string, permissions: string[]): Promise<void>{
        const key = `user:${userId}:permissions`;
        await this.cacheManager.set(key, permissions, this.TTL)
    }
    //invalidate user cache when roles change 
    async invalidateUserCache(userId: string): Promise<void>{
        const key = `user:${userId}:permissions`;
        await this.cacheManager.del(key);
    }
    async invalidateRoleCache(roleId: string): Promise<void>{
        //this is more complex need to find all the users with this role and invilidate their cache
        const key = `role:${roleId}:*`;
        //implenmt depend son the cache store 
    }
//

}