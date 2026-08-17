import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2, Sparkles, Plus, HardDrive } from 'lucide-react';

interface InstalledRunner {
  folderName: string;
  displayTitle: string;
  fullPath: string;
  source?: string;
}

interface ProtonVersionSelectorProps {
  value: string;
  onChange: (version: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showRefreshButton?: boolean;
}

const DEFAULT_PROTON_PRESETS = [
  'Proton Experimental',
  'Proton 9.0',
  'Proton 9.0-3',
  'Proton 8.0',
  'Proton 8.0-5',
  'Proton 7.0',
  'Proton 7.0-6',
  'Proton 6.3-8',
  'Proton 5.13-9',
  'Proton Hotfix',
  'Proton Bleeding Edge',
  'Proton BattEye Runtime',
  'Proton EAC Runtime',
  'GE-Proton9-25',
  'GE-Proton9-20',
  'GE-Proton8-32',
  'Proton-RTSP',
  'Proton-RTSP-9.0',
];

export const ProtonVersionSelector: React.FC<ProtonVersionSelectorProps> = ({
  value,
  onChange,
  className = '',
  size = 'md',
  showRefreshButton = true,
}) => {
  const [installedRunners, setInstalledRunners] = useState<InstalledRunner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const fetchInstalledRunners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proton-runners/installed');
      const data = await res.json();
      if (data.success && Array.isArray(data.installedRunners)) {
        setInstalledRunners(data.installedRunners);
      }
    } catch (err) {
      console.warn('Failed fetching installed Proton runners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstalledRunners();
  }, []);

  // Check if current value matches an installed or preset version
  const installedTitles = installedRunners.map((r) => r.displayTitle);
  const allKnownOptions = Array.from(
    new Set([...installedTitles, ...DEFAULT_PROTON_PRESETS])
  );

  const matchedOption = allKnownOptions.find(
    (opt) => opt.toLowerCase() === (value || '').toLowerCase()
  );
  const selectDisplayValue = matchedOption || value || 'Proton Experimental';
  const isCurrentValueInOptions = Boolean(matchedOption);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__CUSTOM__') {
      setIsCustom(true);
      setCustomValue(value);
    } else {
      setIsCustom(false);
      onChange(selected);
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsCustom(false);
    }
  };

  const isCurrentValueInstalled = installedTitles.some(
    (t) => t.toLowerCase() === (value || '').toLowerCase()
  );

  return (
    <div className={`flex items-center space-x-1.5 ${className}`}>
      <div className="relative flex-1 flex items-center">
        {isCustom ? (
          <div className="flex items-center space-x-1.5 w-full">
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="e.g. Proton-Custom-Build"
              className="bg-slate-950 border border-cyan-500/80 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-full"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded-lg text-xs font-semibold"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setIsCustom(false)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="relative w-full flex items-center">
            <select
              value={selectDisplayValue}
              onChange={handleSelectChange}
              className={`w-full bg-slate-950 border ${
                isCurrentValueInstalled
                  ? 'border-cyan-500/60 text-cyan-300 font-semibold'
                  : 'border-slate-800 text-slate-200'
              } rounded-lg pl-7 pr-7 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none transition`}
            >
              {/* Active Runner if custom / not in presets */}
              {!isCurrentValueInOptions && value && (
                <optgroup label="🎮 Currently Assigned Runner">
                  <option value={value}>{value}</option>
                </optgroup>
              )}

              {/* Installed Proton Versions Group */}
              {installedRunners.length > 0 && (
                <optgroup label="⚡ Installed on System (Detected)">
                  {installedRunners.map((runner) => (
                    <option key={`inst_${runner.displayTitle}`} value={runner.displayTitle}>
                      ✓ {runner.displayTitle} {runner.source ? `(${runner.source})` : '(Installed)'}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Standard Presets */}
              <optgroup label="🌐 Standard Popular Presets">
                {DEFAULT_PROTON_PRESETS.map((preset) => (
                  <option key={`preset_${preset}`} value={preset}>
                    {preset}
                  </option>
                ))}
              </optgroup>

              {/* Custom Input Option */}
              <optgroup label="✏️ Other Options">
                <option value="__CUSTOM__">+ Enter Custom Proton Name...</option>
              </optgroup>
            </select>

            <Cpu className="w-3.5 h-3.5 absolute left-2 text-cyan-400 pointer-events-none" />

            <div className="absolute right-2 pointer-events-none text-slate-400 text-[10px]">
              ▼
            </div>
          </div>
        )}
      </div>

      {showRefreshButton && (
        <button
          type="button"
          onClick={fetchInstalledRunners}
          disabled={loading}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 rounded-lg transition disabled:opacity-50"
          title="Scan system for installed Proton versions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      )}
    </div>
  );
};
