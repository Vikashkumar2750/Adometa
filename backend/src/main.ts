// // restart: 00:29:34
// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe, Logger } from '@nestjs/common';
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { AppModule } from './app.module';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';

// async function bootstrap() {
//   const logger = new Logger('Bootstrap');
//   const app = await NestFactory.create<NestExpressApplication>(AppModule);

//   // Serve uploaded template media (images, videos, documents) as static files
//   const uploadsDir = join(process.cwd(), 'uploads');
//   if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
//   app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

//   // 1. Enable CORS for frontend communication
//   app.enableCors({
//     origin: '*', // Allow all origins for dev; restrict in production
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//   });

//   // 2. Set Global Prefix
//   app.setGlobalPrefix('api'); // All routes will start with /api (e.g., /api/auth/login)

//   // 3. Global Validation Pipe
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true, // Strip properties not in DTO
//       transform: true, // Transform payloads to DTO instances
//       forbidNonWhitelisted: true, // Throw error if extra properties sent
//     }),
//   );

//   // 4. Setup Swagger Documentation
//   const config = new DocumentBuilder()
//     .setTitle('Techaasvik API')
//     .setDescription('Bank-grade Secure Multi-Tenant WhatsApp SaaS API')
//     .setVersion('1.0')
//     .addBearerAuth() // Enable JWT auth in Swagger UI
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api/docs', app, document);

//   // 5. Start Server
//   const port = process.env.PORT || 3001;
//   await app.listen(process.env.PORT || 3000);
// console.log("Server running on port:", process.env.PORT);

//   logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
//   logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files (images, videos, docs)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Enable CORS
  app.enableCors({
    origin: '*', // ⚠️ production में restrict करना
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Techaasvik API')
    .setDescription('Bank-grade Secure Multi-Tenant WhatsApp SaaS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ✅ CRITICAL: Railway-compatible port
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`✅ Server running on port: ${port}`);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();