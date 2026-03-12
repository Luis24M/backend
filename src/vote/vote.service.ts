import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Voter, VoterDocument } from '../schemas/voter.schema'
import { Vote, VoteDocument, VoteType } from '../schemas/vote.schema'
import {
  ElectionConfig,
  ElectionConfigDocument,
  ElectionStatus,
  PositionStatus,
} from '../schemas/election-config.schema'
import { Candidate, CandidateDocument, Position } from '../schemas/candidate.schema'
import { SubmitBallotDto } from './dto/submit-ballot.dto'
import { SubmitRunoffDto } from './dto/submit-runoff.dto'

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
    @InjectModel(ElectionConfig.name)
    private electionConfigModel: Model<ElectionConfigDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
  ) {}

  // ─── Boleta unificada (área + presidencia simultáneos) ────────────────────

  async submitBallot(voter: VoterDocument, dto: SubmitBallotDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config || config.status !== ElectionStatus.OPEN) {
      throw new ForbiddenException('La votación no está habilitada.')
    }

    const voteEntries = await this.resolveVoteEntries(
      {
        [Position.PMO]: dto.pmoCandidateId,
        [Position.GTH]: dto.gthCandidateId,
        [Position.MKT]: dto.mktCandidateId,
        [Position.LTK_FNZ]: dto.ltkFnzCandidateId,
        [Position.TI]: dto.tiCandidateId,
        [Position.PRESIDENCIA]: dto.presidencyCandidateId,
      },
      1,
    )

    const session = await this.voterModel.db.startSession()
    try {
      await session.withTransaction(async () => {
        const updated = await this.voterModel.findOneAndUpdate(
          {
            _id: voter._id,
            hasVotedArea: false,
            isEnabled: true,
          },
          { $set: { hasVotedArea: true } },
          { session },
        )

        if (!updated) {
          throw new ForbiddenException(
            'No puedes votar: ya registraste tu voto o no estás habilitado.',
          )
        }

        await this.voteModel.create(voteEntries, { session, ordered: true })
      })
    } finally {
      await session.endSession()
    }

    return { message: 'Voto registrado correctamente.' }
  }

  // ─── Segunda vuelta / Balotaje (round 2) ─────────────────────────────────

  async submitRunoff(voter: VoterDocument, dto: SubmitRunoffDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config || config.status !== ElectionStatus.OPEN) {
      throw new ForbiddenException('La votación no está habilitada.')
    }

    const posState = config.positionStates?.[dto.position]
    if (posState !== PositionStatus.RUNOFF) {
      throw new ForbiddenException(
        `No hay segunda vuelta activa para ${dto.position}.`,
      )
    }

    // El votante debe haber completado la boleta de primera vuelta
    if (!voter.hasVotedArea) {
      throw new ForbiddenException(
        'Debes haber emitido tu voto en primera vuelta para participar en el balotaje.',
      )
    }

    // Validar candidato (solo los 2 finalistas son válidos en balotaje)
    const runoffIds = config.runoffCandidates?.[dto.position] || []
    if (
      dto.candidateId !== 'BLANK' &&
      dto.candidateId !== 'NULL' &&
      !runoffIds.includes(dto.candidateId)
    ) {
      throw new BadRequestException('Candidato no válido para esta segunda vuelta.')
    }

    const [voteEntry] = await this.resolveVoteEntries(
      { [dto.position]: dto.candidateId },
      2,
    )

    const session = await this.voterModel.db.startSession()
    try {
      await session.withTransaction(async () => {
        const updated = await this.voterModel.findOneAndUpdate(
          {
            _id: voter._id,
            hasVotedArea: true,
            isEnabled: true,
            votedRound2Positions: { $ne: dto.position },
          },
          { $addToSet: { votedRound2Positions: dto.position } },
          { session },
        )

        if (!updated) {
          throw new ForbiddenException(
            'Ya votaste en la segunda vuelta para este cargo o no tienes autorización.',
          )
        }

        await this.voteModel.create([voteEntry], { session, ordered: true })
      })
    } finally {
      await session.endSession()
    }

    return { message: `Voto de segunda vuelta para ${dto.position} registrado.` }
  }

  // ─── Helper: resolver entradas de voto ───────────────────────────────────

  private async resolveVoteEntries(
    votes: Record<string, string>,
    round: number,
  ): Promise<Partial<Vote>[]> {
    const entries: Partial<Vote>[] = []

    for (const [position, value] of Object.entries(votes)) {
      if (value === 'BLANK') {
        entries.push({
          position: position as Position,
          candidateId: null,
          voteType: VoteType.BLANK,
          round,
        })
      } else if (value === 'NULL') {
        entries.push({
          position: position as Position,
          candidateId: null,
          voteType: VoteType.NULL,
          round,
        })
      } else {
        if (!Types.ObjectId.isValid(value)) {
          throw new BadRequestException(
            `ID de candidato inválido para ${position}.`,
          )
        }
        const candidate = await this.candidateModel.findOne({
          _id: value,
          position,
          isApproved: true,
        })
        if (!candidate) {
          throw new BadRequestException(
            `Candidato no válido para el cargo ${position}.`,
          )
        }
        entries.push({
          position: position as Position,
          candidateId: new Types.ObjectId(value),
          voteType: VoteType.VALID,
          round,
        })
      }
    }

    return entries
  }
}
