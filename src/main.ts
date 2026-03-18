import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CustomLogger } from './common/logger/custom-logger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const appLogger = new CustomLogger();
  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('MediAid API')
    .setDescription(
      'API documentation for MediAid application.\n\nSuccessful responses use a unified structure.',
    )
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
  appLogger.log(`API ready at: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
