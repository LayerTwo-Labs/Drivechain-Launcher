import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSettingsModal } from '../store/settingsModalSlice';
import { toggleShowQuotes } from '../store/settingsSlice';
import { useTheme } from '../contexts/ThemeContext';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';
import ResetAllModal from './ResetAllModal';
import UpdateConfirmModal from './UpdateConfirmModal';

const SettingsModal = ({ onResetComplete }) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [availableUpdates, setAvailableUpdates] = useState([]);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const dispatch = useDispatch();
  const { isVisible } = useSelector((state) => state.settingsModal);
  const { showQuotes } = useSelector((state) => state.settings);
  const { isDarkMode, toggleTheme } = useTheme();
  const handleClose = () => {
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
      
      // Recreate wallet starters directories
      await window.electronAPI.invoke('init-wallet-dirs');

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
      handleClose(); // Close the settings modal after reset
      onResetComplete(); // Show the welcome modal
    } catch (error) {
      console.error('Failed to reset all chains:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
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
        </div>

        <div className={styles.settingGroup}>
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Master Wallet Directory</span>
            <button 
              className={styles.updateButton}
              onClick={async () => {
                try {
                  const result = await window.electronAPI.invoke('open-wallet-starters-dir');
                  if (!result.success) {
                    throw new Error(result.error);
                  }
                } catch (error) {
                  console.error('Error opening master wallet directory:', error);
                }
              }}
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
                  setUpdateStatus('Checking for updates...');
                  const result = await window.electronAPI.invoke('check-for-updates');
                  
                  if (!result.success) {
                    throw new Error(result.error);
                  }

                  const updates = Object.entries(result.updates)
                    .filter(([_, update]) => update.has_update)
                    .map(([id, update]) => update.displayName);

                  if (updates.length === 0) {
                    setUpdateStatus('All chains are up to date');
                    setAvailableUpdates([]);
                  } else {
                    setUpdateStatus(`Updates available for: ${updates.join(', ')}`);
                    setAvailableUpdates(updates);
                    setShowUpdateConfirm(true);
                  }
                } catch (error) {
                  console.error('Error checking for updates:', error);
                  setUpdateStatus(`Error checking for updates: ${error.message}`);
                } finally {
                  setIsCheckingUpdates(false);
                }
              }}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? 'Checking...' : 'Check Now'}
            </button>
          </div>
          {updateStatus && (
            <div className={styles.updateStatus}>
              {updateStatus}
            </div>
          )}
        </div>

        <button className={styles.resetButton} onClick={handleReset}>
          Reset Everything
        </button>
      </div>
      {showResetModal && (
        <ResetAllModal
          onConfirm={handleConfirmReset}
          onClose={() => setShowResetModal(false)}
        />
      )}
      {showUpdateConfirm && (
        <UpdateConfirmModal
          updates={availableUpdates}
          onConfirm={async () => {
            try {
              setUpdateStatus('Applying updates...');
              // Get config to map display names to chain IDs
              const config = await window.electronAPI.invoke('get-config');
              const chainIds = availableUpdates.map(name => {
                const chain = config.chains.find(c => c.display_name === name);
                return chain ? chain.id : null;
              }).filter(Boolean);

              const result = await window.electronAPI.invoke('apply-updates', chainIds);

              if (!result.success) {
                throw new Error(result.error);
              }

              setUpdateStatus('Updates are being applied. Please wait for the process to complete.');
              setShowUpdateConfirm(false);
            } catch (error) {
              console.error('Failed to apply updates:', error);
              setUpdateStatus(`Error applying updates: ${error.message}`);
            }
          }}
          onClose={() => setShowUpdateConfirm(false)}
        />
      )}
    </div>
  );
};

export default SettingsModal;
