import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinataService } from './pinata.service';
import { UploadPetDto } from './dto/upload-pet.dto';

// Mock the entire pinata module — we don't want real network calls in unit tests.
// The mock returns predictable CIDs so we can assert the tokenURI format.
jest.mock('pinata', () => ({
  PinataSDK: jest.fn().mockImplementation(() => ({
    upload: {
      public: {
        file: jest.fn().mockResolvedValue({ cid: 'QmPhotoCid123' }),
        json: jest.fn().mockResolvedValue({ cid: 'QmMetadataCid456' }),
      },
    },
  })),
}));

const mockConfig = {
  getOrThrow: (key: string): string => {
    const values: Record<string, string> = {
      PINATA_JWT: 'test-jwt',
      PINATA_GATEWAY: 'test.mypinata.cloud',
    };
    if (!(key in values)) throw new Error(`Missing config: ${key}`);
    return values[key];
  },
};

const testDto: UploadPetDto = {
  photo: Buffer.from('fake-image-data'),
  photoFilename: 'rex.jpg',
  photoMimeType: 'image/jpeg',
  name: 'Rex',
  description: 'Golden Retriever, 3 years old',
  species: 'dog',
  breed: 'Golden Retriever',
  dateOfBirth: '2021-03-15',
  petId: 'pet-001',
};

describe('PinataService', () => {
  let service: PinataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinataService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PinataService>(PinataService);
  });

  it('returns ipfs:// URI with the metadata CID', async () => {
    const result = await service.uploadPet(testDto);
    expect(result).toBe('ipfs://QmMetadataCid456');
  });

  it('builds metadata image field from photo CID', async () => {
    // Access the private pinata instance to inspect the json upload call
    const { PinataSDK } = await import('pinata');
    const mockInstance = (PinataSDK as jest.Mock).mock.results[0].value;
    const jsonSpy = mockInstance.upload.public.json;

    await service.uploadPet(testDto);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        image: 'ipfs://QmPhotoCid123',
        name: 'Rex',
      }),
    );
  });

  it('includes all attributes in metadata', async () => {
    const { PinataSDK } = await import('pinata');
    const mockInstance = (PinataSDK as jest.Mock).mock.results[0].value;
    const jsonSpy = mockInstance.upload.public.json;

    await service.uploadPet(testDto);

    const metadata = jsonSpy.mock.calls[0][0];
    const traitTypes = metadata.attributes.map((a: { trait_type: string }) => a.trait_type);
    expect(traitTypes).toEqual(['Species', 'Breed', 'Date of Birth', 'Pet ID']);
  });
});
