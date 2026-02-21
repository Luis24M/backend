import { IsString, IsNotEmpty } from 'class-validator'

/** candidateId (ObjectId string) | 'BLANK' | 'NULL' */
export class SubmitPresidencyDto {
  @IsString()
  @IsNotEmpty()
  candidateId: string
}
