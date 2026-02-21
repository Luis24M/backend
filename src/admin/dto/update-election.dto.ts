import { IsIn, IsOptional, IsString, IsArray } from 'class-validator'
import { ElectionStatus } from '../../schemas/election-config.schema'
import { PositionStatus } from '../../schemas/election-config.schema'
import { Position } from '../../schemas/candidate.schema'

export class UpdateElectionStatusDto {
  @IsIn(Object.values(ElectionStatus))
  status: ElectionStatus
}

export class UpdatePositionStateDto {
  @IsIn(Object.values(Position))
  position: Position

  @IsIn(Object.values(PositionStatus))
  state: PositionStatus

  /** Solo requerido cuando state = RUNOFF: IDs de los 2 candidatos finalistas */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  runoffCandidateIds?: string[]
}
