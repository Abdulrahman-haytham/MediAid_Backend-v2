import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; cloudinary_id: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'my-app-uploads',
          allowed_formats: ['jpeg', 'png', 'jpg', 'gif'],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));
          resolve({
            url: result.secure_url,
            cloudinary_id: result.public_id,
          });
        },
      );

      Readable.from(file.buffer).pipe(upload);
    });
  }
}
