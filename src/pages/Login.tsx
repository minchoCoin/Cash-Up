import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { useAppState } from '../state/AppStateContext';

export const LoginPage = () => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, loading } = useAppState();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    try {
      await login(nickname.trim());
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 문제가 발생했어요.');
    }
  };

  return (
    <Layout title="간편 로그인" showBack>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Card className="space-y-2">
          <p className="text-sm text-beach-navy/80">닉네임을 입력하면 바로 시작할 수 있어요.</p>
          <p className="text-xs text-beach-navy/60">카카오/네이버 로그인 없이, 임시 계정이 만들어집니다.</p>
        </Card>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-beach-navy">닉네임</label>
          <input
            className="w-full rounded-xl border border-beach-sky bg-white/80 px-4 py-3 text-beach-navy shadow-sm focus:border-beach-sea focus:outline-none"
            placeholder="예: 바다지킴이"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" disabled={!nickname.trim() || loading}>
          {loading ? '로그인 중...' : '시작하기'}
        </Button>
        <p className="text-xs text-beach-navy/60">위치정보 사용 안내: 축제장 내부 참여 여부만 확인합니다.</p>
      </form>
    </Layout>
  );
};
