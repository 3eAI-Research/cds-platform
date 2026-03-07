import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from './storage.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/types/error-codes';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Roles('customer', 'provider_owner', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BusinessException(
              ErrorCode.BUS_PHOTO_INVALID_TYPE,
              `Invalid file type: ${file.mimetype}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  @Post()
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BusinessException(
        ErrorCode.VAL_REQUIRED_FIELD,
        'File is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder ?? 'general',
    );
  }

  @Roles('customer', 'provider_owner', 'admin')
  @Get('url')
  async getUrl(@Query('key') key: string) {
    if (!key) {
      throw new BusinessException(
        ErrorCode.VAL_REQUIRED_FIELD,
        'key query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const url = await this.storageService.getDownloadUrl(key);
    return { key, url };
  }

  @Roles('admin')
  @Delete(':key(*)')
  async delete(@Param('key') key: string) {
    await this.storageService.delete(key);
    return { deleted: true, key };
  }
}
