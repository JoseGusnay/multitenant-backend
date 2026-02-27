import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

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

  // Habilitar CORS para permitir conexión del frontend (Flutter Web, etc)
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err: unknown) => {
  console.error('Error starting server', err);
});
