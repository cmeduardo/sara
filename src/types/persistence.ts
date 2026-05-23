/* Tipos para datos persistidos en localStorage */

import { z } from 'zod';

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

const CellTypeSchema = z.enum(['empty', 'obstacle', 'victim', 'danger', 'station']);

const CellSchema = z.object({
  type: CellTypeSchema,
  dangerProb: z.number().min(0).max(1).optional(),
  dangerDamage: z.number().min(0).max(100).optional(),
});

const PositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const GridSizeSchema = z.union([
  z.literal(9),
  z.literal(12),
  z.literal(15),
  z.literal(18),
  z.literal(20),
]);

export const SavedMapSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  createdAt: z.number(),
  size: GridSizeSchema,
  cells: z.array(z.array(CellSchema)),
  agentStart: PositionSchema,
});

// ─── Tipos inferidos ──────────────────────────────────────────────────────────

export type SavedMap = z.infer<typeof SavedMapSchema>;
