import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ExpressAdapter } from '@nestjs/platform-express'
import { ValidationPipe } from '@nestjs/common'
import * as express from 'express'
import { AppModule } from '../src/app.module'
import type { IncomingMessage, ServerResponse } from 'http'

const expressApp = express()

// Singleton: se reutiliza en invocaciones warm (reuso de conexión MongoDB)
let initPromise: Promise<void> | null = null

function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        { logger: ['error', 'warn'] },
      )

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: false,
        }),
      )

      app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
      })

      await app.init()
    })()
  }
  return initPromise
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await init()
  expressApp(req as any, res as any)
}
