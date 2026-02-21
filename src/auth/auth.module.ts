import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { VoterGuard } from './voter.guard'
import { Voter, VoterSchema } from '../schemas/voter.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Voter.name, schema: VoterSchema }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, VoterGuard],
  exports: [VoterGuard, MongooseModule],
})
export class AuthModule {}
