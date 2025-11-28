import { useState } from 'react';
import { api } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';
import { Shop } from '../types';

export const WalletPage = () => {
  const { user, festival, summary, shops, coupons, refreshSummary, refreshCoupons } = useAppState();
  const [selected, setSelected] = useState<Shop | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIssue = async (shop: Shop) => {
    if (!user || !festival) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.issueCoupon({
        userId: user.id,
        festivalId: festival.id,
        shopName: shop.shopName,
        amount: shop.amount
      });
      setSelected(shop);
      setMessage(`쿠폰 발급 완료! 코드: ${res.coupon.code}`);
      await refreshSummary();
      await refreshCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : '쿠폰 발급에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="내 지갑" showBack>
      <div className="space-y-4">
        <Card className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-beach-navy/70">사용 가능</p>
            <p className="text-2xl font-bold text-emerald-600">{summary?.totalActive ?? 0}원</p>
          </div>
          <div>
            <p className="text-sm text-beach-navy/70">지급 대기</p>
            <p className="text-2xl font-bold text-amber-600">{summary?.totalPending ?? 0}원</p>
          </div>
          <div>
            <p className="text-sm text-beach-navy/70">오늘 상한</p>
            <p className="text-xl font-semibold text-beach-navy">
              {(summary?.cap ?? festival?.perUserDailyCap ?? 3000).toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-sm text-beach-navy/70">소진</p>
            <p className="text-xl font-semibold text-beach-navy">{summary?.totalConsumed ?? 0}원</p>
          </div>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-beach-navy">제휴 상점 쿠폰 발급</p>
          <div className="space-y-2">
            {shops.map((shop) => (
              <div key={shop.shopName} className="flex items-center justify-between rounded-xl bg-white/70 p-3">
                <div>
                  <p className="font-semibold text-beach-navy">{shop.shopName}</p>
                  <p className="text-sm text-beach-navy/70">{shop.description}</p>
                </div>
                <Button
                  className="w-auto px-3 py-2 text-sm"
                  variant="secondary"
                  onClick={() => handleIssue(shop)}
                  disabled={loading || (summary?.totalActive ?? 0) < shop.amount}
                >
                  {shop.amount.toLocaleString()}원 쿠폰
                </Button>
              </div>
            ))}
          </div>
          {shops.length === 0 && <p className="text-sm text-beach-navy/70">제휴 상점이 아직 등록되지 않았어요.</p>}
        </Card>

        {message && selected && (
          <Card className="border border-emerald-200 bg-emerald-50 text-emerald-800">
            <p className="text-sm font-semibold">{message}</p>
            <p className="text-sm">상점명: {selected.shopName}</p>
            <p className="text-xs text-beach-navy/60">카운터에 이 화면을 보여주세요.</p>
          </Card>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-beach-navy">내 쿠폰</p>
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 text-sm">
              <div>
                <p className="font-semibold text-beach-navy">{coupon.shopName}</p>
                <p className="text-xs text-beach-navy/60">{new Date(coupon.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-beach-navy">{coupon.amount.toLocaleString()}원</p>
                <p className="text-xs text-beach-navy/60">{coupon.code}</p>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <p className="text-sm text-beach-navy/70">발급된 쿠폰이 없습니다.</p>}
        </Card>
      </div>
    </Layout>
  );
};
