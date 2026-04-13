import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import * as Joi from 'joi';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { UsedMedicineModule } from './modules/usedMedicine/usedMedicine.module';
import { KafuPostModule } from './modules/kafuPost/kafuPost.module';
import { UploadModule } from './modules/upload/upload.module';
import { EmergencyOrderModule } from './modules/emergencyOrder/emergencyOrder.module';
import { ChatModule } from './modules/chat/chat.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().optional(),
        DATABASE_URL: Joi.string().optional(),
        DB_HOST: Joi.string().optional(),
        DB_PORT: Joi.number().optional(),
        DB_USER: Joi.string().optional(),
        DB_PASS: Joi.string().optional(),
        DB_NAME: Joi.string().optional(),
        JWT_SECRET: Joi.string().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        DB_SSL: Joi.boolean().default(false),
        // synchronize يجب أن يبقى false في production حتى لا يحدث drift.
        DB_SYNCHRONIZE: Joi.boolean().default(false),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const sslEnabled =
          configService.get<boolean>('DB_SSL') === true ||
          nodeEnv === 'production';

        const databaseUrl = configService.get<string>('DATABASE_URL');
        let url = databaseUrl;
        if (!url) {
          const host = configService.get<string>('DB_HOST');
          const port = configService.get<number>('DB_PORT');
          const username = configService.get<string>('DB_USER');
          const password = configService.get<string>('DB_PASS');
          const database = configService.get<string>('DB_NAME');

          if (!host || !port || !username || !password || !database) {
            throw new Error(
              'Missing database connection settings. Provide DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME.',
            );
          }

          url = `postgresql://${encodeURIComponent(
            username,
          )}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
        }

        const synchronizeEnabled =
          configService.get<boolean>('DB_SYNCHRONIZE') === true &&
          nodeEnv !== 'production';

        return {
          type: 'postgres',
          url,
          ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
          autoLoadEntities: true,
          entities: [join(__dirname, '**', '*.entity.js')],
          migrations: [join(__dirname, 'migrations', '*.js')],
          migrationsRun: false,
          synchronize: synchronizeEnabled,
        };
      },
    }),
    UserModule,
    AuthModule,
    MailModule,
    CategoryModule,
    ProductModule,
    PharmacyModule,
    CartModule,
    OrderModule,
    UsedMedicineModule,
    KafuPostModule,
    UploadModule,
    EmergencyOrderModule,
    ChatModule,
    TerminusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
