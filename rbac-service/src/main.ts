import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //golbal prefix 
  app.setGlobalPrefix('api');
  //validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

// cors
app.enableCors();

const port = process.env.PORT || 3010;
await app.listen(port);
console.log(`RBAC sevice running on http://localhost:${port}/api`);

}
bootstrap();
