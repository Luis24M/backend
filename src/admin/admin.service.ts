import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as XLSX from 'xlsx'
import { Voter, VoterDocument } from '../schemas/voter.schema'
import { Candidate, CandidateDocument, Position, AREA_POSITIONS, POSITION_LABELS } from '../schemas/candidate.schema'
import { Vote, VoteDocument, VoteType } from '../schemas/vote.schema'
import {
  ElectionConfig,
  ElectionConfigDocument,
  ElectionStatus,
  PositionStatus,
} from '../schemas/election-config.schema'
import { CreateCandidateDto } from './dto/create-candidate.dto'
import { CreateVoterDto } from './dto/create-voter.dto'
import { UpdateVoterDto } from './dto/update-voter.dto'
import { UpdateElectionStatusDto, UpdatePositionStateDto } from './dto/update-election.dto'

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Voter.name) private voterModel: Model<VoterDocument>,
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
    @InjectModel(ElectionConfig.name)
    private electionConfigModel: Model<ElectionConfigDocument>,
  ) {}

  // ─── Elección ─────────────────────────────────────────────────────────────

  async getElectionConfig() {
    let config = await this.electionConfigModel
      .findOne()
      .select('status currentRound positionStates runoffCandidates')
      .lean()
    if (!config) {
      config = await this.electionConfigModel.create({
        status: ElectionStatus.WAITING,
      })
    }
    return config
  }

  async updateElectionStatus(dto: UpdateElectionStatusDto) {
    let config = await this.electionConfigModel.findOne()
    if (!config) {
      config = await this.electionConfigModel.create({ status: dto.status })
    } else {
      config.status = dto.status
      await config.save()
    }
    return config
  }

  async updatePositionState(dto: UpdatePositionStateDto) {
    const config = await this.electionConfigModel.findOne()
    if (!config) throw new NotFoundException('Configuración no encontrada.')

    if (dto.state === PositionStatus.RUNOFF) {
      if (!dto.runoffCandidateIds || dto.runoffCandidateIds.length !== 2) {
        throw new BadRequestException(
          'Se requieren exactamente 2 IDs de candidatos para activar segunda vuelta.',
        )
      }
      // Verificar que los candidatos existen y son del cargo correcto
      const count = await this.candidateModel.countDocuments({
        _id: { $in: dto.runoffCandidateIds },
        position: dto.position,
      })
      if (count !== 2) {
        throw new BadRequestException(
          'Los candidatos del balotaje no son válidos para este cargo.',
        )
      }
      config.runoffCandidates = {
        ...config.runoffCandidates,
        [dto.position]: dto.runoffCandidateIds,
      }
    }

    config.positionStates = {
      ...config.positionStates,
      [dto.position]: dto.state,
    }

    await config.save()
    return config
  }

  // ─── Votantes ─────────────────────────────────────────────────────────────

  async getVoters() {
    return this.voterModel
      .find()
      .sort({ name: 1 })
      .select('-sessionToken -sessionTokenExpiry -__v')
      .lean()
  }

  async createVoter(dto: CreateVoterDto) {
    const existing = await this.voterModel.findOne({ dni: dto.dni })
    if (existing) {
      throw new BadRequestException(`Ya existe un votante con DNI ${dto.dni}.`)
    }
    return this.voterModel.create({
      dni: dto.dni,
      name: dto.name,
      area: dto.area as Position,
      email: dto.email ?? '',
      isEnabled: false,
      hasVotedArea: false,
      hasVotedPresidency: false,
      votedRound2Positions: [],
    })
  }

  async updateVoter(dni: string, dto: UpdateVoterDto) {
    const voter = await this.voterModel.findOneAndUpdate(
      { dni },
      { $set: dto },
      { new: true, runValidators: true },
    )
      .select('-sessionToken -sessionTokenExpiry -__v')
      .lean()
    if (!voter) throw new NotFoundException(`Votante con DNI ${dni} no encontrado.`)
    return voter
  }

  async enableAllVoters() {
    const result = await this.voterModel.updateMany(
      { isEnabled: false },
      { $set: { isEnabled: true } },
    )

    return {
      enabled: result.modifiedCount,
      message: 'Votantes habilitados correctamente.',
    }
  }

  async importVoters(buffer: Buffer) {
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch {
      throw new BadRequestException('Archivo Excel inválido.')
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

    // Saltar fila de encabezado, filtrar filas vacías
    const voters = rows
      .slice(1)
      .filter((row) => row[0] && row[1])
      .map((row) => ({
        dni: String(row[0]).trim(),
        name: String(row[1]).trim(),
        email: row[2] ? String(row[2]).trim() : '',
        area: row[3] ? String(row[3]).trim() : '',
      }))

    if (voters.length === 0) {
      throw new BadRequestException(
        'El archivo no contiene datos. Formato esperado: A = DNI, B = Nombre, C = Email, D = Área.',
      )
    }

    const validAreas = ['PMO', 'GTH', 'MKT', 'LTK_FNZ', 'TI']
    for (const v of voters) {
      if (!validAreas.includes(v.area)) {
        throw new BadRequestException(
          `Área inválida "${v.area}" para DNI ${v.dni}. Valores válidos: ${validAreas.join(', ')}`,
        )
      }
    }

    const ops = voters.map((v) => ({
      updateOne: {
        filter: { dni: v.dni },
        update: {
          $set: { name: v.name, email: v.email, area: v.area as Position },
          $setOnInsert: {
            isEnabled: false,
            hasVotedArea: false,
            hasVotedPresidency: false,
            votedRound2Positions: [],
          },
        },
        upsert: true,
      },
    }))

    await this.voterModel.bulkWrite(ops)
    return { imported: voters.length }
  }

  async resetVotes() {
    await this.voterModel.updateMany(
      {},
      {
        $set: {
          hasVotedArea: false,
          hasVotedPresidency: false,
          votedRound2Positions: [],
          sessionToken: null,
          sessionTokenExpiry: null,
        },
      },
    )
    await this.voteModel.deleteMany({})
    return { message: 'Votos y sesiones reseteados.' }
  }

  // ─── Candidatos ───────────────────────────────────────────────────────────

  async getCandidates() {
    return this.candidateModel
      .find()
      .sort({ position: 1, presentationOrder: 1 })
      .select('-__v')
      .lean()
  }

  async createCandidate(dto: CreateCandidateDto) {
    return this.candidateModel.create(dto)
  }

  async updateCandidate(id: string, dto: Partial<CreateCandidateDto>) {
    const candidate = await this.candidateModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    )
    if (!candidate) throw new NotFoundException(`Candidato ${id} no encontrado.`)
    return candidate
  }

  async deleteCandidate(id: string) {
    const candidate = await this.candidateModel.findByIdAndDelete(id)
    if (!candidate) throw new NotFoundException(`Candidato ${id} no encontrado.`)
    return { message: 'Candidato eliminado.' }
  }

  // ─── Resultados ───────────────────────────────────────────────────────────

  async getResults() {
    const allPositions = [...AREA_POSITIONS, Position.PRESIDENCIA]
    const results: Record<string, any> = {}

    // Estadísticas de participación
    const [totalPadron, totalEligible, totalVotedAreas, totalVotedPresidency] =
      await Promise.all([
        this.voterModel.countDocuments(),
        this.voterModel.countDocuments({ isEnabled: true }),
        this.voterModel.countDocuments({ hasVotedArea: true }),
        this.voterModel.countDocuments({ hasVotedPresidency: true }),
      ])

    // UC-02: Quórum de presidencia — nulidad si votaron <= mitad del padrón
    const presidencyQuorumVoid = totalVotedPresidency <= Math.floor(totalPadron / 2)

    const positionEntries = await Promise.all(
      allPositions.map(async (position) => {
        const [r1Votes, r2Votes, candidates] = await Promise.all([
          this.voteModel
            .find({ position, round: 1 })
            .select('voteType candidateId')
            .lean(),
          this.voteModel
            .find({ position, round: 2 })
            .select('voteType candidateId')
            .lean(),
          this.candidateModel
            .find({ position })
            .select('name photoUrl isApproved')
            .lean(),
        ])

        const isPresidency = position === Position.PRESIDENCIA
        const r1Result = this.computeRound(r1Votes, candidates, false)
        const r2Result = r2Votes.length > 0
          ? this.computeRound(r2Votes, candidates, true)
          : null

        return [
          position,
          {
            label: POSITION_LABELS[position],
            candidates,
            round1: r1Result,
            round2: r2Result,
            ...(isPresidency && totalVotedPresidency > 0 && {
              quorumVoid: presidencyQuorumVoid,
              quorumDetail: {
                totalPadron,
                votosEmitidos: totalVotedPresidency,
                umbral: Math.floor(totalPadron / 2) + 1,
              },
            }),
          },
        ] as const
      }),
    )

    for (const [position, data] of positionEntries) {
      results[position] = data
    }

    return {
      participation: {
        totalPadron,
        eligible: totalEligible,
        votedAreas: totalVotedAreas,
        votedPresidency: totalVotedPresidency,
      },
      positions: results,
    }
  }

  async getPositionResults(position: Position) {
    const [r1Votes, r2Votes, candidates] = await Promise.all([
      this.voteModel
        .find({ position, round: 1 })
        .select('voteType candidateId')
        .lean(),
      this.voteModel
        .find({ position, round: 2 })
        .select('voteType candidateId')
        .lean(),
      this.candidateModel
        .find({ position })
        .select('name photoUrl')
        .lean(),
    ])

    return {
      position,
      label: POSITION_LABELS[position],
      candidates,
      round1: this.computeRound(r1Votes, candidates, false),
      round2: r2Votes.length > 0 ? this.computeRound(r2Votes, candidates, true) : null,
    }
  }

  private computeRound(
    votes: Array<{ voteType: VoteType; candidateId: any }>,
    candidates: any[],
    isSecondRound = false,
  ) {
    const total = votes.length
    if (total === 0) return {
      total: 0, blank: 0, null: 0, valid: 0, perCandidate: {},
      isVoid: false, winner: null, needsRunoff: false,
      secondRoundTie: false, tiebreakMessage: null,
    }

    const blank = votes.filter((v) => v.voteType === VoteType.BLANK).length
    const nullCount = votes.filter((v) => v.voteType === VoteType.NULL).length
    const valid = votes.filter((v) => v.voteType === VoteType.VALID).length

    // UC-03: Nulidad si blancos+nulos > 2/3 del total de votos emitidos
    const isVoid = blank + nullCount > (2 / 3) * total

    // Conteo por candidato
    const perCandidate: Record<string, number> = {}
    for (const v of votes) {
      if (v.voteType === VoteType.VALID && v.candidateId) {
        const id = v.candidateId.toString()
        perCandidate[id] = (perCandidate[id] || 0) + 1
      }
    }

    // Enriquecer con nombres
    const perCandidateNamed: Record<string, { name: string; votes: number }> = {}
    for (const c of candidates) {
      const id = c._id.toString()
      perCandidateNamed[id] = { name: c.name, votes: perCandidate[id] || 0 }
    }

    // UC-04: Mayoría absoluta = 50% + 1 de votos válidos
    const majority = Math.floor(valid / 2) + 1
    const sorted = Object.entries(perCandidate).sort(([, a], [, b]) => b - a)

    let winner: string | null = null
    let needsRunoff = false
    let top2: string[] = []
    let secondRoundTie = false
    let tiebreakMessage: string | null = null

    if (!isVoid && sorted.length > 0) {
      const hasFirstPlaceTie = sorted.length >= 2 && sorted[0][1] === sorted[1][1]

      if (hasFirstPlaceTie) {
        // UC-04 regla 2: Empate en primer lugar → segunda vuelta (sin importar si alcanza mayoría)
        if (isSecondRound) {
          // UC-05: Empate en segunda vuelta — requiere intervención manual
          secondRoundTie = true
          top2 = [sorted[0][0], sorted[1][0]]
        } else {
          needsRunoff = true
          top2 = [sorted[0][0], sorted[1][0]]
        }
      } else {
        const [topId, topCount] = sorted[0]
        if (topCount >= majority) {
          // UC-04 regla 1: Ganador absoluto
          winner = topId
        } else {
          // UC-04 regla 3: Nadie alcanza mayoría → segunda vuelta con top 2
          needsRunoff = true
          top2 = sorted.slice(0, 2).map(([id]) => id)
        }
      }
    }

    // UC-05: Mensaje de desempate según tipo de cargo
    if (secondRoundTie) {
      // Se determina en el frontend según si es presidencia o área,
      // pero incluimos el flag para que el admin sepa que hay empate.
      tiebreakMessage =
        'Empate en segunda vuelta. Se requiere intervención manual del Comité Electoral.'
    }

    return {
      total,
      blank,
      null: nullCount,
      valid,
      perCandidate: perCandidateNamed,
      isVoid,
      winner,
      needsRunoff,
      top2,
      majority,
      secondRoundTie,
      tiebreakMessage,
    }
  }
}
