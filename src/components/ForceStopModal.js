import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ForceStopModal.module.css';

const ForceStopModal = ({ chainName, onConfirm, onClose, dependentChains = [] }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${styles.modal} ${isDarkMode ? styles.dark : ''}`}>
      <div className={styles.modalContent}>
        <h2>Warning: Force Stop {chainName}</h2>
        <p>
          Warning: The following chains depend on {chainName}:
        </p>
        <ul className={styles.dependentList}>
          {dependentChains.map((name, index) => (
            <li key={index}>{name}</li>
          ))}
        </ul>
        <p>
          Force stopping {chainName} will affect these dependent chains and may result in data corruption or loss.
          Are you sure you want to proceed?
        </p>
        <div className={styles.buttonContainer}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className={styles.forceButton}
            onClick={onConfirm}
          >
            Force Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceStopModal;
