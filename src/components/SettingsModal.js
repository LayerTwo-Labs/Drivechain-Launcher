import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSettingsModal } from '../store/settingsModalSlice';
import { toggleShowQuotes } from '../store/settingsSlice';
import { useTheme } from '../contexts/ThemeContext';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';
import ResetAllModal from './ResetAllModal';
import UpdateStatusModal from './UpdateStatusModal';
import WalletWarningModal from './WalletWarningModal';

const SettingsModal = ({ onResetComplete }) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [availableUpdates, setAvailableUpdates] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  const dispatch = useDispatch();

  // Set up download progress listeners
  useEffect(() => {
    let config;
    // Get config for chain names
    window.electronAPI.invoke('get-config').then(result => {
      config = result;
    });

    const removeStartedListener = window.electronAPI.receive("download-started", ({ chainId }) => {
      const chain = config?.chains?.find(c => c.id === chainId);
      const chainName = chain ? chain.display_name : chainId;
      const message = `Starting download for ${chainName}...`;
      window.electronAPI.sendMessage('toMain', { type: 'update-status', message });
      setUpdateStatus(message);
    });

    const removeUpdateListener = window.electronAPI.receive("downloads-update", (downloads) => {
      if (isUpdating) {
        // Process all downloads
        const newProgress = {};
        downloads.forEach(download => {
          const chain = config?.chains?.find(c => c.id === download.chainId);
          const chainName = chain ? chain.display_name : download.chainId;
          
          if (download.status === "downloading") {
            setUpdateStatus('Downloading updates...');
            newProgress[chainName] = download.progress;
          } else if (download.status === "extracting") {
            const message = `Extracting update files for ${chainName}...`;
            window.electronAPI.sendMessage('toMain', { type: 'update-status', message });
            setUpdateStatus(message);
            newProgress[chainName] = 100;
          }
        });
        
        // Update all progress bars at once
        setDownloadProgress(prev => ({
          ...prev,
          ...newProgress
        }));
      }
    });

    const removeCompleteListener = window.electronAPI.receive("download-complete", ({ chainId }) => {
      const chain = config?.chains?.find(c => c.id === chainId);
      const chainName = chain ? chain.display_name : chainId;
      const message = `Download completed for ${chainName}.`;
      window.electronAPI.sendMessage('toMain', { type: 'update-status', message });
      setUpdateStatus(message);
    });

    const removeErrorListener = window.electronAPI.receive("download-error", ({ chainId, error }) => {
      const chain = config?.chains?.find(c => c.id === chainId);
      const chainName = chain ? chain.display_name : chainId;
      const message = `Error updating ${chainName}: ${error}`;
      window.electronAPI.sendMessage('toMain', { type: 'update-error', message });
      setUpdateStatus(message);
      setIsUpdating(false);
    });

    // Helper function to format bytes
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    return () => {
      removeStartedListener();
      removeUpdateListener();
      removeCompleteListener();
      removeErrorListener();
    };
  }, [isUpdating]);
  const { isVisible } = useSelector((state) => state.settingsModal);
  const { showQuotes } = useSelector((state) => state.settings);
  const { isDarkMode, toggleTheme } = useTheme();
  const handleClose = () => {
    setShowResetModal(false);
    setShowWalletWarning(false);
    setUpdateStatus(null);
    setIsCheckingUpdates(false);
    setAvailableUpdates([]);
    setShowUpdateStatus(false);
    setDownloadProgress({});  // Reset download progress
    setIsUpdating(false);     // Reset updating state
    dispatch(hideSettingsModal());
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleReset = async () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    try {
      // Delete wallet starters directory first
      await window.electronAPI.invoke('delete-wallet-starters-dir');
      


      // Then handle chain resets
      const chains = await window.electronAPI.getConfig();
      for (const chain of chains.chains) {
        if (chain.enabled) {
          // First stop the chain if it's running
          const status = await window.electronAPI.getChainStatus(chain.id);
          if (status === 'running' || status === 'ready') {
            await window.electronAPI.stopChain(chain.id);
          }
          // Then reset it
          await window.electronAPI.resetChain(chain.id);
        }
      }
      setShowResetModal(false);
      // Recreate wallet starters directories
      await window.electronAPI.invoke('init-wallet-dirs');
      handleClose(); // Close the settings modal after reset
      onResetComplete(); // Show the welcome modal
    } catch (error) {
      console.error('Failed to reset all chains:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.modalOverlay} ${isDarkMode ? styles.dark : styles.light}`} 
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Settings</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.settingGroup}>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Show Quotes</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={showQuotes}
                onChange={() => dispatch(toggleShowQuotes())}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Dark Mode</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleTheme}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Master Wallet Directory</span>
            <button 
              className={styles.updateButton}
              onClick={() => setShowWalletWarning(true)}
            >
              Open
            </button>
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Check for Updates</span>
            <button 
              className={styles.updateButton}
              onClick={async () => {
                try {
                  setIsCheckingUpdates(true);
                  setDownloadProgress({});  // Reset progress when checking starts
                  setAvailableUpdates([]); // Clear available updates before checking
                  const checkingMessage = 'Checking for updates...';
                  window.electronAPI.sendMessage('toMain', { type: 'update-status', message: checkingMessage });
                  setUpdateStatus(checkingMessage);
                  setShowUpdateStatus(true);
                  const result = await window.electronAPI.invoke('check-for-updates');
                  
                  if (!result.success) {
                    throw new Error(result.error);
                  }

                  const updates = Object.entries(result.updates)
                    .filter(([_, update]) => update.has_update)
                    .map(([id, update]) => update.displayName);

                  if (updates.length === 0) {
                    const upToDateMessage = 'All chains are up to date';
                    window.electronAPI.sendMessage('toMain', { type: 'update-status', message: upToDateMessage });
                    setUpdateStatus(upToDateMessage);
                    setAvailableUpdates([]);
                  } else {
                    const availableMessage = `Updates available for: ${updates.join(', ')}`;
                    window.electronAPI.sendMessage('toMain', { type: 'update-status', message: availableMessage });
                    setUpdateStatus(availableMessage);
                    setAvailableUpdates(updates);
                  }
                } catch (error) {
                  const errorMessage = `Error checking for updates: ${error.message}`;
                  window.electronAPI.sendMessage('toMain', { type: 'update-error', message: errorMessage });
                  setUpdateStatus(errorMessage);
                } finally {
                  setIsCheckingUpdates(false);
                }
              }}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? 'Checking...' : 'Check Now'}
            </button>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button className={styles.resetButton} onClick={handleReset}>
            Reset Everything
          </button>
        </div>
      </div>
      {showResetModal && (
        <ResetAllModal
          onConfirm={handleConfirmReset}
          onClose={() => setShowResetModal(false)}
        />
      )}
      {showWalletWarning && (
        <WalletWarningModal
          onConfirm={async () => {
            try {
              const result = await window.electronAPI.invoke('open-wallet-starters-dir');
              if (!result.success) {
                throw new Error(result.error);
              }
            } catch (error) {
              console.error('Error opening master wallet directory:', error);
            } finally {
              setShowWalletWarning(false);
            }
          }}
          onClose={() => setShowWalletWarning(false)}
        />
      )}
      {updateStatus && (
        <UpdateStatusModal
          status={updateStatus}
          isVisible={showUpdateStatus}
          updates={availableUpdates}
          onClose={() => {
            setShowUpdateStatus(false);
            setDownloadProgress({});  // Reset progress when modal is closed
            setIsUpdating(false);     // Reset updating state
            setAvailableUpdates([]); // Clear available updates
          }}
          isUpdating={isUpdating}
          downloadProgress={downloadProgress}
          onConfirm={async () => {
            try {
              setIsUpdating(true);
              window.electronAPI.sendMessage('toMain', { type: 'update-status', message: 'Preparing to apply updates...' });
              setUpdateStatus('Preparing updates...');
              const config = await window.electronAPI.invoke('get-config');
              const chainIds = availableUpdates.map(name => {
                const chain = config.chains.find(c => c.display_name === name);
                return chain ? chain.id : null;
              }).filter(Boolean);

              window.electronAPI.sendMessage('toMain', { type: 'update-status', message: 'Stopping running chains...' });
              setUpdateStatus('Stopping running chains before update...');
              const result = await window.electronAPI.invoke('apply-updates', chainIds);

              if (!result.success) {
                throw new Error(result.error);
              }

              // The rest of the status updates will come from the download event listeners
            } catch (error) {
              window.electronAPI.sendMessage('toMain', { type: 'update-error', message: `Failed to apply updates: ${error.message}` });
              setUpdateStatus(`Error applying updates: ${error.message}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default SettingsModal;
