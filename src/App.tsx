import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppState } from './state/AppStateContext';
import { OnboardingPage } from './pages/Onboarding';
import { LoginPage } from './pages/Login';
import { MainPage } from './pages/Main';
import { MissionUploadPage } from './pages/MissionUpload';
import { ActivityPage } from './pages/Activity';
import { MyPage } from './pages/MyPage';
import { WalletPage } from './pages/Wallet';
import { BinsPage } from './pages/Bins';
import { ScanPage } from './pages/Scan';
import { AdminPage } from './pages/Admin';

const RequireUser = ({ children }: { children: JSX.Element }) => {
  const { user } = useAppState();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const { user } = useAppState();

  return (
    <Routes>
      <Route path="/" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />

      <Route
        path="/home"
        element={
          <RequireUser>
            <MainPage />
          </RequireUser>
        }
      />
      <Route
        path="/upload"
        element={
          <RequireUser>
            <MissionUploadPage />
          </RequireUser>
        }
      />
      <Route
        path="/activity"
        element={
          <RequireUser>
            <ActivityPage />
          </RequireUser>
        }
      />
      <Route
        path="/wallet"
        element={
          <RequireUser>
            <WalletPage />
          </RequireUser>
        }
      />
      <Route
        path="/bins"
        element={
          <RequireUser>
            <BinsPage />
          </RequireUser>
        }
      />
      <Route
        path="/scan"
        element={
          <RequireUser>
            <ScanPage />
          </RequireUser>
        }
      />
      <Route
        path="/mypage"
        element={
          <RequireUser>
            <MyPage />
          </RequireUser>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/home' : '/'} replace />} />
    </Routes>
  );
};

export default App;
