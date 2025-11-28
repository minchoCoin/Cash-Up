import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.festival.findFirst({ where: { name: '해운대 불꽃축제' } });

  const festival =
    existing ??
    (await prisma.festival.create({
      data: {
        name: '해운대 불꽃축제',
        budget: 5_000_000,
        perUserDailyCap: 3000,
        perPhotoPoint: 100,
        centerLat: 35.1587,
        centerLng: 129.1604,
        radiusMeters: 1200
      }
    }));

  const existingBins = await prisma.trashBin.count({ where: { festivalId: festival.id } });
  if (existingBins === 0) {
    const bins = [
      { code: 'TRASH_BIN_01', name: '중앙무대 옆', description: '바다 방향 메인 무대 왼편' },
      { code: 'TRASH_BIN_02', name: '해운대역 출구 인근', description: '해운대역 3번 출구' },
      { code: 'TRASH_BIN_03', name: '광안대교 뷰 포토존', description: '포토존 안내판 옆' }
    ];
    await prisma.trashBin.createMany({
      data: bins.map((bin) => ({ ...bin, festivalId: festival.id }))
    });
  }

  console.log('Seed completed. Festival id:', festival.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
