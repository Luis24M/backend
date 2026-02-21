import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module'; 
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();

let cachedApp: any;

async function bootstrap() {
  if (!cachedApp) {
    cachedApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

    cachedApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    cachedApp.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    });

    await cachedApp.init(); 
  }
  return expressApp;
}

export default async function (req: any, res: any) {
  const app = await bootstrap();
  app(req, res);
}