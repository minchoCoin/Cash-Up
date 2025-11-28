import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useLocation } from '../hooks/useLocation';
import { useAppState } from '../state/AppStateContext';

export const MissionUploadPage = () => {
  const navigate = useNavigate();
  const { user, festival, refreshSummary } = useAppState();
  const { coords, loading: locationLoading, error: locationError, locationText } = useLocation();
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!user || !festival) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setMessage(null);
    setError(null);
    try {
      setUploading(true);
      const res = await api.uploadPhoto({
        userId: user.id,
        festivalId: festival.id,
        file,
        lat: coords?.lat,
        lng: coords?.lng
      });
      setMessage(res.message);
      await refreshSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 문제가 발생했어요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="쓰레기 촬영" showBack>
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-sm text-beach-navy/70">
            바닥에 떨어진 쓰레기가 잘 보이도록 지금 이 화면에서 촬영해주세요. 갤러리/인터넷 이미지 재업로드는
            허용되지 않습니다.
          </p>
          <p className="text-xs text-beach-navy/60">같은 사진 반복 업로드 또는 과도한 연사는 제한됩니다.</p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-beach-sky bg-white/70 px-4 py-8 text-beach-navy shadow-sm active:scale-[0.99]">
            <span className="text-sm font-semibold">카메라로 찍기</span>
            <span className="text-xs text-beach-navy/60">실시간 촬영만 허용</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          </label>
          {locationError && <p className="text-xs text-rose-600">{locationError}</p>}
          <p className="text-xs text-beach-navy/60">{locationLoading ? '위치 확인 중...' : locationText}</p>
        </Card>

        {preview && (
          <Card className="space-y-2">
            <p className="text-sm text-beach-navy/70">업로드 미리보기</p>
            <img src={preview} alt="preview" className="w-full rounded-xl object-cover shadow" />
          </Card>
        )}

        {message && (
          <Card className="space-y-2 border border-emerald-200 bg-emerald-50">
            <p className="text-sm font-semibold text-emerald-700">{message}</p>
            <Button onClick={() => navigate('/scan')}>수거함 찾아가기</Button>
          </Card>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/home')}>
            홈으로
          </Button>
          <Button variant="ghost" onClick={() => navigate('/scan')}>
            수거함 찾기
          </Button>
        </div>
        {uploading && <p className="text-sm text-beach-navy/70">업로드 중입니다...</p>}
      </div>
    </Layout>
  );
};
