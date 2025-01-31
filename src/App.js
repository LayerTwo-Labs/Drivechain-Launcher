import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import './scrollbar.css';
import NavBar from './components/NavBar';
import cardData from './CardData.json';
import Nodes from './components/Nodes';
// import Tools from './components/Tools';
import Settings from './components/Settings';
import Other from './components/Other';
import FaucetModal from './components/FaucetModal';
import WalletModal from './components/WalletModal';
import FastWithdrawalModal from './components/FastWithdrawalModal';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import QuoteWidget from './components/QuoteWidget';
import ShutdownModal from './components/ShutdownModal';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Make cardData globally available
  useEffect(() => {
    window.cardData = cardData;
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Check for updates and master wallet on startup
  useEffect(() => {
    const initializeApp = async () => {
      // Check for master wallet
      try {
        const result = await window.electronAPI.getMasterWallet();
        if (!result.success || !result.data) {
          setShowWelcomeModal(true);
        }
      } catch (error) {
        console.error('Error checking master wallet:', error);
        setShowWelcomeModal(true);
      }

    };

    initializeApp();
  }, [dispatch]);

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<Nodes />} />
          {/* <Route path="/tools" element={<Tools />} /> */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/other" element={<Other />} />
        </Routes>
        <FaucetModal />
        <WalletModal />
        <FastWithdrawalModal />
        <SettingsModal onResetComplete={() => setShowWelcomeModal(true)} />
        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
        <QuoteWidget />
        <ShutdownModal />
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
