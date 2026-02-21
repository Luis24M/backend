import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { VoteService } from './vote.service'
import { VoterGuard } from '../auth/voter.guard'
import { CurrentVoter } from '../auth/voter.decorator'
import { VoterDocument } from '../schemas/voter.schema'
import { SubmitAreasDto } from './dto/submit-areas.dto'
import { SubmitPresidencyDto } from './dto/submit-presidency.dto'
import { SubmitRunoffDto } from './dto/submit-runoff.dto'

@Controller('vote')
@UseGuards(VoterGuard)
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  /** Fase 1: votar los 5 cargos directivos en una sola boleta */
  @Post('areas')
  submitAreas(
    @CurrentVoter() voter: VoterDocument,
    @Body() dto: SubmitAreasDto,
  ) {
    return this.voteService.submitAreas(voter, dto)
  }

  /** Fase 2: votar presidencia */
  @Post('presidency')
  submitPresidency(
    @CurrentVoter() voter: VoterDocument,
    @Body() dto: SubmitPresidencyDto,
  ) {
    return this.voteService.submitPresidency(voter, dto)
  }

  /** Balotaje (segunda vuelta) para cualquier cargo */
  @Post('runoff')
  submitRunoff(
    @CurrentVoter() voter: VoterDocument,
    @Body() dto: SubmitRunoffDto,
  ) {
    return this.voteService.submitRunoff(voter, dto)
  }
}
