import { IsString, IsNotEmpty } from 'class-validator'

/**
 * candidateId: ObjectId string del candidato, 'BLANK' o 'NULL'.
 * El área se deduce del voter.area en el backend.
 */
export class SubmitAreasDto {
  @IsString()
  @IsNotEmpty()
  candidateId: string
}
