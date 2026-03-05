/**
 * Seeder de datos iniciales — ejecutar una sola vez antes de las elecciones.
 * Crea: ElectionConfig, candidatos de prueba, votantes de prueba.
 *
 * Uso: npx ts-node src/seed.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Cargar .env manualmente (sin dependencia extra)
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    })
}

import mongoose, { Schema, model } from 'mongoose'

// ─── Schemas mínimos (sin decorators NestJS) ────────────────────────────────

const VoterSchema = new Schema({
  dni:                   { type: String, required: true, unique: true },
  name:                  { type: String, required: true },
  email:                 { type: String, default: '' },
  area:                  { type: String, required: true, enum: ['PMO', 'GTH', 'MKT', 'LTK_FNZ', 'TI'] },
  isEnabled:             { type: Boolean, default: false },
  hasVotedArea:          { type: Boolean, default: false },
  votedRound2Positions:  { type: [String], default: [] },
  sessionToken:          { type: String },
  sessionTokenExpiry:    { type: Date },
})

const CandidateSchema = new Schema({
  name:       { type: String, required: true },
  photoUrl:   { type: String, default: '' },
  position:   { type: String, required: true },
  isApproved: { type: Boolean, default: false },
})

const ElectionConfigSchema = new Schema({
  status:           { type: String, default: 'WAITING' },
  currentRound:     { type: Number, default: 1 },
  positionStates:   { type: Object, default: () => ({
    PMO: 'PENDING', GTH: 'PENDING', MKT: 'PENDING',
    LTK_FNZ: 'PENDING', TI: 'PENDING', PRESIDENCIA: 'PENDING',
  })},
  runoffCandidates: { type: Object, default: () => ({}) },
})

const VoterModel        = model('Voter',          VoterSchema)
const CandidateModel    = model('Candidate',      CandidateSchema)
const ElectionConfigModel = model('ElectionConfig', ElectionConfigSchema)

// ─── Datos seed ──────────────────────────────────────────────────────────────

const VOTERS = [
  { dni: '12345678', name: 'Luis Morales García',    email: 'luis@sedipro.org',   area: 'TI' },
  { dni: '87654321', name: 'Ana Torres Ruiz',        email: 'ana@sedipro.org',    area: 'PMO' },
  { dni: '11223344', name: 'Carlos Pérez López',     email: 'carlos@sedipro.org', area: 'GTH' },
  { dni: '44332211', name: 'María Flores Vásquez',   email: 'maria@sedipro.org',  area: 'MKT' },
  { dni: '55667788', name: 'Jorge Ramírez Díaz',     email: 'jorge@sedipro.org',  area: 'LTK_FNZ' },
  { dni: '88776655', name: 'Sofía Castro Mendoza',   email: 'sofia@sedipro.org',  area: 'TI' },
]

const CANDIDATES = [
  // PMO
  { name: 'Roberto Silva Navarro',   position: 'PMO',         isApproved: true },
  { name: 'Patricia Luna Herrera',   position: 'PMO',         isApproved: true },
  // GTH
  { name: 'Eduardo Ríos Campos',     position: 'GTH',         isApproved: true },
  { name: 'Claudia Vega Torres',     position: 'GTH',         isApproved: true },
  // MKT
  { name: 'Diego Fuentes Paredes',   position: 'MKT',         isApproved: true },
  { name: 'Valeria Mora Sánchez',    position: 'MKT',         isApproved: true },
  // LTK_FNZ
  { name: 'Andrés Chávez Rojas',     position: 'LTK_FNZ',    isApproved: true },
  { name: 'Daniela Ortiz Vargas',    position: 'LTK_FNZ',    isApproved: true },
  // TI
  { name: 'Miguel Ángel Soto Díaz',  position: 'TI',          isApproved: true },
  { name: 'Fernanda Quispe León',    position: 'TI',          isApproved: true },
  // PRESIDENCIA
  { name: 'Alejandro Mendoza Cruz',  position: 'PRESIDENCIA', isApproved: true },
  { name: 'Isabella Vargas Pinto',   position: 'PRESIDENCIA', isApproved: true },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌  Falta MONGODB_URI en .env')
    process.exit(1)
  }

  console.log('🔌  Conectando a MongoDB…')
  await mongoose.connect(uri)
  console.log('✅  Conectado\n')

  // 1. ElectionConfig — solo crea si no existe ninguna
  const existingConfig = await ElectionConfigModel.findOne()
  if (existingConfig) {
    console.log('⚠️   ElectionConfig ya existe, se omite.')
  } else {
    await ElectionConfigModel.create({})
    console.log('✅  ElectionConfig creada (estado: WAITING)')
  }

  // 2. Candidatos — inserta solo los que no existan por nombre+posición
  let candidatesCreated = 0
  for (const c of CANDIDATES) {
    const exists = await CandidateModel.findOne({ name: c.name, position: c.position })
    if (!exists) {
      await CandidateModel.create(c)
      candidatesCreated++
    }
  }
  console.log(`✅  Candidatos: ${candidatesCreated} creados, ${CANDIDATES.length - candidatesCreated} ya existían`)

  // 3. Votantes — inserta solo los que no existan por DNI
  let votersCreated = 0
  for (const v of VOTERS) {
    const exists = await VoterModel.findOne({ dni: v.dni })
    if (!exists) {
      await VoterModel.create({ ...v, isEnabled: true })
      votersCreated++
    }
  }
  console.log(`✅  Votantes: ${votersCreated} creados, ${VOTERS.length - votersCreated} ya existían`)

  console.log('\n📋  Credenciales de prueba:')
  console.log('   Admin key: ver ADMIN_KEY en backend/.env')
  console.log('   DNIs de votantes:', VOTERS.map((v) => v.dni).join(' · '))

  await mongoose.disconnect()
  console.log('\n✅  Seeder completado.')
}

seed().catch((err) => {
  console.error('❌  Error en seeder:', err)
  process.exit(1)
})
