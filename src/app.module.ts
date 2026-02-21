import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from './auth/auth.module'
import { ElectionModule } from './election/election.module'
import { VoteModule } from './vote/vote.module'
import { AdminModule } from './admin/admin.module'
import { HealthController } from './health.controller'

@Module({
  controllers: [HealthController],
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/votaciones',
      {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
        maxPoolSize: 2,
      },
    ),
    AuthModule,
    ElectionModule,
    VoteModule,
    AdminModule,
  ],
})
export class AppModule {}
