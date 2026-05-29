import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  // Provide required env vars so ConfigService.getOrThrow() doesn't throw
  // when PinataService is instantiated during module compilation.
  beforeAll(() => {
    process.env.PINATA_JWT = 'test-jwt';
    process.env.PINATA_GATEWAY = 'test.mypinata.cloud';
    process.env.POLYGON_RPC_URL = 'http://localhost:8545';
    process.env.MINTER_PRIVATE_KEY = '0x' + 'a'.repeat(64);
    process.env.CONTRACT_ADDRESS = '0x' + '1'.repeat(40);
  });

  it('compiles the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
