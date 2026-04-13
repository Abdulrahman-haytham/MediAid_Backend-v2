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

  // إعداد الـ Pipes العالمية للتحقق من البيانات
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // إعداد الـ Interceptors العالمية لتنسيق الاستجابة
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  // تحديد المنفذ والمضيف
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  
  try {
    // محاولة بدء الاستماع للطلبات
    appLogger.log(`Attempting to start server on ${host}:${port}...`, 'Bootstrap');
    
    await app.listen(port, host);
    
    // إعداد رسالة النجاح في الكونسول
    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    const separator = '='.repeat(60);
    
    console.log(`\n${separator}`);
    console.log(`🚀  Server running at:         ${url}`);
    console.log(`📚  API Documentation:         ${url}/api`);
    console.log(`🌍  Environment:               ${process.env.NODE_ENV || 'development'}`);
    console.log(`${separator}\n`);
    
    appLogger.log(`Server started successfully on port ${port}`, 'Bootstrap');
  } catch (error) {
    appLogger.error(`Failed to start server: ${error.message}`, error.stack, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();