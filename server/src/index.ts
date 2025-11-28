import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const PhotoStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED'
} as const;

export const CouponStatus = {
  ISSUED: 'ISSUED',
  USED: 'USED'
} as const;

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(6)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const getToday = () => new Date().toISOString().slice(0, 10);

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isInsideFestival = (
  festival: { centerLat: number | null; centerLng: number | null; radiusMeters: number | null },
  lat?: number,
  lng?: number
) => {
  if (!festival.centerLat || !festival.centerLng) return true;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  const dist = haversineDistance(lat, lng, festival.centerLat, festival.centerLng);
  const radius = festival.radiusMeters ?? 1500;
  return dist <= radius;
};

const ensureSummary = async (userId: string, festivalId: string) => {
  const date = getToday();
  return prisma.userDailySummary.upsert({
    where: { userId_festivalId_date: { userId, festivalId, date } },
    update: {},
    create: { userId, festivalId, date }
  });
};

const averageHash = async (filePath: string) => {
  const { data } = await sharp(filePath).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const values = Array.from(data);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const bits = values.map((v) => (v > avg ? 1 : 0)).join('');
  return bits;
};

const hammingDistance = (a: string, b: string) => {
  if (a.length !== b.length) return Math.max(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) dist += 1;
  }
  return dist;
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = (req.headers['x-admin-token'] as string) || (req.body && (req.body.token as string));
  const adminToken = process.env.ADMIN_TOKEN || 'admin123';
  if (token !== adminToken) {
    return res.status(401).json({ message: '관리자 인증이 필요합니다.' });
  }
  return next();
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/mock-login', async (req, res) => {
  const { nickname } = req.body as { nickname?: string };
  if (!nickname) {
    return res.status(400).json({ message: '닉네임을 입력해 주세요.' });
  }
  const user = await prisma.user.create({
    data: {
      provider: 'mock',
      providerUserId: nanoid(12),
      displayName: nickname
    }
  });
  res.json({ user });
});

app.get('/api/festivals', async (_req, res) => {
  const festivals = await prisma.festival.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ festivals });
});

app.get('/api/festivals/:festivalId', async (req, res) => {
  const { festivalId } = req.params;
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
  if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });
  const bins = await prisma.trashBin.findMany({ where: { festivalId }, orderBy: { code: 'asc' } });
  res.json({ festival, bins });
});

app.get('/api/festivals/:festivalId/trash-bins', async (req, res) => {
  const { festivalId } = req.params;
  const bins = await prisma.trashBin.findMany({ where: { festivalId }, orderBy: { code: 'asc' } });
  res.json({ bins });
});

app.get('/api/users/:userId/summary', async (req, res) => {
  const { userId } = req.params;
  const festivalId = (req.query.festivalId as string) || process.env.FESTIVAL_ID;
  if (!festivalId) return res.status(400).json({ message: 'festivalId가 필요합니다.' });
  const [festival, user] = await Promise.all([
    prisma.festival.findUnique({ where: { id: festivalId } }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);
  if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });
  if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });
  const summary = await ensureSummary(userId, festivalId);
  res.json({ festival, summary });
});

app.get('/api/users/:userId/photos', async (req, res) => {
  const { userId } = req.params;
  const festivalId = (req.query.festivalId as string) || process.env.FESTIVAL_ID;
  if (!festivalId) return res.status(400).json({ message: 'festivalId가 필요합니다.' });
  const photos = await prisma.trashPhoto.findMany({
    where: { userId, festivalId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ photos });
});

app.post('/api/festivals/:festivalId/trash-photos', upload.single('image'), async (req, res) => {
  try {
    const { festivalId } = req.params;
    const { userId, lat, lng } = req.body as { userId?: string; lat?: string; lng?: string };

    if (!userId) return res.status(400).json({ message: 'userId가 필요합니다.' });
    if (!req.file) return res.status(400).json({ message: '이미지 파일이 필요합니다.' });

    const [festival, user] = await Promise.all([
      prisma.festival.findUnique({ where: { id: festivalId } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);
    if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

    const latitude = lat ? parseFloat(lat) : undefined;
    const longitude = lng ? parseFloat(lng) : undefined;
    if (!isInsideFestival(festival, latitude, longitude)) {
      return res.status(400).json({ message: '축제장 안에서만 참여할 수 있어요.' });
    }

    const recentCount = await prisma.trashPhoto.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 1000) } }
    });
    if (recentCount >= 5) {
      return res.status(429).json({ message: '조금 쉬었다가 다시 시도해주세요.' });
    }

    const newHash = await averageHash(req.file.path);
    const recentPhotos = await prisma.trashPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8
    });
    const duplicate = recentPhotos.some((photo) => hammingDistance(photo.hash, newHash) <= 5);
    if (duplicate) {
      return res.status(400).json({ message: '같은 사진으로는 다시 적립할 수 없어요.' });
    }

    const summary = await ensureSummary(userId, festivalId);
    const photo = await prisma.trashPhoto.create({
      data: {
        userId,
        festivalId,
        imageUrl: `/uploads/${req.file.filename}`,
        hash: newHash,
        status: PhotoStatus.PENDING,
        points: festival.perPhotoPoint
      }
    });

    await prisma.userDailySummary.update({
      where: { userId_festivalId_date: { userId, festivalId, date: getToday() } },
      data: { totalPending: { increment: festival.perPhotoPoint } }
    });

    res.json({
      photo,
      summary: { ...summary, totalPending: summary.totalPending + festival.perPhotoPoint },
      message: `+${festival.perPhotoPoint}원 지급 대기 상태로 적립되었어요.`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '사진 업로드 중 오류가 발생했습니다.' });
  }
});

