import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// ConfigModule.forRoot({ isGlobal: true }) loads .env once at startup and makes
// ConfigService injectable everywhere — no need to import ConfigModule per-feature.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
