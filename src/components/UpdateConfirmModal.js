import React from 'react';
import styles from './SettingsModal.module.css';
import { X } from 'lucide-react';

const UpdateConfirmModal = ({ updates, onConfirm, onClose }) => {
  const updateList = updates.join(', ');
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Confirm Updates</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.updateConfirmContent}>
          <p>Updates are available for: {updateList}</p>
          <p>This will:</p>
          <ul>
            <li>Stop the chains if they are running</li>
            <li>Delete existing binaries</li>
            <li>Download and install updates</li>
          </ul>
          <p>Do you want to proceed?</p>
        </div>

        <div className={styles.updateConfirmButtons}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateConfirmModal;
