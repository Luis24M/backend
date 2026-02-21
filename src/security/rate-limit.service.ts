import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { RateLimit, RateLimitDocument } from './rate-limit.schema'

interface AssertLimitOptions {
  request: any
  scope: string
  max: number
  windowSeconds: number
  identifier?: string
}

@Injectable()
export class RateLimitService {
  constructor(
    @InjectModel(RateLimit.name)
    private readonly rateLimitModel: Model<RateLimitDocument>,
  ) {}

  async assertWithinLimit({
    request,
    scope,
    max,
    windowSeconds,
    identifier,
  }: AssertLimitOptions): Promise<void> {
    const ip = this.getClientIp(request)
    const windowMs = windowSeconds * 1000
    const bucket = Math.floor(Date.now() / windowMs)
    const keyBase = identifier ? `${scope}:${identifier}` : `${scope}:${ip}`
    const key = `${keyBase}:${bucket}`

    const doc = await this.rateLimitModel
      .findOneAndUpdate(
        { key },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            expiresAt: new Date((bucket + 1) * windowMs),
          },
        },
        { upsert: true, new: true },
      )
      .lean()

    if (!doc || doc.count <= max) {
      return
    }

    throw new HttpException(
      'Demasiadas solicitudes. Intenta en unos segundos.',
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }

  private getClientIp(request: any): string {
    const forwarded = request.headers?.['x-forwarded-for']

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return String(forwarded[0]).split(',')[0].trim()
    }

    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim()
    }

    return request.ip || request.socket?.remoteAddress || 'unknown'
  }
}
