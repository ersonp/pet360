import { Test, TestingModule } from '@nestjs/testing';
import { PassportController } from './passport.controller';
import { PassportService } from './passport.service';

const mockPassportService = {
  mintPassport: jest.fn().mockResolvedValue({
    tokenId: '42',
    txHash: '0xabc123',
    tokenURI: 'ipfs://QmMetadataCid',
  }),
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

const validDto = {
  petId: 'pet-001',
  ownerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  name: 'Rex',
  species: 'dog',
  breed: 'Golden Retriever',
  dob: '2021-03-15',
};

describe('PassportController', () => {
  let controller: PassportController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PassportController],
      providers: [
        { provide: PassportService, useValue: mockPassportService },
      ],
    }).compile();

    controller = module.get<PassportController>(PassportController);
  });

  it('returns mint response from passportService', async () => {
    const result = await controller.mint(validDto, mockPhoto);

    expect(result).toEqual({
      tokenId: '42',
      txHash: '0xabc123',
      tokenURI: 'ipfs://QmMetadataCid',
    });
  });

  it('delegates to passportService.mintPassport with dto and photo', async () => {
    await controller.mint(validDto, mockPhoto);

    expect(mockPassportService.mintPassport).toHaveBeenCalledWith(
      validDto,
      mockPhoto,
    );
  });

  it('propagates errors thrown by passportService', async () => {
    mockPassportService.mintPassport.mockRejectedValueOnce(
      new Error('IPFS upload failed'),
    );

    await expect(controller.mint(validDto, mockPhoto)).rejects.toThrow(
      'IPFS upload failed',
    );
  });
});
