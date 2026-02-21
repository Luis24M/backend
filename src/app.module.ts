import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from './auth/auth.module'
import { ElectionModule } from './election/election.module'
import { VoteModule } from './vote/vote.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/votaciones',
      {
        // Importante para serverless: no bufferar queries cuando la conexión está caída
        bufferCommands: false,
      },
    ),
    AuthModule,
    ElectionModule,
    VoteModule,
    AdminModule,
  ],
})
export class AppModule {}
