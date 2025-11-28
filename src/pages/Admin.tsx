import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';
import { Festival } from '../types';

type AdminSummary = {
  festival: Festival;
  totalParticipants: number;
  totalPending: number;
  totalActive: number;
  budgetUsed: number;
  budgetRemaining: number;
  binUsage: { binId: string; code?: string; count: number }[];
};

export const AdminPage = () => {
  const { festival } = useAppState();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cashup_admin_token'));
  const [password, setPassword] = useState('');
  const [newFestival, setNewFestival] = useState({
    name: '',
    budget: 5000000,
    perUserDailyCap: 3000,
    perPhotoPoint: 100,
    centerLat: 35.1587,
    centerLng: 129.1604,
    radiusMeters: 1200
  });
  const [binCount, setBinCount] = useState(3);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && festival) {
      loadSummary(festival.id, token);
    }
  }, [festival?.id, token]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.adminLogin(password);
      setToken(res.token);
      localStorage.setItem('cashup_admin_token', res.token);
      setMessage('관리자 로그인 완료');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    }
  };

  const handleCreateFestival = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await api.adminCreateFestival(newFestival, token);
      setMessage(`축제 생성: ${res.festival.name} (${res.festival.id})`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '축제 생성 실패');
    }
  };

  const handleGenerateBins = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !festival) return;
    try {
      const res = await api.adminGenerateBins(festival.id, binCount, token);
      setMessage(`${res.bins.length}개의 수거함 코드 생성 완료`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수거함 생성 실패');
    }
  };

  const loadSummary = async (festivalId: string, adminToken: string) => {
    try {
      const res = await api.adminSummary(festivalId, adminToken);
      setSummary(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요약 조회 실패');
    }
  };

  return (
    <Layout title="관리자" showBack>
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-beach-navy">관리자 로그인</p>
          <form onSubmit={handleLogin} className="flex gap-2">
            <input
              type="password"
              className="flex-1 rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
              placeholder="admin123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-auto px-3 py-2 text-sm">
              로그인
            </Button>
          </form>
          {token && <p className="text-xs text-beach-navy/60">토큰 저장됨</p>}
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-beach-navy">축제 생성</p>
          <form onSubmit={handleCreateFestival} className="space-y-2">
            <input
              className="w-full rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
              placeholder="축제 이름"
              value={newFestival.name}
              onChange={(e) => setNewFestival({ ...newFestival, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="예산"
                value={newFestival.budget}
                onChange={(e) => setNewFestival({ ...newFestival, budget: Number(e.target.value) })}
              />
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="1인 상한"
                value={newFestival.perUserDailyCap}
                onChange={(e) => setNewFestival({ ...newFestival, perUserDailyCap: Number(e.target.value) })}
              />
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="1장당 포인트"
                value={newFestival.perPhotoPoint}
                onChange={(e) => setNewFestival({ ...newFestival, perPhotoPoint: Number(e.target.value) })}
              />
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="반경(m)"
                value={newFestival.radiusMeters}
                onChange={(e) => setNewFestival({ ...newFestival, radiusMeters: Number(e.target.value) })}
              />
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="위도"
                value={newFestival.centerLat}
                onChange={(e) => setNewFestival({ ...newFestival, centerLat: Number(e.target.value) })}
              />
              <input
                type="number"
                className="rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
                placeholder="경도"
                value={newFestival.centerLng}
                onChange={(e) => setNewFestival({ ...newFestival, centerLng: Number(e.target.value) })}
              />
            </div>
            <Button type="submit" disabled={!token}>
              축제 등록
            </Button>
          </form>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-beach-navy">수거함 코드 생성</p>
          <form onSubmit={handleGenerateBins} className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 rounded-xl border border-beach-sky bg-white/80 px-3 py-2 text-beach-navy focus:border-beach-sea focus:outline-none"
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
            />
            <Button type="submit" className="w-auto px-3 py-2 text-sm" disabled={!token || !festival}>
              생성
            </Button>
          </form>
          <p className="text-xs text-beach-navy/60">현재 축제: {festival?.name ?? '없음'} ({festival?.id ?? 'ID 없음'})</p>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-beach-navy">실시간 대시보드</p>
          {summary ? (
            <div className="space-y-2">
              <p className="text-sm text-beach-navy/80">참여 인원: {summary.totalParticipants}명</p>
              <p className="text-sm text-beach-navy/80">총 PENDING: {summary.totalPending}원</p>
              <p className="text-sm text-beach-navy/80">총 ACTIVE: {summary.totalActive}원</p>
              <p className="text-sm text-beach-navy/80">
                예산 사용: {summary.budgetUsed.toLocaleString()} / {summary.festival.budget.toLocaleString()}원 (잔여{' '}
                {summary.budgetRemaining.toLocaleString()}원)
              </p>
              <div className="space-y-1">
                <p className="text-xs text-beach-navy/60">QR별 이용량</p>
                {summary.binUsage.map((item) => (
                  <div key={item.binId} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-beach-navy">
                    {item.code ?? item.binId}: {item.count}회
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-beach-navy/70">요약을 보려면 관리자 로그인 후 축제를 선택하세요.</p>
          )}
          {token && festival && (
            <Button
              variant="secondary"
              className="w-auto px-3 py-2 text-sm"
              onClick={() => loadSummary(festival.id, token)}
            >
              새로고침
            </Button>
          )}
        </Card>

        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Layout>
  );
};
