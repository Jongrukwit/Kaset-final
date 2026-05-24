import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import MainApp from './pages/MainApp';
import LoadingScreen from './components/ui/LoadingScreen';

export default function App() {
  const { user, loading, loadSession } = useAuthStore();

  useEffect(() => { loadSession(); }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/*" element={user ? <MainApp /> : <Navigate to="/auth" />} />
    </Routes>
  );
}
