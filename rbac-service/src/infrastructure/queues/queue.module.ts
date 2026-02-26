import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        
        if (redisUrl) {
          // Parse rediss://default:PASSWORD@HOST:PORT
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port),
              password: url.password,
              tls: redisUrl.startsWith('rediss://') ? {} : undefined,
            },
          };
        }

        // Fallback for local development
        return {
          connection: {
            host: 'localhost',
            port: 6379,
          },
        };
      },
    }),

    BullModule.registerQueue({
      name: 'audit',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}