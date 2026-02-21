import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { Position } from './candidate.schema'

export enum VoteType {
  VALID = 'VALID',
  BLANK = 'BLANK',
  NULL = 'NULL',
}

export type VoteDocument = Vote & Document

/**
 * Voto individual — completamente anónimo (Art. 17).
 * No contiene referencia al votante para preservar el secreto del voto.
 * La prevención de doble voto se maneja en el documento Voter.
 */
@Schema()
export class Vote {
  @Prop({ required: true, enum: Object.values(Position) })
  position: Position

  /** null cuando voteType es BLANK o NULL */
  @Prop({ type: Types.ObjectId, ref: 'Candidate', default: null })
  candidateId: Types.ObjectId | null

  @Prop({ required: true, enum: Object.values(VoteType) })
  voteType: VoteType

  /** 1 = primera vuelta, 2 = segunda vuelta (balotaje, Art. 18) */
  @Prop({ required: true, enum: [1, 2], default: 1 })
  round: number

  @Prop({ default: () => new Date() })
  votedAt: Date
}

export const VoteSchema = SchemaFactory.createForClass(Vote)

// Índices para consultas frecuentes
VoteSchema.index({ position: 1, round: 1 })
VoteSchema.index({ candidateId: 1 })
