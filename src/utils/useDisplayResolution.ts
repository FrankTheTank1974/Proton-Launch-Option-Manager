import { useState, useEffect, useCallback } from 'react';
import { getDisplayMetrics, DisplayMetrics, LayoutWidthMode } from './screenDetector';

const STORAGE_KEY = 'proton_layout_width_mode';

export function useDisplayResolution() {
  const [metrics, setMetrics] = useState<DisplayMetrics>(() => getDisplayMetrics());
  const [layoutMode, setLayoutModeState] = useState<LayoutWidthMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fluid-full' || saved === '3-column' || saved === 'contained' || saved === 'auto') {
        return saved as LayoutWidthMode;
      }
    }
    return 'auto';
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
  });

  // Track viewport / screen resolution changes in real time
  useEffect(() => {
    let timeoutId: any = null;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setMetrics(getDisplayMetrics());
      }, 100);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setMetrics(getDisplayMetrics());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(timeoutId);
    };
  }, []);

  const setLayoutMode = useCallback((mode: LayoutWidthMode) => {
    setLayoutModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  // Compute effective layout state
  const isEffectiveWide = 
    layoutMode === 'fluid-full' || 
    layoutMode === '3-column' ||
    (layoutMode === 'auto' && metrics.isLandscape && metrics.viewportWidth >= 1024);

  const isThreeColumnMode =
    layoutMode === '3-column' ||
    (layoutMode === 'auto' && metrics.isUltrawide && metrics.viewportWidth >= 1920);

  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  return {
    metrics,
    layoutMode,
    setLayoutMode,
    isEffectiveWide,
    isThreeColumnMode,
    isFullscreen,
    toggleBrowserFullscreen,
  };
}
