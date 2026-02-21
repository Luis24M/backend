import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AdminService } from './admin.service'
import { AdminGuard } from './admin.guard'
import { CreateCandidateDto } from './dto/create-candidate.dto'
import { CreateVoterDto } from './dto/create-voter.dto'
import { UpdateVoterDto } from './dto/update-voter.dto'
import { UpdateElectionStatusDto, UpdatePositionStateDto } from './dto/update-election.dto'
import { Position } from '../schemas/candidate.schema'

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Elección ─────────────────────────────────────────────────────────────

  @Get('election')
  getElectionConfig() {
    return this.adminService.getElectionConfig()
  }

  @Patch('election/status')
  updateElectionStatus(@Body() dto: UpdateElectionStatusDto) {
    return this.adminService.updateElectionStatus(dto)
  }

  @Patch('election/position')
  updatePositionState(@Body() dto: UpdatePositionStateDto) {
    return this.adminService.updatePositionState(dto)
  }

  // ─── Votantes ─────────────────────────────────────────────────────────────

  @Get('voters')
  getVoters() {
    return this.adminService.getVoters()
  }

  @Post('voters')
  createVoter(@Body() dto: CreateVoterDto) {
    return this.adminService.createVoter(dto)
  }

  @Patch('voters/:dni')
  updateVoter(@Param('dni') dni: string, @Body() dto: UpdateVoterDto) {
    return this.adminService.updateVoter(dni, dto)
  }

  @Post('voters/enable-all')
  enableAllVoters() {
    return this.adminService.enableAllVoters()
  }

  @Post('voters/import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
    }),
  )
  importVoters(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Se requiere un archivo Excel.')
    return this.adminService.importVoters(file.buffer)
  }

  /** Resetear votos (solo para pruebas / contingencia) */
  @Post('voters/reset-votes')
  resetVotes() {
    return this.adminService.resetVotes()
  }

  // ─── Candidatos ───────────────────────────────────────────────────────────

  @Get('candidates')
  getCandidates() {
    return this.adminService.getCandidates()
  }

  @Post('candidates')
  createCandidate(@Body() dto: CreateCandidateDto) {
    return this.adminService.createCandidate(dto)
  }

  @Patch('candidates/:id')
  updateCandidate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCandidateDto>,
  ) {
    return this.adminService.updateCandidate(id, dto)
  }

  @Delete('candidates/:id')
  deleteCandidate(@Param('id') id: string) {
    return this.adminService.deleteCandidate(id)
  }

  // ─── Resultados ───────────────────────────────────────────────────────────

  @Get('results')
  getResults() {
    return this.adminService.getResults()
  }

  @Get('results/:position')
  getPositionResults(@Param('position') position: Position) {
    return this.adminService.getPositionResults(position)
  }
}
