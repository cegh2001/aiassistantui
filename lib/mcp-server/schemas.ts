import { z } from 'zod';

export const QuerySchema = z.object({
  sql: z.string().min(1, 'SQL query cannot be empty'),
  params: z.array(z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null()
  ])).optional(),
});

export const TableInfoSchema = z.object({
  table: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Invalid table name format'),
});

export const BatchInsertSchema = z.object({
  table: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Invalid table name format'),
  columns: z.array(z.string()).min(1, 'At least one column is required'),
  values: z.array(z.array(z.any())).min(1, 'At least one row is required'),
});

export type Query = z.infer<typeof QuerySchema>;
export type TableInfo = z.infer<typeof TableInfoSchema>;
export type BatchInsert = z.infer<typeof BatchInsertSchema>;
