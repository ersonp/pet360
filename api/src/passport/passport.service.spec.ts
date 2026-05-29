import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PassportService } from './passport.service';
import { IPFS_SERVICE } from '../ipfs/ipfs.interface';
import { ContractService } from '../blockchain/contract.service';

const mockIpfs = {
  uploadPet: jest.fn().mockResolvedValue('ipfs://QmMetadataCid'),
};

const mockContract = {
  mintPassport: jest.fn().mockResolvedValue({
    tokenId: BigInt(1),
    txHash: '0xabc123',
  }),
};

const validDto = {
  petId: 'pet-001',
  ownerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  name: 'Rex',
  species: 'dog',
  breed: 'Golden Retriever',
  dob: '2021-03-15',
};

const mockPhoto: Express.Multer.File = {
  buffer: Buffer.from('fake-image'),
  originalname: 'rex.jpg',
  mimetype: 'image/jpeg',
  fieldname: 'photo',
  encoding: '7bit',
  size: 10,
  stream: null as never,
  destination: '',
  filename: '',
  path: '',
};

describe('PassportService', () => {
  let service: PassportService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassportService,
        { provide: IPFS_SERVICE, useValue: mockIpfs },
        { provide: ContractService, useValue: mockContract },
      ],
    }).compile();

    service = module.get<PassportService>(PassportService);
  });

  it('returns tokenId, txHash, tokenURI on success', async () => {
    const result = await service.mintPassport(validDto, mockPhoto);

    expect(result).toEqual({
      tokenId: '1',
      txHash: '0xabc123',
      tokenURI: 'ipfs://QmMetadataCid',
    });
  });

  it('calls ipfs.uploadPet with correct fields', async () => {
    await service.mintPassport(validDto, mockPhoto);

    expect(mockIpfs.uploadPet).toHaveBeenCalledWith(
      expect.objectContaining({
        petId: 'pet-001',
        name: 'Rex',
        species: 'dog',
        breed: 'Golden Retriever',
        dateOfBirth: '2021-03-15',
      }),
    );
  });

  it('calls contract.mintPassport with ownerAddress and tokenURI', async () => {
    await service.mintPassport(validDto, mockPhoto);

    expect(mockContract.mintPassport).toHaveBeenCalledWith(
      validDto.ownerAddress,
      'ipfs://QmMetadataCid',
    );
  });

  it('throws BadRequestException when a required field is missing', async () => {
    const { name: _name, ...dtoWithoutName } = validDto;

    await expect(
      service.mintPassport(dtoWithoutName as typeof validDto, mockPhoto),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when photo is missing', async () => {
    await expect(
      service.mintPassport(validDto, null as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it('serialises bigint tokenId to string', async () => {
    mockContract.mintPassport.mockResolvedValueOnce({
      tokenId: BigInt(999),
      txHash: '0xdef456',
    });

    const result = await service.mintPassport(validDto, mockPhoto);
    expect(result.tokenId).toBe('999');
    expect(typeof result.tokenId).toBe('string');
  });
});
