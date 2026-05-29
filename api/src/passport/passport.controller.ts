import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PassportService } from './passport.service';
import { MintPassportDto } from './dto/mint-passport.dto';
import { MintPassportResponseDto } from './dto/mint-passport-response.dto';

@Controller('passport')
export class PassportController {
  constructor(private readonly passportService: PassportService) {}

  // POST /passport/mint
  // Content-Type: multipart/form-data
  // Accepts text fields (petId, ownerAddress, name, species, breed, dob)
  // and a single file field named "photo".
  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    }),
  )
  async mint(
    @Body() dto: MintPassportDto,
    @UploadedFile() photo: Express.Multer.File,
  ): Promise<MintPassportResponseDto> {
    return this.passportService.mintPassport(dto, photo);
  }
}
