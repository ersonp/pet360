import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';
import { IIpfsService } from './ipfs.interface';
import { UploadPetDto } from './dto/upload-pet.dto';
import { PetMetadata } from './types/pet-metadata.type';

// Adapter (hexagonal architecture) — implements IIpfsService using Pinata SDK v2.
// SDK v2 uses JWT auth (not API key/secret). Requires PINATA_JWT and PINATA_GATEWAY.
//
// Upload flow:
//   1. Buffer → Blob → File (SDK v2 does not accept raw Buffer)
//   2. Upload photo File → get photo CID
//   3. Build metadata JSON with image: "ipfs://<photo-cid>"
//   4. Upload metadata JSON → get metadata CID
//   5. Return "ipfs://<metadata-cid>" as tokenURI
@Injectable()
export class PinataService implements IIpfsService {
  private readonly pinata: PinataSDK;

  constructor(private readonly config: ConfigService) {
    this.pinata = new PinataSDK({
      pinataJwt: this.config.getOrThrow<string>('PINATA_JWT'),
      pinataGateway: this.config.getOrThrow<string>('PINATA_GATEWAY'),
    });
  }

  async uploadPet(dto: UploadPetDto): Promise<string> {
    const photoCid = await this.uploadPhoto(dto.photo, dto.photoFilename, dto.photoMimeType);
    const metadataCid = await this.uploadMetadata(dto, photoCid);
    return `ipfs://${metadataCid}`;
  }

  private async uploadPhoto(
    photo: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    // SDK v2 requires File/Blob — convert Buffer first.
    // Cast to Uint8Array: Buffer extends Uint8Array but TypeScript strict mode
    // rejects Buffer directly as BlobPart due to SharedArrayBuffer ambiguity.
    const blob = new Blob([new Uint8Array(photo)], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    const result = await this.pinata.upload.public.file(file);
    return result.cid;
  }

  private async uploadMetadata(dto: UploadPetDto, photoCid: string): Promise<string> {
    const metadata: PetMetadata = {
      name: dto.name,
      description: dto.description,
      image: `ipfs://${photoCid}`,
      attributes: [
        { trait_type: 'Species', value: dto.species },
        { trait_type: 'Breed', value: dto.breed },
        { trait_type: 'Date of Birth', value: dto.dateOfBirth },
        { trait_type: 'Pet ID', value: dto.petId },
      ],
    };

    const result = await this.pinata.upload.public.json(metadata);
    return result.cid;
  }
}
