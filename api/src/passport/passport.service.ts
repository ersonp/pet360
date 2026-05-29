import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IIpfsService, IPFS_SERVICE } from '../ipfs/ipfs.interface';
import { ContractService } from '../blockchain/contract.service';
import { MintPassportDto, validateMintPassportDto } from './dto/mint-passport.dto';
import { MintPassportResponseDto } from './dto/mint-passport-response.dto';

// Orchestrates the mint flow:
//   1. Validate input
//   2. Upload photo + metadata to IPFS → get tokenURI
//   3. Call PetPassport.mint() on-chain → get tokenId + txHash
//   4. Return response DTO
@Injectable()
export class PassportService {
  constructor(
    @Inject(IPFS_SERVICE) private readonly ipfs: IIpfsService,
    private readonly contract: ContractService,
  ) {}

  async mintPassport(
    dto: MintPassportDto,
    photo: Express.Multer.File,
  ): Promise<MintPassportResponseDto> {
    const missingField = validateMintPassportDto(dto);
    if (missingField) {
      throw new BadRequestException(`Missing required field: ${missingField}`);
    }

    if (!photo) {
      throw new BadRequestException('Missing required field: photo');
    }

    const tokenURI = await this.ipfs.uploadPet({
      photo: photo.buffer,
      photoFilename: photo.originalname,
      photoMimeType: photo.mimetype,
      name: dto.name,
      description: `${dto.species} — ${dto.breed}`,
      species: dto.species,
      breed: dto.breed,
      dateOfBirth: dto.dob,
      petId: dto.petId,
    });

    const { tokenId, txHash } = await this.contract.mintPassport(
      dto.ownerAddress,
      tokenURI,
    );

    return {
      tokenId: tokenId.toString(),
      txHash,
      tokenURI,
    };
  }
}
