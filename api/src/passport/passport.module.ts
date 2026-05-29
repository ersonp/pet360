import { Module } from '@nestjs/common';
import { PassportController } from './passport.controller';
import { PassportService } from './passport.service';
import { IpfsModule } from '../ipfs/ipfs.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [IpfsModule, BlockchainModule],
  controllers: [PassportController],
  providers: [PassportService],
})
export class PassportModule {}
