import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ContractService } from './contract.service';

// Mock ethers — avoids real RPC connections in unit tests.
jest.mock('ethers', () => {
  const parseLogResults: Record<string, { name: string; args: unknown[] }> = {
    '0xPassportMintedTopic': {
      name: 'PassportMinted',
      args: ['0xOwner', BigInt(42), 'ipfs://QmMeta'],
    },
  };

  return {
    ethers: {
      JsonRpcProvider: jest.fn(),
      Wallet: jest.fn(),
      Contract: jest.fn().mockImplementation(() => ({
        mint: jest.fn().mockResolvedValue({
          hash: '0xtxhash',
          wait: jest.fn().mockResolvedValue({
            logs: [{ topics: ['0xPassportMintedTopic'] }],
          }),
        }),
      })),
      Interface: jest.fn().mockImplementation(() => ({
        parseLog: jest.fn().mockImplementation((log: { topics: string[] }) => {
          return parseLogResults[log.topics[0]] ?? null;
        }),
      })),
    },
  };
});

const mockConfig = {
  getOrThrow: (key: string): string => {
    const values: Record<string, string> = {
      POLYGON_RPC_URL: 'http://localhost:8545',
      MINTER_PRIVATE_KEY: '0x' + 'a'.repeat(64),
      CONTRACT_ADDRESS: '0x' + '1'.repeat(40),
    };
    if (!(key in values)) throw new Error(`Missing config: ${key}`);
    return values[key];
  },
};

describe('ContractService', () => {
  let service: ContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  it('returns tokenId and txHash from PassportMinted event', async () => {
    const result = await service.mintPassport(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      'ipfs://QmMeta',
    );

    expect(result.tokenId).toBe(BigInt(42));
    expect(result.txHash).toBe('0xtxhash');
  });
});
