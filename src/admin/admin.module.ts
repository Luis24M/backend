import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminGuard } from './admin.guard'
import { Voter, VoterSchema } from '../schemas/voter.schema'
import { Candidate, CandidateSchema } from '../schemas/candidate.schema'
import { Vote, VoteSchema } from '../schemas/vote.schema'
import { ElectionConfig, ElectionConfigSchema } from '../schemas/election-config.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voter.name, schema: VoterSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: ElectionConfig.name, schema: ElectionConfigSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
