// Port (hexagonal architecture) — defines what the application layer needs from IPFS.
// PinataService implements this. Any other IPFS provider can swap in by implementing
// this interface, without changing the mint use case.

import { UploadPetDto } from './dto/upload-pet.dto';

export const IPFS_SERVICE = Symbol('IPFS_SERVICE');

export interface IIpfsService {
  // Uploads photo + metadata to IPFS and returns the metadata URI.
  // Returns: "ipfs://<metadata-cid>" — stored as tokenURI on the contract.
  uploadPet(dto: UploadPetDto): Promise<string>;
}
