import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { Position } from './candidate.schema'

export enum ElectionStatus {
  WAITING = 'WAITING',
  AREAS_OPEN = 'AREAS_OPEN',
  PRESI_OPEN = 'PRESI_OPEN',
  CLOSED = 'CLOSED',
}

/**
 * Estado por posición:
 * - PENDING    → aún no se procesa el resultado
 * - COMPLETED  → ganador determinado
 * - RUNOFF     → segunda vuelta activa (Art. 18: empate o sin mayoría absoluta)
 * - VOID       → anulado (blancos+nulos > 2/3 del total, Art. 22 situación 4)
 */
export enum PositionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  RUNOFF = 'RUNOFF',
  VOID = 'VOID',
}

export type ElectionConfigDocument = ElectionConfig & Document

@Schema()
export class ElectionConfig {
  @Prop({
    required: true,
    enum: Object.values(ElectionStatus),
    default: ElectionStatus.WAITING,
  })
  status: ElectionStatus

  @Prop({ default: 1 })
  currentRound: number

  /**
   * Estado individual por cargo. Permite gestionar balotajes independientes
   * mientras la fase general sigue activa.
   */
  @Prop({
    type: Object,
    default: () => ({
      PMO: PositionStatus.PENDING,
      GTH: PositionStatus.PENDING,
      MKT: PositionStatus.PENDING,
      LTK_FNZ: PositionStatus.PENDING,
      TI: PositionStatus.PENDING,
      PRESIDENCIA: PositionStatus.PENDING,
    }),
  })
  positionStates: Record<Position, PositionStatus>

  /**
   * Para cada cargo en RUNOFF, los IDs de los 2 candidatos finalistas.
   * Requerido para filtrar la boleta en segunda vuelta.
   */
  @Prop({ type: Object, default: () => ({}) })
  runoffCandidates: Record<string, string[]>
}

export const ElectionConfigSchema = SchemaFactory.createForClass(ElectionConfig)
