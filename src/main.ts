import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/custom-logger';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  // Security Headers
  app.use(helmet());
  
  // Compression
  app.use(compression());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('MediAid API')
    .setDescription('API documentation for MediAid application. \n\n**Response Structure:**\nAll successful responses follow this format:\n```json\n{\n  "statusCode": 200,\n  "success": true,\n  "message": "Request successful",\n  "data": { ... }\n}\n```')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API جاهزة على: http://localhost:${port}`);
}
bootstrap();
