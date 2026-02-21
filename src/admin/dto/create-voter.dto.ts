import { IsString, IsNotEmpty, IsOptional, IsEnum, Length } from 'class-validator'

const AREAS = ['PMO', 'GTH', 'MKT', 'LTK_FNZ', 'TI'] as const

export class CreateVoterDto {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos.' })
  dni: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  @IsEnum(AREAS, { message: 'Área inválida. Valores válidos: PMO, GTH, MKT, LTK_FNZ, TI.' })
  area: string

  @IsOptional()
  @IsString()
  email?: string
}
