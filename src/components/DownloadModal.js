import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../contexts/ThemeContext';
import {
  hideDownloadModal,
  showDownloadModal,
} from '../store/downloadModalSlice';
import DownloadItem from './DownloadItem';
import styles from './DownloadModal.module.css';

const FADE_DELAY = 7000; // 5 seconds

const DownloadModal = memo(() => {
  // Memoize the selector function
  const selectDownloads = useMemo(() => {
    return state => state.downloads;
  }, []);

  // Custom equality function that only checks relevant fields and rounds progress
  const downloadsEqual = useCallback((prev, next) => {
    if (Object.keys(prev).length !== Object.keys(next).length) return false;
    return Object.keys(prev).every(key => {
      const p = prev[key];
      const n = next[key];
      return p.status === n.status && 
             Math.round(p.progress) === Math.round(n.progress) && 
             (p.type !== 'ibd' || p.details === n.details);
    });
  }, []);

  const downloads = useSelector(selectDownloads, downloadsEqual);
  const isVisible = useSelector(state => state.downloadModal.isVisible);
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);
  const modalRef = useRef(null);

  const activeDownloads = useMemo(() => {
    return Object.entries(downloads).filter(
      ([_, download]) =>
        download.status === 'downloading' || 
        download.status === 'extracting' ||
        download.status === 'syncing' ||
        (download.type === 'ibd' && download.progress < 100)
    );
  }, [downloads]);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      dispatch(hideDownloadModal());
      setIsClosing(false);
    }, 300); // Duration of fade-out animation
  }, [dispatch]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(closeModal, FADE_DELAY);
  }, [closeModal]);

  const handleClickOutside = useCallback(
    event => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        ![
          ...document.querySelectorAll(
            '[id^="download-button-"], #theme-toggle-button'
          ),
        ].some(el => el.contains(event.target))
      ) {
        closeModal();
      }
    },
    [closeModal]
  );

  useEffect(() => {
    if (isVisible) {
      resetTimer();
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isVisible, closeModal, handleClickOutside, resetTimer]);

  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const { electronAPI } = window;

    const handleDownloadStarted = () => {
      if (!isVisible) {
        dispatch(showDownloadModal());
      }
      resetTimer();
    };

    const unsubscribeDownload = electronAPI.onDownloadStarted(handleDownloadStarted);
    const unsubscribeSync = electronAPI.onBitcoinSyncStarted(handleDownloadStarted);

    return () => {
      unsubscribeDownload();
      unsubscribeSync();
    };
  }, [dispatch, resetTimer, isVisible]);

  if (!isVisible && !isClosing) return null;

  return (
    <div
      ref={modalRef}
      className={`${styles.downloadModal} ${isDarkMode ? styles.dark : styles.light} ${isClosing ? styles.fadeOut : styles.fadeIn}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.downloadModalContent}>
        <h2>Downloads</h2>
        {activeDownloads.length > 0 ? (
          activeDownloads.map(([chainId, download]) => (
            <DownloadItem 
              key={chainId} 
              chainId={chainId} 
              downloadedLength={download.downloadedLength}
              {...download} 
            />
          ))
        ) : (
          <p>No active downloads</p>
        )}
      </div>
    </div>
  );
});

export default DownloadModal;
