import { seedDatabase } from '../src/lib/seed-data';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🌱 Seeding database...');
  await seedDatabase();
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
