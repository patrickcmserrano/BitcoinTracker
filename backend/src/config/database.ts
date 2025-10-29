import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Prisma Client singleton
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Graceful shutdown
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log('📊 Database disconnected');
};
