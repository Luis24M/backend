import { IsString, IsNotEmpty } from 'class-validator'

/**
 * Boleta unificada: el votante envía su voto para los 6 cargos en una sola petición.
 * Cada campo acepta: ObjectId del candidato | 'BLANK' | 'NULL'
 */
export class SubmitBallotDto {
  @IsString()
  @IsNotEmpty()
  pmoCandidateId: string

  @IsString()
  @IsNotEmpty()
  gthCandidateId: string

  @IsString()
  @IsNotEmpty()
  mktCandidateId: string

  @IsString()
  @IsNotEmpty()
  ltkFnzCandidateId: string

  @IsString()
  @IsNotEmpty()
  tiCandidateId: string

  @IsString()
  @IsNotEmpty()
  presidencyCandidateId: string
}
