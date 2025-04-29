import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateDownloads, updateIBDStatus } from '../store/downloadSlice';
import { showDownloadModal } from '../store/downloadModalSlice';

export const useChainManagement = () => {
  const [chains, setChains] = useState([]);
  const [runningNodes, setRunningNodes] = useState([]);
  const [walletMessage, setWalletMessage] = useState(null);
  const [bitcoinSync, setBitcoinSync] = useState(null);
  const dispatch = useDispatch();

  const fetchChains = useCallback(async () => {
    try {
      const config = await window.electronAPI.getConfig();
      const dependencyData = await import('../CardData.json');
      
      const chainsWithStatus = await Promise.all(
        config.chains
          .filter(chain => chain.enabled)
          .map(async chain => {
            const dependencyInfo = dependencyData.default.find(d => d.id === chain.id);
            return {
              ...chain,
              dependencies: dependencyInfo?.dependencies || [],
              status: await window.electronAPI.getChainStatus(chain.id),
              progress: 0,
            };
          })
      );
      setChains(chainsWithStatus);
      
      // Initialize running nodes based on initial status
      const initialRunning = chainsWithStatus
        .filter(chain => chain.status === 'running' || chain.status === 'ready')
        .map(chain => chain.id);
      setRunningNodes(initialRunning);
    } catch (error) {
      console.error('Failed to fetch chain config:', error);
    }
  }, []);

  const handleUpdateChain = useCallback((chainId, updates) => {
    setChains(prevChains =>
      prevChains.map(chain =>
        chain.id === chainId ? { ...chain, ...updates } : chain
      )
    );
  }, []);

  const handleDownloadChain = useCallback(
    async chainId => {
      try {
        console.log(`Attempting to download chain ${chainId}`);
        await window.electronAPI.downloadChain(chainId);
        console.log(`Download initiated for chain ${chainId}`);
        dispatch(showDownloadModal());
      } catch (error) {
        console.error(`Failed to start download for chain ${chainId}:`, error);
      }
    },
    [dispatch]
  );

  const handleStartChain = useCallback(async (chainId, args = []) => {
    try {
      // Find the chain and check its dependencies
      const chain = chains.find(c => c.id === chainId);
      if (!chain) {
        console.error(`Chain ${chainId} not found`);
        return;
      }

      // Check if all dependencies are running
      if (chain.dependencies && chain.dependencies.length > 0) {
        const missingDeps = chain.dependencies.filter(dep => !runningNodes.includes(dep));
        if (missingDeps.length > 0) {
          console.error(`Cannot start ${chainId}: missing dependencies: ${missingDeps.join(', ')}`);
          return;
        }
      }

      await window.electronAPI.startChain(chainId, args);
      setChains(prevChains =>
        prevChains.map(chain =>
          chain.id === chainId ? { ...chain, status: 'running' } : chain
        )
      );
    } catch (error) {
      console.error(`Failed to start chain ${chainId}:`, error);
    }
  }, [chains, runningNodes]);

  const handleStopChain = useCallback(async chainId => {
    try {
      await window.electronAPI.stopChain(chainId);
      setChains(prevChains =>
        prevChains.map(chain =>
          chain.id === chainId ? { ...chain, status: 'stopped' } : chain
        )
      );
    } catch (error) {
      console.error(`Failed to stop chain ${chainId}:`, error);
    }
  }, []);

  const handleResetChain = useCallback(
    async chainId => {
      const chain = chains.find(c => c.id === chainId);
      if (chain.status === 'running') {
        try {
          await handleStopChain(chainId);
        } catch (error) {
          console.error(`Failed to stop chain ${chainId} before reset:`, error);
          return;
        }
      }

      try {
        await window.electronAPI.resetChain(chainId);
      } catch (error) {
        console.error(`Failed to reset chain ${chainId}:`, error);
      }
    },
    [chains, handleStopChain]
  );

  const handleOpenWalletDir = useCallback(async chainId => {
    try {
      const result = await window.electronAPI.openWalletDir(chainId);
      if (!result.success) {
        setWalletMessage({
          error: result.error,
          path: result.path,
          chainName: result.chainName,
        });
      }
    } catch (error) {
      console.error(
        `Failed to open wallet directory for chain ${chainId}:`,
        error
      );
      setWalletMessage({
        error: error.message,
        path: '',
        chainName: '',
      });
    }
  }, []);

  useEffect(() => {
    fetchChains();

    const unsubscribeDownloadsUpdate = window.electronAPI.onDownloadsUpdate(
      downloads => {
        console.log('Received downloads update:', downloads);
        dispatch(updateDownloads(downloads));
        setChains(prevChains =>
          prevChains.map(chain => {
            const download = downloads.find(d => d.chainId === chain.id);
            return download
              ? { ...chain, status: download.status, progress: download.progress }
              : chain;
          })
        );
      }
    );

    const unsubscribeStatus = window.electronAPI.onChainStatusUpdate(
      ({ chainId, status }) => {
        setChains(prevChains =>
          prevChains.map(chain =>
            chain.id === chainId ? { ...chain, status } : chain
          )
        );
        
        // Update running nodes list
        if (status === 'running' || status === 'ready') {
          setRunningNodes(prev => [...new Set([...prev, chainId])]);
        } else if (status === 'stopped' || status === 'not_downloaded') {
          setRunningNodes(prev => prev.filter(id => id !== chainId));
        }
      }
    );

    const unsubscribeDownloadComplete = window.electronAPI.onDownloadComplete(
      ({ chainId }) => {
        console.log(`Received download complete for chain ${chainId}, updating state`);
        setChains(prevChains =>
          prevChains.map(chain =>
            chain.id === chainId
              ? { ...chain, status: 'downloaded', progress: 100 }
              : chain
          )
        );
      }
    );

    const unsubscribeBitcoinSync = window.electronAPI.onBitcoinSyncStatus(
      (status) => {
        setBitcoinSync(status);
        dispatch(updateIBDStatus({ chainId: 'bitcoin', status }));
      }
    );

    window.electronAPI.getDownloads().then(downloads => {
      console.log('Received downloads update:', downloads);
      dispatch(updateDownloads(downloads));
      setChains(prevChains =>
        prevChains.map(chain => {
          const download = downloads.find(d => d.chainId === chain.id);
          return download
            ? { ...chain, status: download.status, progress: download.progress }
            : chain;
        })
      );
    });

    return () => {
      if (typeof unsubscribeDownloadsUpdate === 'function')
        unsubscribeDownloadsUpdate();
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeDownloadComplete === 'function')
        unsubscribeDownloadComplete();
      if (typeof unsubscribeBitcoinSync === 'function')
        unsubscribeBitcoinSync();
    };
  }, [dispatch, fetchChains]);

  return {
    chains,
    runningNodes,
    walletMessage,
    bitcoinSync,
    handleUpdateChain,
    handleDownloadChain,
    handleStartChain,
    handleStopChain,
    handleResetChain,
    handleOpenWalletDir,
    setWalletMessage
  };
};
