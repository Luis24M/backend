import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; 
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();
let isAppInitialized = false; 

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
  isAppInitialized = true;
};

bootstrap();

export default async function (req: any, res: any) {
    if (!isAppInitialized) {
    console.log('Iniciando NestJS (Cold Start)...');
    await bootstrap();
  }
  expressApp(req, res);
}