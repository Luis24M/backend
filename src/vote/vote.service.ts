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
import { Candidate, CandidateDocument, AREA_POSITIONS, Position } from '../schemas/candidate.schema'
import { SubmitAreasDto } from './dto/submit-areas.dto'
import { SubmitPresidencyDto } from './dto/submit-presidency.dto'
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

  // ─── Áreas (Fase 1, round 1) ──────────────────────────────────────────────

  async submitAreas(voter: VoterDocument, dto: SubmitAreasDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config || config.status !== ElectionStatus.AREAS_OPEN) {
      throw new ForbiddenException('La votación de áreas no está habilitada.')
    }

    // El área se deduce del votante — un solo voto para su área
    const position = voter.area as Position

    // Validar candidato
    const [voteEntry] = await this.resolveVoteEntries(
      { [position]: dto.candidateId },
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

        await this.voteModel.create([voteEntry], { session })
      })
    } finally {
      await session.endSession()
    }

    return { message: 'Voto de área registrado correctamente.' }
  }

  // ─── Presidencia (Fase 2) ─────────────────────────────────────────────────

  async submitPresidency(voter: VoterDocument, dto: SubmitPresidencyDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config || config.status !== ElectionStatus.PRESI_OPEN) {
      throw new ForbiddenException('La votación de presidencia no está habilitada.')
    }

    const [voteEntry] = await this.resolveVoteEntries(
      { [Position.PRESIDENCIA]: dto.candidateId },
      1,
    )

    const session = await this.voterModel.db.startSession()
    try {
      await session.withTransaction(async () => {
        const updated = await this.voterModel.findOneAndUpdate(
          {
            _id: voter._id,
            hasVotedArea: true,
            hasVotedPresidency: false,
            isEnabled: true,
          },
          { $set: { hasVotedPresidency: true } },
          { session },
        )

        if (!updated) {
          throw new ForbiddenException(
            'No puedes votar: ya votaste en presidencia, no completaste la fase de áreas o no estás habilitado.',
          )
        }

        await this.voteModel.create([voteEntry], { session })
      })
    } finally {
      await session.endSession()
    }

    return { message: 'Voto de presidencia registrado correctamente.' }
  }

  // ─── Segunda vuelta / Balotaje (round 2) ─────────────────────────────────

  async submitRunoff(voter: VoterDocument, dto: SubmitRunoffDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config) {
      throw new ForbiddenException('Configuración de elección no encontrada.')
    }

    const posState = config.positionStates?.[dto.position]
    if (posState !== PositionStatus.RUNOFF) {
      throw new ForbiddenException(
        `No hay segunda vuelta activa para ${dto.position}.`,
      )
    }

    // En balotaje de presidencia el estado general debe ser PRESI_OPEN
    const isPresidency = dto.position === Position.PRESIDENCIA
    if (isPresidency && config.status !== ElectionStatus.PRESI_OPEN) {
      throw new ForbiddenException('La votación de presidencia no está habilitada.')
    }
    if (!isPresidency && config.status !== ElectionStatus.AREAS_OPEN) {
      throw new ForbiddenException('La votación de áreas no está habilitada.')
    }

    // UC-01 Regla #4: Segmentación estricta — solo puede votar runoff de su propia área
    if (!isPresidency && voter.area !== dto.position) {
      throw new ForbiddenException(
        `No puedes votar en la segunda vuelta de ${dto.position}. Tu área es ${voter.area}.`,
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

    // Atómico: agregar posición a votedRound2Positions si no estaba
    const voterCheck = isPresidency
      ? { hasVotedPresidency: false, isEnabled: true }
      : { hasVotedArea: true, isEnabled: true }

    const session = await this.voterModel.db.startSession()
    try {
      await session.withTransaction(async () => {
        const updated = await this.voterModel.findOneAndUpdate(
          {
            _id: voter._id,
            votedRound2Positions: { $ne: dto.position },
            ...voterCheck,
          },
          { $addToSet: { votedRound2Positions: dto.position } },
          { session },
        )

        if (!updated) {
          throw new ForbiddenException(
            'Ya votaste en la segunda vuelta para este cargo o no tienes autorización.',
          )
        }

        await this.voteModel.create([voteEntry], { session })
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
        // Validar que el candidato existe y es para este cargo
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
