import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api'); // Establecer el prefijo global para todas las rutas

  // Activar validación y transformación estricta de DTOs globalmente
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve campos que no estén en el DTO
      forbidNonWhitelisted: false, // Permitimos campos extra para filtros dinámicos
      transform: true,
    }),
  );

  // Configurar cookie-parser antes de inicializar otras rutas
  app.use(cookieParser());

  // Habilitar CORS para permitir envío de cookies (credentials: true)
  app.enableCors({
    origin: true, // Idealmente en prod restringir a los dominios del SaaS
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'Accept'],
    exposedHeaders: ['x-tenant-id'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server', err);
});
