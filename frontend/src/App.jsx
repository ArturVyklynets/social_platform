import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AuthModals from './components/AuthModals';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import ProfilePage from './components/ProfilePage';
import CreateRequestModal from './components/CreateRequestModal';
import RoleSelectionModal from './components/RoleSelectionModal';
import ResetPasswordPage from './components/ResetPasswordPage'
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const isResetPage = window.location.pathname === '/reset-password';
  const urlToken    = new URLSearchParams(window.location.search).get('token');
  const resetToken  = isResetPage ? urlToken : null;

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (isResetPage) return !!localStorage.getItem('token');
    return !!urlToken || !!localStorage.getItem('token');
  });
  const [currentView, setCurrentView] = useState(() => {
    if (isResetPage) return 'reset-password';
    return urlToken ? 'dashboard' : 'landing';
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, type: 'login' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowRoleModal(false);
    setCurrentView('landing');
  };

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success') {
      toast.success('Оплату успішно проведено! Дякуємо за підтримку.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'cancel') {
      toast.error('Оплату скасовано.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setCurrentUser(res.data);
        if (res.data.role === 'pending') setShowRoleModal(true);
      })
      .catch((err) => {
        if (err.response?.status !== 403) handleLogout();
      });
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {currentUser?.is_blocked && (
        <div className="sticky top-0 z-[999] flex items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-sm font-medium text-white">
          <span>🚫</span>
          <span>Ваш акаунт заблоковано. Зверніться до адміністратора платформи.</span>
        </div>
      )}
      <Header
        isAuthenticated={isLoggedIn}
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLoginClick={() => setAuthModal({ isOpen: true, type: 'login' })}
        onRegisterClick={() => setAuthModal({ isOpen: true, type: 'register' })}
        onLogout={handleLogout}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      <main>
        {currentView === 'reset-password' && (
          <ResetPasswordPage
            token={resetToken}
            onDone={() => {
              window.history.replaceState({}, '', '/');
              setCurrentView('landing');
              setAuthModal({ isOpen: true, type: 'login' });
            }}
          />
        )}
        {currentView === 'landing' && (
          <LandingPage
            onNavigate={setCurrentView}
            onRegister={() => setAuthModal({ isOpen: true, type: 'register' })}
          />
        )}
        {currentView === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {currentView === 'about' && (
          <AboutPage onGetStarted={() => setAuthModal({ isOpen: true, type: 'register' })} />
        )}
        {currentView === 'profile' && <ProfilePage />}
        {currentView === 'admin'   && currentUser?.role === 'Адмін' && <AdminDashboard />}
      </main>

      
      <AuthModals 
        isOpen={authModal.isOpen} 
        type={authModal.type} 
        onClose={() => setAuthModal({ isOpen: false, type: 'login' })} 
        onSuccess={() => { setIsLoggedIn(true); setCurrentView('dashboard'); }} 
      />
      
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          if (currentView === 'dashboard') window.location.reload();
        }}
      />

      {showRoleModal && (
        <RoleSelectionModal onRoleSet={() => setShowRoleModal(false)} />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '14px',
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}