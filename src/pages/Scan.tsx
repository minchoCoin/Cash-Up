import { FormEvent, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useLocation } from '../hooks/useLocation';
import { useAppState } from '../state/AppStateContext';

export const ScanPage = () => {
  const { user, festival, refreshSummary, bins } = useAppState();
  const { coords, loading: locationLoading, error: locationError, locationText } = useLocation();
  const [binCode, setBinCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !festival || !binCode.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.scanBin({
        userId: user.id,
        festivalId: festival.id,
        binCode: binCode.trim(),
        lat: coords?.lat,
        lng: coords?.lng
      });
      setMessage(`공식 수거함 인증 완료! 지급 대기 ${res.activated}원 → 사용 가능 ${res.activated}원으로 전환되었습니다.`);
      await refreshSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="QR / 코드 인증" showBack>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="space-y-2">
          <p className="text-sm text-beach-navy/70">QR 코드에 적힌 번호를 입력하거나 스캔해 주세요.</p>
          <p className="text-xs text-beach-navy/60">공식 수거함 위치: {bins.length ? `${bins[0].name} 등 ${bins.length}곳` : '등록된 수거함이 없습니다.'}</p>
          <input
            className="w-full rounded-xl border border-beach-sky bg-white/80 px-4 py-3 text-beach-navy shadow-sm focus:border-beach-sea focus:outline-none"
            placeholder="예: TRASH_BIN_01"
            value={binCode}
            onChange={(e) => setBinCode(e.target.value)}
          />
          {locationError && <p className="text-xs text-rose-600">{locationError}</p>}
          <p className="text-xs text-beach-navy/60">{locationLoading ? '위치 확인 중...' : locationText}</p>
          <p className="text-xs text-beach-navy/60">축제장 내부에서만 인증 가능합니다. 가까운 수거함까지 이동 후 시도해주세요.</p>
        </Card>
        <Button type="submit" disabled={!binCode.trim() || loading}>
          {loading ? '인증 중...' : '포인트 활성화'}
        </Button>
        {message && (
          <Card className="border border-emerald-200 bg-emerald-50 text-emerald-800">
            <p className="text-sm font-semibold">{message}</p>
          </Card>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </Layout>
  );
};
