import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  ElectionConfig,
  ElectionConfigDocument,
  ElectionStatus,
  PositionStatus,
} from '../schemas/election-config.schema'
import { Candidate, CandidateDocument, Position } from '../schemas/candidate.schema'

@Injectable()
export class ElectionService {
  constructor(
    @InjectModel(ElectionConfig.name)
    private electionConfigModel: Model<ElectionConfigDocument>,

    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
  ) {}

  async getStatus() {
    let config = await this.electionConfigModel
      .findOne()
      .select('status currentRound positionStates')
      .lean()
    if (!config) {
      // Crear config inicial si no existe
      config = await this.electionConfigModel.create({
        status: ElectionStatus.WAITING,
      })
    }
    return {
      status: config.status,
      currentRound: config.currentRound,
      positionStates: config.positionStates,
    }
  }

  async getCandidates(position: Position) {
    return this.candidateModel
      .find({ position, isApproved: true })
      .sort({ presentationOrder: 1 })
      .select('-__v')
      .lean()
  }

  async getAllApprovedCandidates() {
    return this.candidateModel
      .find({ isApproved: true })
      .sort({ position: 1, presentationOrder: 1 })
      .select('-__v')
      .lean()
  }

  /**
   * Devuelve los candidatos de un balotaje (segunda vuelta).
   * Solo aplica cuando positionStates[position] === RUNOFF.
   */
  async getRunoffCandidates(position: Position) {
    const config = await this.electionConfigModel
      .findOne()
      .select('positionStates runoffCandidates')
      .lean()
    if (
      !config ||
      config.positionStates[position] !== PositionStatus.RUNOFF
    ) {
      return []
    }

    const ids = config.runoffCandidates[position] || []
    return this.candidateModel
      .find({ _id: { $in: ids } })
      .select('-__v')
      .lean()
  }
}
