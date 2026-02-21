import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import { Position } from '../../schemas/candidate.schema'

export class SubmitRunoffDto {
  @IsString()
  @IsIn(Object.values(Position))
  position: Position

  /** candidateId (ObjectId string) | 'BLANK' | 'NULL' */
  @IsString()
  @IsNotEmpty()
  candidateId: string
}
