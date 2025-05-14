import { useState } from 'react';
import { Clipboard } from 'lucide-react';
import styles from './FastWithdrawalModal.module.css';
import WithdrawalSuccessPopup from './WithdrawalSuccessPopup';
import ErrorPopup from './ErrorPopup';

// Note: this is duplicated in the fast withdrawal manager. Dunno how to 
// share code across /src and /public without breaking things. 
const FAST_WITHDRAWAL_SERVERS = [
  {
    name: 'fw1.drivechain.info (L2L #1)',
    url: 'https://fw1.drivechain.info',
  },
  {
    name: 'fw2.drivechain.info (L2L #2)',
    url: 'https://fw2.drivechain.info',
  },
];

const defaultFastWithdrawalServer = FAST_WITHDRAWAL_SERVERS[0].url;

const FastWithdrawalModal = () => {
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [selectedServer, setSelectedServer] = useState(defaultFastWithdrawalServer);
  const [layer2Chain, setLayer2Chain] = useState('Thunder');
  const [withdrawalHash, setWithdrawalHash] = useState(null);
  const [paymentTxid, setPaymentTxid] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});

  const resetState = () => {
    setAmount('');
    setAddress('');
    setSelectedServer(defaultFastWithdrawalServer);
    setLayer2Chain('Thunder');
    setWithdrawalHash(null);
    setPaymentTxid('');
    setPaymentMessage('');
    setSuccessMessage('');
    setErrorMessage('');
    setIsCompleted(false);
    setCopiedStates({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (parseFloat(amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (!address.trim()) {
        throw new Error('Please enter a valid withdrawal address');
      }

      const result = await window.electronAPI.requestWithdrawal(address, parseFloat(amount), layer2Chain);
      if (!result.server_l2_address?.info) {
        console.error("HMMM", result)
        const errorMessage = result.error || JSON.stringify(result) ;
        throw new Error(`Withdrawal request failed: ${errorMessage}`);
      }
      const totalAmount = (parseFloat(amount) + result.server_fee_sats/100000000).toString();
      setPaymentMessage({
        amount: totalAmount,
        address: result.server_l2_address.info
      });
      setWithdrawalHash(result.hash);
    } catch (error) {
      setErrorMessage(error.message || 'Withdrawal request failed. Please try again.');
      console.error('Withdrawal request failed:', error);
    }
  };

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handlePaste = async (setter) => {
    try {
      const text = await navigator.clipboard.readText();
      setter(text);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      if (!paymentTxid.trim()) {
        throw new Error('Please enter your L2 payment transaction ID');
      }

      const result = await window.electronAPI.notifyPaymentComplete(withdrawalHash, paymentTxid);
      setSuccessMessage(result.message.info);
      setIsCompleted(true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to complete withdrawal. Please try again.');
      console.error('Payment completion failed:', error);
    }
  };

  const handleStartNew = () => {
    resetState();
  };

  return (
    <div className={styles.pageContainer}>
      {!isCompleted && (
        <div className={styles.content}>
          {/* <h2>Fast Withdrawal</h2> */}
          {/* <div className={styles.description}>
            Quickly withdraw L2 coins to your L1 bitcoin address
          </div> */}
          <div className={styles.form}>
            <ErrorPopup 
              message={errorMessage} 
              onClose={() => setErrorMessage('')}
            />
            {!withdrawalHash ? (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWithPaste}>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter withdrawal amount"
                      className={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handlePaste(setAmount)}
                      className={styles.pasteButton}
                      title="Paste from clipboard"
                    >
                      <Clipboard size={18} />
                    </button>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWithPaste}>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter withdrawal address"
                      className={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handlePaste(setAddress)}
                      className={styles.pasteButton}
                      title="Paste from clipboard"
                    >
                      <Clipboard size={18} />
                    </button>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Select fast withdrawal server
                    </label>
                    <select
                      value={selectedServer}
                      onChange={(e) => {
                        setSelectedServer(e.target.value);
                        window.electronAPI.setFastWithdrawalServer(e.target.value);
                      }}
                      className={styles.input}
                    >
                      {FAST_WITHDRAWAL_SERVERS.map((server) => (
                        <option key={server.url} value={server.url}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Select L2 to withdraw from
                    </label>
                    <select
                      value={layer2Chain}
                      onChange={(e) => setLayer2Chain(e.target.value)}
                      className={styles.input}
                    >
                      <option value="Thunder">Thunder</option>
                      <option value="BitNames">BitNames</option>
                    </select>
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.submitButton}>
                    Request Withdrawal
                  </button>
                </div>
              </form>
            ) : null}
            {withdrawalHash && (
              <>
                <div className={styles.hashDisplay}>
                  <label>Withdrawal Hash:</label>
                  <span 
                    onClick={() => handleCopy(withdrawalHash, 'hash')} 
                    title="Click to copy"
                    className={`${styles.copyableText} ${copiedStates.hash ? styles.copied : ''}`}
                  >
                    {withdrawalHash}
                    {copiedStates.hash && <div className={styles.copyTooltip}>Copied!</div>}
                  </span>
                </div>
                {paymentMessage && (
                  <div className={styles.paymentInstructions}>
                    <div className={styles.messageRow}>
                      Please send <span 
                        onClick={() => handleCopy(paymentMessage.amount, 'amount')} 
                        title="Click to copy"
                        className={`${styles.copyableText} ${copiedStates.amount ? styles.copied : ''}`}
                      >
                        {paymentMessage.amount}
                        {copiedStates.amount && <div className={styles.copyTooltip}>Copied!</div>}
                      </span> {layer2Chain} Coins to {layer2Chain} L2 address: <span 
                        onClick={() => handleCopy(paymentMessage.address, 'address')} 
                        title="Click to copy"
                        className={`${styles.copyableText} ${copiedStates.address ? styles.copied : ''}`}
                      >
                        {paymentMessage.address}
                        {copiedStates.address && <div className={styles.copyTooltip}>Copied!</div>}
                      </span>
                    </div>
                    <div className={styles.messageRow}>
                      <strong>Once you have sent payment copy and paste the L2 txid below</strong>
                    </div>
                  </div>
                )}
                <form onSubmit={handleComplete}>
                  <div className={styles.txInputSection}>
                    <div className={styles.inputWithPasteAndSubmit}>
                      <div className={styles.inputWithPaste}>
                        <input
                          type="text"
                          value={paymentTxid}
                          onChange={(e) => setPaymentTxid(e.target.value)}
                          placeholder="Enter payment transaction ID"
                          className={styles.input}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handlePaste(setPaymentTxid)}
                          className={styles.pasteButton}
                          title="Paste from clipboard"
                        >
                          <Clipboard size={18} />
                        </button>
                      </div>
                      <button
                        type="submit"
                        className={styles.submitButton}
                      >
                        Complete Withdrawal
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {isCompleted && successMessage && (
        <WithdrawalSuccessPopup
          transactionId={successMessage}
          onClose={handleStartNew}
          onStartNew={handleStartNew}
        />
      )}
    </div>
  );
};

export default FastWithdrawalModal;
