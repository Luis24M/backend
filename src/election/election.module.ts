import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ElectionController } from './election.controller'
import { ElectionService } from './election.service'
import { ElectionConfig, ElectionConfigSchema } from '../schemas/election-config.schema'
import { Candidate, CandidateSchema } from '../schemas/candidate.schema'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ElectionConfig.name, schema: ElectionConfigSchema },
      { name: Candidate.name, schema: CandidateSchema },
    ]),
    AuthModule,
  ],
  controllers: [ElectionController],
  providers: [ElectionService],
  exports: [ElectionService, MongooseModule],
})
export class ElectionModule {}
