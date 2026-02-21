import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { VoteController } from './vote.controller'
import { VoteService } from './vote.service'
import { Vote, VoteSchema } from '../schemas/vote.schema'
import { Voter, VoterSchema } from '../schemas/voter.schema'
import { Candidate, CandidateSchema } from '../schemas/candidate.schema'
import { ElectionConfig, ElectionConfigSchema } from '../schemas/election-config.schema'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vote.name, schema: VoteSchema },
      { name: Voter.name, schema: VoterSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: ElectionConfig.name, schema: ElectionConfigSchema },
    ]),
    AuthModule,
  ],
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
