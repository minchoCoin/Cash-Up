import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { festival, summary, user } = useAppState();

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  const capText = festival ? `${festival.perUserDailyCap.toLocaleString()}원` : '3,000원';

  return (
    <Layout className="pt-10">
      <div className="space-y-8">
        <div className="rounded-3xl bg-gradient-to-br from-beach-sea via-beach-mint to-beach-sky p-6 text-white shadow-xl">
          <p className="text-sm font-semibold">해운대 불꽃축제 X 캐시업</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">쓰레기 줍고 인증하면 지역 포인트 지급</h1>
          <p className="mt-3 text-sm text-white/90">수거함 QR까지 찍으면 PENDING이 ACTIVE로 전환돼요.</p>
          <div className="mt-6 flex gap-2">
            <div className="rounded-2xl bg-white/20 px-3 py-2 text-xs">1장당 {festival?.perPhotoPoint ?? 100}원</div>
            <div className="rounded-2xl bg-white/20 px-3 py-2 text-xs">1인 1일 최대 {capText}</div>
          </div>
          <Button className="mt-6" onClick={() => navigate('/login')}>
            청소하고 리워드 받기 시작
          </Button>
        </div>

        <div className="space-y-3">
          <Card className="space-y-2">
            <p className="text-sm text-beach-navy/80">참여 방법</p>
            <ul className="space-y-2 text-sm text-beach-navy">
              <li>1) 로그인 후 카메라로 지금 바로 촬영 → 지급 대기(PENDING) 포인트 적립</li>
              <li>2) 공식 수거함 QR을 찍으면 ACTIVE 포인트로 전환 (축제장 내부에서만 가능)</li>
              <li>3) ACTIVE 포인트로 제휴 상점 쿠폰 발급</li>
            </ul>
            <p className="text-xs text-beach-navy/60">위치정보는 축제장 내 참여 여부 확인용으로만 사용돼요.</p>
          </Card>
          {summary && (
            <Card className="flex justify-between">
              <div>
                <p className="text-sm text-beach-navy/70">오늘 적립 대기</p>
                <p className="text-lg font-bold text-beach-navy">{summary.totalPending}원</p>
              </div>
              <div>
                <p className="text-sm text-beach-navy/70">사용 가능</p>
                <p className="text-lg font-bold text-emerald-700">{summary.totalActive}원</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};
