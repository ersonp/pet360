import { Module } from '@nestjs/common';
import { PinataService } from './pinata.service';
import { IPFS_SERVICE } from './ipfs.interface';

// IpfsModule exports PinataService bound to the IPFS_SERVICE token.
// Other modules inject it as: @Inject(IPFS_SERVICE) private ipfs: IIpfsService
// Swapping to a different IPFS provider only requires changing this module.
@Module({
  providers: [
    {
      provide: IPFS_SERVICE,
      useClass: PinataService,
    },
  ],
  exports: [IPFS_SERVICE],
})
export class IpfsModule {}
