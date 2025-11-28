import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';

export const BinsPage = () => {
  const { bins, festival } = useAppState();

  return (
    <Layout title="수거함 위치" showBack>
      <div className="space-y-3">
        <Card className="space-y-1">
          <p className="text-sm text-beach-navy/70">{festival?.name} 공식 수거함을 찾아 QR을 찍어주세요.</p>
          <p className="text-xs text-beach-navy/60">QR 코드에 적힌 번호를 입력해도 인증됩니다.</p>
        </Card>
        {bins.map((bin) => (
          <Card key={bin.id} className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-beach-navy">{bin.name}</p>
              <p className="text-sm text-beach-navy/70">{bin.description}</p>
              <p className="text-xs text-beach-navy/60">{bin.code}</p>
            </div>
            <Button className="w-auto px-3 py-2 text-sm" onClick={() => window.navigator?.clipboard?.writeText(bin.code)}>
              코드 복사
            </Button>
          </Card>
        ))}
        {!bins.length && <p className="text-sm text-beach-navy/70">수거함 정보가 아직 등록되지 않았어요.</p>}
      </div>
    </Layout>
  );
};
