export type ScreenCategory = 
  | '4K UHD (2160p+)'
  | 'QHD (1440p)'
  | 'Full HD (1080p)'
  | 'Steam Deck / Handheld (1280×800)'
  | 'HD Laptop (720p-900p)'
  | 'Ultrawide (21:9+)'
  | 'Tablet'
  | 'Mobile Portrait'
  | 'Custom Display';

export type DisplayOrientation = 'horizontal' | 'vertical';

export type LayoutWidthMode = 'auto' | 'fluid-full' | '3-column' | 'contained';

export interface DisplayMetrics {
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  orientation: DisplayOrientation;
  aspectRatio: string;
  aspectRatioValue: number;
  category: ScreenCategory;
  isLandscape: boolean;
  isWideScreen: boolean; // width >= 1200
  isUltrawide: boolean; // aspect ratio >= 2.1 && width >= 1920
  isSteamDeck: boolean; // ~1280x800 or 16:10 handheld
}

// Calculate the nearest common aspect ratio string
export function calculateAspectRatio(width: number, height: number): { ratioStr: string; ratioVal: number } {
  if (!width || !height) return { ratioStr: '16:9', ratioVal: 1.778 };
  const ratio = width / height;

  if (ratio >= 3.0) return { ratioStr: '32:9 Super Ultrawide', ratioVal: ratio };
  if (ratio >= 2.25) return { ratioStr: '21:9 Ultrawide', ratioVal: ratio };
  if (ratio >= 1.95) return { ratioStr: '19.5:9 Modern Wide', ratioVal: ratio };
  if (ratio >= 1.7) return { ratioStr: '16:9 Landscape', ratioVal: ratio };
  if (ratio >= 1.55) return { ratioStr: '16:10 Handheld/Laptop', ratioVal: ratio };
  if (ratio >= 1.45) return { ratioStr: '3:2 Productivity', ratioVal: ratio };
  if (ratio >= 1.3) return { ratioStr: '4:3 Standard', ratioVal: ratio };
  if (ratio >= 0.95 && ratio <= 1.05) return { ratioStr: '1:1 Square', ratioVal: ratio };
  if (ratio >= 0.7) return { ratioStr: '3:4 Tablet Portrait', ratioVal: ratio };
  if (ratio >= 0.5) return { ratioStr: '9:16 Phone Portrait', ratioVal: ratio };
  return { ratioStr: `${width}:${height}`, ratioVal: ratio };
}

// Classify display resolution category
export function categorizeScreen(width: number, height: number, screenW: number, screenH: number): ScreenCategory {
  const maxDim = Math.max(width, screenW);
  const minDim = Math.min(width, screenW);
  const ratio = width / Math.max(height, 1);

  if (ratio >= 2.25 && width >= 1920) {
    return 'Ultrawide (21:9+)';
  }

  // Steam Deck check (native 1280x800 or docked)
  if (
    (maxDim === 1280 && minDim === 800) ||
    (width >= 1200 && width <= 1300 && height >= 750 && height <= 850)
  ) {
    return 'Steam Deck / Handheld (1280×800)';
  }

  if (maxDim >= 3400) {
    return '4K UHD (2160p+)';
  }

  if (maxDim >= 2400) {
    return 'QHD (1440p)';
  }

  if (maxDim >= 1750) {
    return 'Full HD (1080p)';
  }

  if (maxDim >= 1200) {
    return 'HD Laptop (720p-900p)';
  }

  if (maxDim >= 768) {
    return 'Tablet';
  }

  return 'Mobile Portrait';
}

// Get current snapshot of display metrics
export function getDisplayMetrics(): DisplayMetrics {
  const vWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const sWidth = typeof window !== 'undefined' && window.screen ? window.screen.width : 1920;
  const sHeight = typeof window !== 'undefined' && window.screen ? window.screen.height : 1080;
  const pRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const orientation: DisplayOrientation = vWidth >= vHeight ? 'horizontal' : 'vertical';
  const { ratioStr, ratioVal } = calculateAspectRatio(vWidth, vHeight);
  const category = categorizeScreen(vWidth, vHeight, sWidth, sHeight);
  const isLandscape = orientation === 'horizontal';
  const isWideScreen = vWidth >= 1200 && isLandscape;
  const isUltrawide = ratioVal >= 2.2 && vWidth >= 1920;
  const isSteamDeck = category === 'Steam Deck / Handheld (1280×800)' || (vWidth === 1280 && vHeight === 800);

  return {
    viewportWidth: vWidth,
    viewportHeight: vHeight,
    screenWidth: sWidth,
    screenHeight: sHeight,
    pixelRatio: pRatio,
    orientation,
    aspectRatio: ratioStr,
    aspectRatioValue: ratioVal,
    category,
    isLandscape,
    isWideScreen,
    isUltrawide,
    isSteamDeck,
  };
}