app.post('/api/festivals/:festivalId/trash-bins/scan', async (req, res) => {
  try {
    const { festivalId } = req.params;
    const { userId, binCode, lat, lng } = req.body as { userId?: string; binCode?: string; lat?: number; lng?: number };

    if (!userId || !binCode) return res.status(400).json({ message: 'userId와 binCode가 필요합니다.' });

    const [festival, bin, user] = await Promise.all([
      prisma.festival.findUnique({ where: { id: festivalId } }),
      prisma.trashBin.findFirst({ where: { festivalId, code: binCode } }),
      prisma.user.findUnique({ where: { id: userId } })
    ]);
    if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });
    if (!bin) return res.status(404).json({ message: '수거함을 찾을 수 없습니다.' });
    if (!user) return res.status(404).json({ message: '유저를 찾을 수 없습니다.' });

    const latitude = typeof lat === 'number' ? lat : lat ? parseFloat(String(lat)) : undefined;
    const longitude = typeof lng === 'number' ? lng : lng ? parseFloat(String(lng)) : undefined;
    if (!isInsideFestival(festival, latitude, longitude)) {
      return res.status(400).json({ message: '축제장 안에서만 참여할 수 있어요.' });
    }

    const summary = await ensureSummary(userId, festivalId);
    const remainingCap = Math.max(0, festival.perUserDailyCap - (summary.totalActive + summary.totalConsumed));
    if (remainingCap <= 0) {
      return res.status(400).json({ message: '오늘 한도가 모두 사용되었습니다.' });
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const pendingPhotos = await prisma.trashPhoto.findMany({
      where: { userId, festivalId, status: PhotoStatus.PENDING, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'asc' }
    });

    if (!pendingPhotos.length) {
      return res.status(400).json({ message: '최근 30분 내 지급 대기 포인트가 없습니다.' });
    }

    let activated = 0;
    const idsToActivate: string[] = [];
    for (const photo of pendingPhotos) {
      if (activated + photo.points > remainingCap) break;
      activated += photo.points;
      idsToActivate.push(photo.id);
    }

    if (!idsToActivate.length) {
      return res.status(400).json({ message: '오늘 한도를 모두 사용했습니다.' });
    }

    await prisma.$transaction([
      prisma.trashPhoto.updateMany({
        where: { id: { in: idsToActivate } },
        data: { status: PhotoStatus.ACTIVE }
      }),
      prisma.userDailySummary.update({
        where: { userId_festivalId_date: { userId, festivalId, date: getToday() } },
        data: { totalPending: { decrement: activated }, totalActive: { increment: activated } }
      }),
      prisma.binScan.create({ data: { binId: bin.id, festivalId, userId } })
    ]);

    res.json({
      activated,
      convertedCount: idsToActivate.length,
      binName: bin.name,
      summary: {
        totalPending: summary.totalPending - activated,
        totalActive: summary.totalActive + activated,
        totalConsumed: summary.totalConsumed,
        cap: festival.perUserDailyCap
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '포인트 전환 중 오류가 발생했습니다.' });
  }
});

app.get('/api/festivals/:festivalId/shops', (_req, res) => {
  const shops = [
    { shopName: 'OO 떡볶이', amount: 2000, description: '2,000원 이상 결제 시 2,000원 할인' },
    { shopName: 'OO 카페', amount: 3000, description: '아메리카노 포함 전체 3,000원 할인' },
    { shopName: 'OO 편의점', amount: 1500, description: '간식류 1,500원 할인' }
  ];
  res.json({ shops });
});

