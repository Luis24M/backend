import { IsOptional, IsBoolean, IsString } from 'class-validator'

export class UpdateVoterDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsString()
  area?: string

  @IsOptional()
  @IsString()
  email?: string
}
