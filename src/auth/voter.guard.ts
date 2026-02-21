import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Voter, VoterDocument } from '../schemas/voter.schema'

@Injectable()
export class VoterGuard implements CanActivate {
  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const auth: string = request.headers['authorization']

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de sesión requerido')
    }

    const token = auth.slice(7)
    const voter = await this.voterModel.findOne({
      sessionToken: token,
      sessionTokenExpiry: { $gt: new Date() },
    })
      .select(
        '_id dni name area isEnabled hasVotedArea hasVotedPresidency votedRound2Positions sessionTokenExpiry',
      )

    if (!voter) {
      throw new UnauthorizedException('Sesión inválida o expirada. Vuelve a ingresar.')
    }

    request.voter = voter
    return true
  }
}
