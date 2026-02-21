import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomBytes } from 'crypto'
import { Voter, VoterDocument } from '../schemas/voter.schema'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
  ) {}

  async login(dto: LoginDto) {
    const voter = await this.voterModel.findOne({ dni: dto.dni })

    if (!voter) {
      throw new NotFoundException('DNI no encontrado. Verifica que estés registrado.')
    }

    if (!voter.isEnabled) {
      throw new ForbiddenException('Tu cuenta no está habilitada para votar.')
    }

    // Generar token de sesión válido por 12 horas
    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 12 * 60 * 60 * 1000)

    await this.voterModel.updateOne(
      { _id: voter._id },
      { $set: { sessionToken: token, sessionTokenExpiry: expiry } },
    )

    return {
      token,
      voter: {
        dni: voter.dni,
        name: voter.name,
        area: voter.area,
        hasVotedArea: voter.hasVotedArea,
        hasVotedPresidency: voter.hasVotedPresidency,
        votedRound2Positions: voter.votedRound2Positions,
      },
    }
  }

  async getMe(voter: VoterDocument) {
    return {
      dni: voter.dni,
      name: voter.name,
      area: voter.area,
      hasVotedArea: voter.hasVotedArea,
      hasVotedPresidency: voter.hasVotedPresidency,
      votedRound2Positions: voter.votedRound2Positions,
    }
  }
}
