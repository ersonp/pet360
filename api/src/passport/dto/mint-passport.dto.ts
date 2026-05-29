// Input DTO for POST /passport/mint (multipart/form-data).
// Text fields arrive as strings; the photo arrives as a Multer file.
// Validated manually in PassportService — class-transformer is abandoned.

export interface MintPassportDto {
  petId: string;
  ownerAddress: string;
  name: string;
  species: string;
  breed: string;
  dob: string; // YYYY-MM-DD
}

// Validates that all required string fields are present and non-empty.
// Returns the first missing field name, or null if all fields are present.
export function validateMintPassportDto(dto: Partial<MintPassportDto>): string | null {
  const required: Array<keyof MintPassportDto> = [
    'petId',
    'ownerAddress',
    'name',
    'species',
    'breed',
    'dob',
  ];

  for (const field of required) {
    if (!dto[field] || (dto[field] as string).trim() === '') {
      return field;
    }
  }

  return null;
}
