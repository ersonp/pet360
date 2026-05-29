import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001' });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Pet360 API running on port ${port}`);
}

bootstrap();
