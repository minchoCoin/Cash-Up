import { useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../api';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';
import { TrashPhoto } from '../types';

const statusLabel: Record<TrashPhoto['status'], { label: string; color: string }> = {
  PENDING: { label: '지급 대기', color: 'bg-amber-100 text-amber-800' },
  ACTIVE: { label: '사용 가능', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: '반려', color: 'bg-rose-100 text-rose-700' }
};

export const ActivityPage = () => {
  const { user, festival } = useAppState();
  const [photos, setPhotos] = useState<TrashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = async () => {
    if (!user || !festival) return;
    setLoading(true);
    try {
      const list = await api.getPhotos(user.id, festival.id);
      setPhotos(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '활동 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [user?.id, festival?.id]);

  return (
    <Layout title="내 활동" showBack>
      <div className="space-y-3">
        {loading && <p className="text-sm text-beach-navy/70">불러오는 중...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && photos.length === 0 && <p className="text-sm text-beach-navy/70">아직 인증한 사진이 없어요.</p>}
        {photos.map((photo) => {
          const status = statusLabel[photo.status];
          return (
            <Card key={photo.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-beach-navy/70">
                  {new Date(photo.createdAt).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-beach-navy">{photo.points}원</p>
                <p className="text-xs text-beach-navy/60">최근 30분 내 인증된 사진만 전환돼요</p>
              </div>
              <div className="text-xs text-beach-navy/70">
                YOLO 분석: {photo.trashCount ?? '—'}개 감지 {photo.hasTrash === false ? '(쓰레기 없음으로 추정)' : ''}
              </div>
              <img src={resolveImageUrl(photo.imageUrl)} alt="trash" className="h-36 w-full rounded-xl object-cover shadow" />
            </Card>
          );
        })}
      </div>
    </Layout>
  );
};
