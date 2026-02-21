import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type RateLimitDocument = RateLimit & Document

@Schema({ versionKey: false, timestamps: false })
export class RateLimit {
  @Prop({ required: true, unique: true })
  key: string

  @Prop({ required: true, default: 0 })
  count: number

  @Prop({ required: true })
  expiresAt: Date
}

export const RateLimitSchema = SchemaFactory.createForClass(RateLimit)

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
