import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { VoterGuard } from './voter.guard'
import { CurrentVoter } from './voter.decorator'
import { VoterDocument } from '../schemas/voter.schema'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(VoterGuard)
  getMe(@CurrentVoter() voter: VoterDocument) {
    return this.authService.getMe(voter)
  }
}
