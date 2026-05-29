import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  // Provide required env vars so ConfigService.getOrThrow() doesn't throw
  // when PinataService is instantiated during module compilation.
  beforeAll(() => {
    process.env.PINATA_JWT = 'test-jwt';
    process.env.PINATA_GATEWAY = 'test.mypinata.cloud';
  });

  it('compiles the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
