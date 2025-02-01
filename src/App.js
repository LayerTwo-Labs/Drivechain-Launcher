import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setChains } from './store/chainsSlice';
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Make cardData globally available and initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      window.cardData = cardData;

      try {
        const walletResult = await window.electronAPI.getMasterWallet();
        if (!walletResult.success || !walletResult.data) {
          setShowWelcomeModal(true);
        }

        const config = await window.electronAPI.getConfig();
        const chainsWithStatus = await Promise.all(
          config.chains
            .filter(chain => chain.enabled)
            .map(async chain => {
              const dependencyInfo = cardData.find(d => d.id === chain.id);
              const status = await window.electronAPI.getChainStatus(chain.id);
              return {
                ...chain,
                dependencies: dependencyInfo?.dependencies || [],
                status,
                progress: 0,
                released: chain.released,
              };
            })
        );
        dispatch(setChains(chainsWithStatus));
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setShowWelcomeModal(true);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [dispatch]);

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  return (
    <Router>
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={isInitialized ? <Nodes /> : null} />
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
