import React, { useState, useEffect } from 'react';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState('default'); // 'default', 'restore', or 'advanced'
  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Advanced mode states
  const [isHexMode, setIsHexMode] = useState(false);
  const [entropyInput, setEntropyInput] = useState('');
  const [preview, setPreview] = useState(null);

  // Reset all state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPage('default');
      setMnemonic('');
      setPassphrase('');
      setIsGenerating(false);
      setError('');
      setIsHexMode(false);
      setEntropyInput('');
      setPreview(null);
    }
  }, [isOpen]);

  // Validate hex input
  const isValidHexInput = (value) => {
    // Allow empty input or valid hex characters up to 64 chars
    return value === '' || (/^[0-9a-fA-F]*$/.test(value) && value.length <= 64);
  };

  // Validate hex length for preview/create
  const isValidHexLength = (value) => {
    return [16, 32, 64].includes(value.length);
  };

  // Update preview when entropy input changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!entropyInput) {
        setPreview(null);
        setError('');
        return;
      }

      // For hex mode, validate length before preview
      if (isHexMode && !isValidHexLength(entropyInput)) {
        setPreview(null);
        const currentLength = entropyInput.length;
        const nextValidLength = currentLength <= 16 ? 16 : currentLength <= 32 ? 32 : 64;
        const charsNeeded = nextValidLength - currentLength;
        setError(`Current length: ${currentLength}. Add ${charsNeeded} more character${charsNeeded === 1 ? '' : 's'} to reach ${nextValidLength} (valid lengths: 16, 32, or 64). Using Generate Random is recommended.`);
        return;
      }

      try {
        const result = await window.electronAPI.previewWallet({
          input: entropyInput,
          isHexMode
        });

        if (result.success) {
          setPreview(result.data);
          setError('');
        } else {
          setError(result.error);
          setPreview(null);
        }
      } catch (error) {
        console.error('Error previewing wallet:', error);
        setError(error.message || 'Failed to preview wallet');
        setPreview(null);
      }
    };

    updatePreview();
  }, [entropyInput, isHexMode]);

  const isValidMnemonic = (mnemonic) => {
    const words = mnemonic.trim().split(' ');
    return words.length === 12 || words.length === 24;
  };

  if (!isOpen) return null;

  const handleGenerateWallet = async () => {
    try {
      setIsGenerating(true);
      setError('');
      
      // Generate master wallet (which automatically generates all chain wallets)
      const result = await window.electronAPI.createMasterWallet();
      if (!result.success) {
        throw new Error(result.error);
      }
      onClose();
    } catch (error) {
      console.error('Error generating wallet:', error);
      setError(error.message || 'Failed to generate wallet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestoreWallet = async () => {
    try {
      setIsGenerating(true);
      setError('');

      if (!mnemonic) {
        throw new Error('Please enter a mnemonic phrase');
      }

      // Import master wallet (which automatically generates all chain wallets)
      const result = await window.electronAPI.importMasterWallet(mnemonic, passphrase);
      if (!result.success) {
        throw new Error(result.error);
      }
      onClose();
    } catch (error) {
      console.error('Error restoring wallet:', error);
      setError(error.message || 'Failed to restore wallet');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderDefaultPage = () => (
    <>
      <h2>Welcome to DC Launcher! 🚀</h2>
      <div className={styles.modalBody}>
        <p>
          DC Launcher is your all-in-one tool for managing Drivechain nodes. Start and stop nodes, 
          manage wallets, and interact with both mainchain and sidechains through a simple interface. 
          Let's begin by setting up your wallet!
        </p>
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <button 
        className={styles.generateButton} 
        onClick={handleGenerateWallet}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Wallet'}
      </button>

      <div className={styles.optionsContainer}>
        <span 
          className={styles.textLink}
          onClick={() => {
            setCurrentPage('restore');
            setError('');
          }}
        >
          Restore from backup
        </span>
        <span className={styles.separator}>•</span>
        <span 
          className={styles.textLink}
          onClick={() => {
            setCurrentPage('advanced');
            setError('');
          }}
        >
          Advanced options
        </span>
      </div>
    </>
  );

  const renderRestorePage = () => (
    <>
      <div className={styles.pageHeader}>
        <button 
          className={styles.backButton}
          onClick={() => {
            setCurrentPage('default');
            setError('');
          }}
        >
          ← Back
        </button>
        <h2>Restore Wallet</h2>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputGroup}>
        <input
          type="text"
          value={mnemonic}
          onChange={(e) => {
            const value = e.target.value;
            setMnemonic(value);
            if (isValidMnemonic(value)) {
              setError('');
            }
          }}
          placeholder="Enter BIP39 Mnemonic (12 or 24 words)"
          className={styles.input}
        />
      </div>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Enter optional passphrase"
          className={styles.input}
        />
      </div>
      <div className={styles.buttonContainer}>
        <button 
          className={styles.actionButton} 
          onClick={handleRestoreWallet}
          disabled={isGenerating || !isValidMnemonic(mnemonic)}
        >
          {isGenerating ? 'Restoring...' : 'Restore Wallet'}
        </button>
      </div>
    </>
  );

  const renderAdvancedPage = () => (
    <>
      <div className={styles.pageHeader}>
        <button 
          className={styles.backButton}
          onClick={() => {
            setCurrentPage('default');
            setError('');
          }}
        >
          ← Back
        </button>
        <h2>Advanced Wallet Creation</h2>
      </div>

      <p style={{ marginBottom: '20px', color: 'var(--text-color)' }}>
        Advanced mode provides more control over wallet generation with custom entropy and real-time BIP39 preview.
        ⚠️ Only use this if you understand HD wallets and BIP39.
      </p>

      <div className={styles.modeToggle}>
        <label>
          <input
            type="radio"
            checked={!isHexMode}
            onChange={() => {
              setIsHexMode(false);
              setEntropyInput('');
              setPreview(null);
            }}
          />
          Text Mode
        </label>
        <label>
          <input
            type="radio"
            checked={isHexMode}
            onChange={() => {
              setIsHexMode(true);
              setEntropyInput('');
              setPreview(null);
            }}
          />
          Hex Mode
        </label>
      </div>

      <div className={styles.inputGroup}>
        <textarea
          value={entropyInput}
          onChange={(e) => {
            const value = e.target.value;
            if (isHexMode) {
              if (isValidHexInput(value)) {
                setEntropyInput(value);
              }
            } else {
              setEntropyInput(value);
            }
          }}
          placeholder={isHexMode
            ? "Enter hex (16/32/64 chars) or use Generate Random for valid entropy"
            : "Enter text to be hashed into entropy"
          }
          className={styles.entropyInput}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
          {error && <div className={styles.error} style={{ margin: 0, textAlign: 'left', flex: 1 }}>{error}</div>}
          <button
            className={styles.randomButton}
            style={{ marginLeft: error ? '16px' : 'auto' }}
            onClick={async () => {
              try {
                const result = await window.electronAPI.generateRandomEntropy();
                if (result.success) {
                  // For hex mode, use full 32 bytes (64 chars), for text mode use 16 bytes (32 chars)
                  setEntropyInput(isHexMode ? result.data : result.data.slice(0, 32));
                  setError('');
                } else {
                  setError(result.error);
                }
              } catch (error) {
                console.error('Error generating random entropy:', error);
                setError(error.message || 'Failed to generate random entropy');
              }
            }}
          >
            Generate Random
          </button>
        </div>
      </div>

      <div className={styles.previewSection}>
        {preview ? (
          <>
            <div className={styles.previewGrid}>
              {preview.words.map((word, i) => (
                <div key={i} className={styles.wordCell}>
                  <div className={styles.word}>{word}</div>
                  <div className={styles.binary}>
                    {i === preview.words.length - 1 ? (
                      <>
                        <span>{preview.lastWordBinary.slice(0, -4)}</span>
                        <span className={styles.checksum}>
                          {preview.lastWordBinary.slice(-4)}
                        </span>
                      </>
                    ) : (
                      preview.binaryStrings[i]
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.technicalInfo}>
              <div>
                <strong>BIP39 Binary:</strong>
                <code>{preview.bip39Bin}</code>
              </div>
              <div>
                <strong>Checksum:</strong>
                <code>{preview.checksumBits}</code>
              </div>
              <div>
                <strong>Master Key:</strong>
                <code>{preview.masterKey}</code>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-color)', opacity: 0.7 }}>
            <p>Enter text or hex input above to see the BIP39 preview</p>
            <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
              Preview will show mnemonic words, binary representation, and technical details
            </p>
          </div>
        )}
      </div>

      <div className={styles.buttonContainer}>
        <button 
          className={styles.actionButton}
          onClick={async () => {
            try {
              setIsGenerating(true);
              setError('');
              
              const result = await window.electronAPI.createAdvancedWallet({
                input: entropyInput,
                isHexMode
              });

              if (result.success) {
                onClose();
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              console.error('Error creating wallet:', error);
              setError(error.message || 'Failed to create wallet');
            } finally {
              setIsGenerating(false);
            }
          }}
          disabled={isGenerating || !entropyInput || !preview}
        >
          {isGenerating ? 'Generating...' : 'Create Advanced Wallet'}
        </button>
      </div>
    </>
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} data-mode={currentPage}>
        {currentPage === 'default' && renderDefaultPage()}
        {currentPage === 'restore' && renderRestorePage()}
        {currentPage === 'advanced' && renderAdvancedPage()}
      </div>
    </div>
  );
};

export default WelcomeModal;
