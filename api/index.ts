import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; 
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();

const bootstrap = async () => {
  const app = await NestFactory.create(
    AppModule, 
    new ExpressAdapter(expressApp)
  );
  
  app.enableCors({
    origin: '*', 
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  });

  await app.init();
};

bootstrap();

export default async function (req: any, res: any) {
    if (!expressApp.listeners('request').length) {
        await bootstrap();
    }
    expressApp(req, res);
}