import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

/**
 * Cargos votables. Vicepresidencia es designada por el presidente electo (Art. 04)
 * y NO aparece en el sistema de votación.
 *
 * Nomenclatura oficial del reglamento:
 * - PMO      → Dirección de la Oficina de Proyectos
 * - GTH      → Dirección de Gestión de Talento Humano
 * - MKT      → Dirección de Marketing
 * - LTK_FNZ  → Dirección de Logística y Finanzas
 * - TI       → Dirección de Tecnología de la Información
 * - PRESIDENCIA
 */
export enum Position {
  PMO = 'PMO',
  GTH = 'GTH',
  MKT = 'MKT',
  LTK_FNZ = 'LTK_FNZ',
  TI = 'TI',
  PRESIDENCIA = 'PRESIDENCIA',
}

export const POSITION_LABELS: Record<Position, string> = {
  [Position.PMO]: 'Dirección de la Oficina de Proyectos',
  [Position.GTH]: 'Dirección de Gestión de Talento Humano',
  [Position.MKT]: 'Dirección de Marketing',
  [Position.LTK_FNZ]: 'Dirección de Logística y Finanzas',
  [Position.TI]: 'Dirección de Tecnología de la Información',
  [Position.PRESIDENCIA]: 'Presidencia',
}

export const AREA_POSITIONS = [
  Position.PMO,
  Position.GTH,
  Position.MKT,
  Position.LTK_FNZ,
  Position.TI,
]

export type CandidateDocument = Candidate & Document

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ required: true, trim: true })
  name: string

  /** URL de foto (requerida por reglamento, Art. 14 paso 3) */
  @Prop({ default: '' })
  photoUrl: string

  /** Cargo al que postula — independiente, sin listas (Art. 06) */
  @Prop({ required: true, enum: Object.values(Position) })
  position: Position

  /** Aprobado por el Comité Electoral (Art. 07) */
  @Prop({ default: false })
  isApproved: boolean

  /** Orden de sustentación (determinado por sorteo, Art. 20) */
  @Prop({ default: 0 })
  presentationOrder: number
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate)
