import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // bodyLimit поднят для загрузки изображений (data:URL base64) в админке.
    new FastifyAdapter({ logger: true, bodyLimit: 12 * 1024 * 1024 }),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(fastifyCookie as any);

  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>("CORS_ORIGIN", "http://localhost:3000");

  app.enableCors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix("api");

  const port = config.get<number>("API_PORT", 3016);
  await app.listen(port, "0.0.0.0");
  console.log(`Studio API listening on http://0.0.0.0:${port}/api`);
}

bootstrap();
