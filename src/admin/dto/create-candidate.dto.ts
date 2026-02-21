import { IsString, IsNotEmpty, IsIn, IsOptional, IsBoolean, IsNumber } from 'class-validator'
import { Position } from '../../schemas/candidate.schema'

export class CreateCandidateDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsIn(Object.values(Position))
  position: Position

  @IsOptional()
  @IsString()
  photoUrl?: string

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean

  @IsOptional()
  @IsNumber()
  presentationOrder?: number
}
