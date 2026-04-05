import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('🔄 Aligning database identities...');
  
  try {
    // 1. Rename analyst1 to analyst for convenience
    await prisma.user.updateMany({
      where: { email: 'analyst1@zorvyn.io' },
      data: { email: 'analyst@zorvyn.io' }
    });
    console.log(' ✓ Analyst: analyst@zorvyn.io (Mapped)');

    // 2. Rename viewer1 to viewer for convenience
    await prisma.user.updateMany({
      where: { email: 'viewer1@zorvyn.io' },
      data: { email: 'viewer@zorvyn.io' }
    });
    console.log(' ✓ Viewer: viewer@zorvyn.io (Mapped)');

    console.log('✅ Synchronization complete!');
  } catch (error) {
    console.error('❌ Synchronizer failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