app.post('/api/festivals/:festivalId/coupons', async (req, res) => {
  try {
    const { festivalId } = req.params;
    const { userId, shopName, amount } = req.body as { userId?: string; shopName?: string; amount?: number };
    if (!userId || !shopName || !amount) return res.status(400).json({ message: '요청 파라미터가 부족합니다.' });

    const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
    if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });

    await ensureSummary(userId, festivalId);
    const summary = await prisma.userDailySummary.findUnique({
      where: { userId_festivalId_date: { userId, festivalId, date: getToday() } }
    });
    if (!summary) return res.status(400).json({ message: '요약 정보를 찾을 수 없습니다.' });
    if (summary.totalActive < amount) {
      return res.status(400).json({ message: '사용 가능 포인트가 부족합니다.' });
    }

    const code = `HDFEST-${amount}-${nanoid(6).toUpperCase()}`;

    const coupon = await prisma.$transaction(async (tx) => {
      await tx.userDailySummary.update({
        where: { userId_festivalId_date: { userId, festivalId, date: getToday() } },
        data: { totalActive: { decrement: amount }, totalConsumed: { increment: amount } }
      });
      return tx.coupon.create({
        data: { userId, festivalId, shopName, amount, code, status: CouponStatus.ISSUED }
      });
    });

    res.json({ coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '쿠폰 발급 중 오류가 발생했습니다.' });
  }
});

app.get('/api/users/:userId/coupons', async (req, res) => {
  const { userId } = req.params;
  const festivalId = (req.query.festivalId as string) || process.env.FESTIVAL_ID;
  if (!festivalId) return res.status(400).json({ message: 'festivalId가 필요합니다.' });
  const coupons = await prisma.coupon.findMany({
    where: { userId, festivalId },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ coupons });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password !== adminPassword) {
    return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
  }
  res.json({ token: process.env.ADMIN_TOKEN || 'admin123' });
});

app.post('/api/admin/festivals', requireAdmin, async (req, res) => {
  const { name, budget, perUserDailyCap, perPhotoPoint, centerLat, centerLng, radiusMeters } = req.body as {
    name?: string;
    budget?: number;
    perUserDailyCap?: number;
    perPhotoPoint?: number;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
  };
  if (!name || !budget || !perUserDailyCap || !perPhotoPoint) {
    return res.status(400).json({ message: '필수 필드가 누락되었습니다.' });
  }
  const festival = await prisma.festival.create({
    data: {
      name,
      budget,
      perUserDailyCap,
      perPhotoPoint,
      centerLat,
      centerLng,
      radiusMeters
    }
  });
  res.json({ festival });
});

app.post('/api/admin/festivals/:festivalId/trash-bins/generate', requireAdmin, async (req, res) => {
  const { festivalId } = req.params;
  const { count } = req.body as { count?: number | string };
  const parsedCount = typeof count === 'string' ? parseInt(count, 10) : count;
  if (!parsedCount || parsedCount <= 0) return res.status(400).json({ message: '생성할 수거함 수를 입력해 주세요.' });
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
  if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });
  const existing = await prisma.trashBin.count({ where: { festivalId } });
  const bins = Array.from({ length: parsedCount }).map((_, idx) => {
    const seq = existing + idx + 1;
    const code = `TRASH_BIN_${String(seq).padStart(2, '0')}`;
    return { code, name: `공식 수거함 #${seq}`, description: '축제 운영팀 배치', festivalId };
  });
  await prisma.trashBin.createMany({ data: bins });
  res.json({ bins });
});

app.get('/api/admin/festivals/:festivalId/summary', requireAdmin, async (req, res) => {
  const { festivalId } = req.params;
  const [festival, photos, binUsage, distinctUsers] = await Promise.all([
    prisma.festival.findUnique({ where: { id: festivalId } }),
    prisma.trashPhoto.groupBy({
      by: ['status'],
      _sum: { points: true }
    }),
    prisma.binScan.groupBy({
      by: ['binId'],
      _count: { binId: true }
    }),
    prisma.trashPhoto.findMany({ where: { festivalId }, distinct: ['userId'], select: { userId: true } })
  ]);
  if (!festival) return res.status(404).json({ message: '축제를 찾을 수 없습니다.' });

  const bins = await prisma.trashBin.findMany({ where: { festivalId } });
  const usage = binUsage.map((u) => ({
    binId: u.binId,
    count: u._count.binId,
    code: bins.find((b) => b.id === u.binId)?.code
  }));

  const pending = photos.find((p) => p.status === PhotoStatus.PENDING)?._sum.points ?? 0;
  const active = photos.find((p) => p.status === PhotoStatus.ACTIVE)?._sum.points ?? 0;

  res.json({
    festival,
    totalParticipants: distinctUsers.length,
    totalPending: pending,
    totalActive: active,
    binUsage: usage
  });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Cash Up API server running on http://localhost:${port}`);
});
