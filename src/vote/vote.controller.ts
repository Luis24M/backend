import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { VoteService } from './vote.service'
import { VoterGuard } from '../auth/voter.guard'
import { CurrentVoter } from '../auth/voter.decorator'
import { VoterDocument } from '../schemas/voter.schema'
import { SubmitBallotDto } from './dto/submit-ballot.dto'
import { SubmitRunoffDto } from './dto/submit-runoff.dto'

@Controller('vote')
@UseGuards(VoterGuard)
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  /** Boleta unificada: vota área directiva + presidencia en una sola petición */
  @Post('ballot')
  submitBallot(
    @CurrentVoter() voter: VoterDocument,
    @Body() dto: SubmitBallotDto,
  ) {
    return this.voteService.submitBallot(voter, dto)
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
