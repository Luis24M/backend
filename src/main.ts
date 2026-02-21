import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { buildCorsOptions } from './cors.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )

  app.enableCors(buildCorsOptions())

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}`)
}


bootstrap()
