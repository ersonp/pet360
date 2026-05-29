// Input to the IPFS upload flow — everything needed to build the pet's NFT metadata.
// Received from the NestJS mint endpoint (task 06) after the Web2 platform calls it.

export interface UploadPetDto {
  // The raw photo buffer (e.g. from multer file upload)
  photo: Buffer;
  // Original filename — used as the IPFS file name for the photo upload
  photoFilename: string;
  // MIME type of the photo (e.g. "image/jpeg", "image/png")
  photoMimeType: string;
  // Human-readable name for the NFT (e.g. "Rex")
  name: string;
  // Short description (e.g. "Golden Retriever, 3 years old")
  description: string;
  // Pet species (e.g. "dog", "cat")
  species: string;
  // Pet breed (e.g. "Golden Retriever")
  breed: string;
  // Date of birth in ISO format (e.g. "2021-03-15")
  dateOfBirth: string;
  // Internal Pet360 pet ID — links the NFT back to the Web2 record
  petId: string;
}
