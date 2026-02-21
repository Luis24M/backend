import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ElectionService } from './election.service'
import { VoterGuard } from '../auth/voter.guard'
import { Position } from '../schemas/candidate.schema'

@Controller('election')
@UseGuards(VoterGuard)
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Get('status')
  getStatus() {
    return this.electionService.getStatus()
  }

  @Get('candidates')
  getAllCandidates() {
    return this.electionService.getAllApprovedCandidates()
  }

  @Get('candidates/:position')
  getCandidates(@Param('position') position: Position) {
    return this.electionService.getCandidates(position)
  }

  @Get('runoff/:position')
  getRunoffCandidates(@Param('position') position: Position) {
    return this.electionService.getRunoffCandidates(position)
  }
}
