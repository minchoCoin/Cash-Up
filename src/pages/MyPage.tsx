import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';

export const MyPage = () => {
  const { user, summary, festival, logout } = useAppState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout title="마이페이지" showBack>
      <div className="space-y-4">
        <Card className="space-y-2">
          <p className="text-sm text-beach-navy/70">닉네임</p>
          <p className="text-xl font-bold text-beach-navy">{user?.displayName}</p>
          <p className="text-xs text-beach-navy/60">{festival?.name}</p>
        </Card>
        <Card className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-beach-navy/70">오늘 ACTIVE</p>
            <p className="text-2xl font-bold text-emerald-600">{summary?.totalActive ?? 0}원</p>
          </div>
          <div>
            <p className="text-sm text-beach-navy/70">오늘 PENDING</p>
            <p className="text-2xl font-bold text-amber-600">{summary?.totalPending ?? 0}원</p>
          </div>
        </Card>
        <Button variant="secondary" onClick={() => navigate('/wallet')}>
          내 지갑
        </Button>
        <Button variant="secondary" onClick={() => navigate('/activity')}>
          내 활동 보기
        </Button>
        <Button variant="ghost" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </Layout>
  );
};
