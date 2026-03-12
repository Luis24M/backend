import { IsString, IsNotEmpty } from 'class-validator'

/**
 * Boleta unificada: el votante envía su voto de área y presidencia en una sola petición.
 * areaCandidateId:       ObjectId del candidato de su área | 'BLANK' | 'NULL'
 * presidencyCandidateId: ObjectId del candidato a presidente | 'BLANK' | 'NULL'
 */
export class SubmitBallotDto {
  @IsString()
  @IsNotEmpty()
  areaCandidateId: string

  @IsString()
  @IsNotEmpty()
  presidencyCandidateId: string
}
