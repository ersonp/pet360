import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IpfsModule } from './ipfs/ipfs.module';
import { PassportModule } from './passport/passport.module';

// ConfigModule.forRoot({ isGlobal: true }) loads .env once at startup and makes
// ConfigService injectable everywhere — no need to import ConfigModule per-feature.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    IpfsModule,
    PassportModule,
  ],
})
export class AppModule {}
