import { mockDb } from './mockClient';

// Use mock database for testing without PostgreSQL
// In production, use Prisma with PostgreSQL
export const prisma = mockDb as any;

export default prisma;