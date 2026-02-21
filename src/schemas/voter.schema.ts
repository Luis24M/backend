import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { Position } from './candidate.schema'

export type VoterDocument = Voter & Document

@Schema({ timestamps: true })
export class Voter {
  @Prop({ required: true, unique: true, trim: true })
  dni: string

  @Prop({ required: true, trim: true })
  name: string

  @Prop({ default: '' })
  email: string

  /** Área a la que pertenece el votante */
  @Prop({ required: true, enum: ['PMO', 'GTH', 'MKT', 'LTK_FNZ', 'TI'] })
  area: Position

  /** Flag de asistencia — admin habilita al marcar asistencia */
  @Prop({ default: false })
  isEnabled: boolean

  /** Ya emitió su voto en la fase de áreas (Fase 1, round 1) */
  @Prop({ default: false })
  hasVotedArea: boolean

  /** Ya emitió su voto de presidencia (Fase 2) */
  @Prop({ default: false })
  hasVotedPresidency: boolean

  /**
   * Posiciones en las que ya votó en segunda vuelta (round 2).
   * Se usa para prevenir doble voto en balotaje manteniendo anonimato
   * (los documentos Vote no contienen voterId).
   */
  @Prop({ type: [String], default: [] })
  votedRound2Positions: string[]

  /** Token de sesión para autenticación stateless */
  @Prop()
  sessionToken: string

  @Prop()
  sessionTokenExpiry: Date
}

export const VoterSchema = SchemaFactory.createForClass(Voter)

// Índice compuesto para validar sesión activa (token + expiración)
VoterSchema.index({ sessionToken: 1, sessionTokenExpiry: 1 })
VoterSchema.index({ name: 1 })
VoterSchema.index({ isEnabled: 1, hasVotedArea: 1, hasVotedPresidency: 1 })
