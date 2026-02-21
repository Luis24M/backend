import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { VoterGuard } from './voter.guard'
import { CurrentVoter } from './voter.decorator'
import { VoterDocument } from '../schemas/voter.schema'
import { RateLimitService } from '../security/rate-limit.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('login')
  async login(@Req() req: any, @Body() dto: LoginDto) {
    await this.rateLimitService.assertWithinLimit({
      request: req,
      scope: 'auth-login-ip',
      max: 300,
      windowSeconds: 60,
    })

    await this.rateLimitService.assertWithinLimit({
      request: req,
      scope: 'auth-login-dni',
      identifier: dto.dni,
      max: 8,
      windowSeconds: 60,
    })

    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(VoterGuard)
  getMe(@CurrentVoter() voter: VoterDocument) {
    return this.authService.getMe(voter)
  }
}
