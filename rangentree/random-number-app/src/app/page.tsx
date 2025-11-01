"use client";
import React, { useState, useEffect } from 'react';
import { Shuffle, Check, SkipForward, Bookmark, Trash2, List, Download, Settings, X, Lock } from 'lucide-react';

const DEFAULT_CONFIG = {
  groups: 18,
  subgroups: {
    QC: { name: 'QC', max: 51 },
    PS: { name: 'PS', max: 50 },
    MAC: { name: 'MAC', max: 36 },
    NE: { name: 'NE', max: 35 }
  }
};

type CurrentNumber = {
  a: number;
  b: string;
  c: number;
  key: string;
} | null;

type BookmarkedNumber = {
  a: number;
  b: string;
  c: number;
  key: string;
  timestamp: string;
};

type SkippedNumber = {
  a: number;
  b: string;
  c: number;
  key: string;
  timestamp: string;
};

function Page() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentNumber, setCurrentNumber] = useState<CurrentNumber>(null);
  const [doneNumbers, setDoneNumbers] = useState(new Set());
  const [bookmarkedNumbers, setBookmarkedNumbers] = useState<BookmarkedNumber[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [stats, setStats] = useState({ remaining: 0, done: 0, bookmarked: 0, total: 0 });
  const [skippedNumbers, setSkippedNumbers] = useState<SkippedNumber[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [tempConfig, setTempConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const loadData = async () => {
      try {
        const configResult = localStorage.getItem('app-config');
        const doneResult = localStorage.getItem('done-numbers');
        const bookmarkResult = localStorage.getItem('bookmarked-numbers');
        const skippedResult = localStorage.getItem('skipped-numbers');
        
        if (configResult) {
          setConfig(JSON.parse(configResult));
          setTempConfig(JSON.parse(configResult));
        }
        if (doneResult) {
          setDoneNumbers(new Set(JSON.parse(doneResult)));
        }
        if (bookmarkResult) {
          setBookmarkedNumbers(JSON.parse(bookmarkResult));
        }
        if (skippedResult) {
          setSkippedNumbers(JSON.parse(skippedResult));
        }
      } catch (error) {
        console.log('No saved data found, starting fresh');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let total = 0;
    for (const subgroup of Object.values(config.subgroups)) {
      total += config.groups * subgroup.max;
    }
    
    setStats({
      remaining: total - doneNumbers.size,
      done: doneNumbers.size,
      bookmarked: bookmarkedNumbers.length,
      total: total
    });
  }, [doneNumbers, bookmarkedNumbers, config]);

  const generateKey = (a: number, b: string, c: number) => `${a}-${b}-${c}`;

  const generateRandom = () => {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const a = Math.floor(Math.random() * config.groups) + 1;
      const subgroupKeys = Object.keys(config.subgroups);
      const b = subgroupKeys[Math.floor(Math.random() * subgroupKeys.length)] as keyof typeof config.subgroups;
      const c = Math.floor(Math.random() * config.subgroups[b].max) + 1;
      
      const key = generateKey(a, b, c);
      
      if (!doneNumbers.has(key)) {
        setCurrentNumber({ a, b, c, key });
        return;
      }
      attempts++;
    }

    alert('All numbers have been marked as done! Reset to continue.');
  };

  const handleDone = async () => {
    if (!currentNumber) return;
    
    const newDone = new Set(doneNumbers);
    newDone.add(currentNumber.key);
    setDoneNumbers(newDone);
    
    try {
      localStorage.setItem('done-numbers', JSON.stringify([...newDone]));
    } catch (error) {
      console.error('Failed to save:', error);
    }
    
    setCurrentNumber(null);
  };

  const handleSkip = async () => {
    if (!currentNumber) return;
    
    const skip = {
      ...currentNumber,
      timestamp: new Date().toISOString()
    };
    
    const newSkipped = [...skippedNumbers, skip];
    setSkippedNumbers(newSkipped);
    
    try {
      localStorage.setItem('skipped-numbers', JSON.stringify(newSkipped));
    } catch (error) {
      console.error('Failed to save skip:', error);
    }
    
    setCurrentNumber(null);
  };

  const handleBookmark = async () => {
    if (!currentNumber) return;
    
    const bookmark = {
      ...currentNumber,
      timestamp: new Date().toISOString()
    };
    
    const newBookmarks = [...bookmarkedNumbers, bookmark];
    setBookmarkedNumbers(newBookmarks);
    
    try {
      localStorage.setItem('bookmarked-numbers', JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
    
    setCurrentNumber(null);
  };

  const removeBookmark = async (index: number) => {
    const newBookmarks = bookmarkedNumbers.filter((_, i) => i !== index);
    setBookmarkedNumbers(newBookmarks);
    
    try {
      localStorage.setItem('bookmarked-numbers', JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  };

  const resetAll = async () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear all done items and bookmarks.')) {
      setDoneNumbers(new Set());
      setBookmarkedNumbers([]);
      setSkippedNumbers([]);
      setCurrentNumber(null);
      
      try {
        localStorage.removeItem('done-numbers');
        localStorage.removeItem('bookmarked-numbers');
        localStorage.removeItem('skipped-numbers');
      } catch (error) {
        console.error('Failed to reset:', error);
      }
    }
  };

  const downloadData = () => {
    const allCombinations = [];
    
    for (let a = 1; a <= config.groups; a++) {
      for (const [subgroupKey, subgroupData] of Object.entries(config.subgroups)) {
        for (let c = 1; c <= subgroupData.max; c++) {
          const key = generateKey(a, subgroupKey, c);
          let status = 'Remaining';
          
          if (doneNumbers.has(key)) {
            status = 'Done';
          } else if (bookmarkedNumbers.some(b => b.key === key)) {
            status = 'Bookmarked';
          } else if (skippedNumbers.some(s => s.key === key)) {
            status = 'Skipped';
          }
          
          allCombinations.push({
            Group: a,
            Subgroup: subgroupKey,
            Number: c,
            Status: status
          });
        }
      }
    }
    
    const headers = ['Group', 'Subgroup', 'Number', 'Status'];
    const csvContent = [
      headers.join(','),
      ...allCombinations.map(row => 
        `${row.Group},${row.Subgroup},${row.Number},${row.Status}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `random-number-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfigSave = async () => {
    if (window.confirm('Are you sure you want to change the configuration? This will download your current data first.')) {
      downloadData();
      
      setConfig(tempConfig);
      try {
        localStorage.setItem('app-config', JSON.stringify(tempConfig));
        alert('Configuration updated successfully!');
        setShowSettings(false);
      } catch (error) {
        console.error('Failed to save config:', error);
        alert('Failed to save configuration');
      }
    }
  };

  const updateTempSubgroup = (key: string, field: string, value: string) => {
    setTempConfig(prev => ({
      ...prev,
      subgroups: {
        ...prev.subgroups,
        [key]: {
          ...(prev.subgroups as any)[key],
          [field]: field === 'max' ? parseInt(value) || 0 : value
        }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-3 sm:p-4 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-grow">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 mb-3 sm:mb-4 border border-white/20">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Random Generator
            </h1>
            <button
              onClick={() => setShowSettings(true)}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <Settings size={24} />
            </button>
          </div>
          <div className="flex justify-center gap-4 sm:gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg text-yellow-400">{stats.remaining}</div>
              <div className="text-white/70 text-xs sm:text-sm">Remaining</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-green-400">{stats.done}</div>
              <div className="text-white/70 text-xs sm:text-sm">Done</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-blue-400">{stats.bookmarked}</div>
              <div className="text-white/70 text-xs sm:text-sm">Bookmarked</div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 mb-3 sm:mb-4 border border-white/20">
          {!currentNumber ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-white/60 mb-6 sm:mb-8">
                <Shuffle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
                <p className="text-base sm:text-lg">Click below to generate a random number</p>
              </div>
              <button
                onClick={generateRandom}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
              >
                <Shuffle className="inline mr-2" size={20} />
                Generate Random
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6 sm:mb-8">
                <div className="text-4xl sm:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                  [{currentNumber.a}, {currentNumber.b}, {currentNumber.c}]
                </div>
                <div className="text-white/70 text-xs sm:text-sm">
                  Group {currentNumber.a} • {currentNumber.b} • Number {currentNumber.c}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={handleDone}
                  className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 py-3 sm:py-4 rounded-xl font-semibold shadow-lg hover:bg-green-500/30 transform hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center gap-1 sm:gap-2"
                >
                  <Check size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-xs sm:text-sm">Done</span>
                </button>
                <button
                  onClick={handleSkip}
                  className="bg-gray-500/20 backdrop-blur-sm border border-gray-500/30 text-gray-300 py-3 sm:py-4 rounded-xl font-semibold shadow-lg hover:bg-gray-500/30 transform hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center gap-1 sm:gap-2"
                >
                  <SkipForward size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-xs sm:text-sm">Skip</span>
                </button>
                <button
                  onClick={handleBookmark}
                  className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 text-blue-400 py-3 sm:py-4 rounded-xl font-semibold shadow-lg hover:bg-blue-500/30 transform hover:scale-105 active:scale-95 transition-all duration-200 flex flex-col items-center gap-1 sm:gap-2"
                >
                  <Bookmark size={20} className="sm:w-6 sm:h-6" />
                  <span className="text-xs sm:text-sm">Bookmark</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
          >
            <List size={18} className="sm:w-5 sm:h-5" />
            {showBookmarks ? 'Hide' : 'Show'} Bookmarks
          </button>
          <button
            onClick={downloadData}
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-green-400 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
          >
            <Download size={18} className="sm:w-5 sm:h-5" />
            Download Data
          </button>
        </div>

        {showBookmarks && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 mt-3 sm:mt-4 border border-white/20">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Bookmark size={20} className="sm:w-6 sm:h-6 text-blue-400" />
              Bookmarked Numbers
            </h2>
            {bookmarkedNumbers.length === 0 ? (
              <p className="text-white/60 text-center py-8 text-sm sm:text-base">No bookmarks yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bookmarkedNumbers.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/5 backdrop-blur-sm p-3 sm:p-4 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="font-semibold text-white text-sm sm:text-base">
                      [{item.a}, {item.b}, {item.c}]
                    </div>
                    <button
                      onClick={() => removeBookmark(index)}
                      className="text-red-400 hover:text-red-300 transition-colors active:scale-90"
                    >
                      <Trash2 size={16} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings size={24} />
                  Settings
                </h2>
                <button
                  onClick={() => {
                    setShowSettings(false);
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div>
                  <div className="mb-6">
                    <label className="block text-white/80 mb-2 text-sm font-semibold">
                      Number of Groups (1-100)
                    </label>
                    <input
                      type="number"
                      value={tempConfig.groups}
                      onChange={(e) => setTempConfig(prev => ({ ...prev, groups: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="100"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="mb-6">
                    <h3 className="text-white/80 mb-3 text-sm font-semibold">Subgroup Limits</h3>
                    <div className="space-y-3">
                      {Object.entries(tempConfig.subgroups).map(([key, value]) => (
                        <div key={key} className="bg-white/5 p-4 rounded-lg border border-white/10">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="text"
                              value={value.name}
                              onChange={(e) => updateTempSubgroup(key, 'name', e.target.value)}
                              className="flex-1 bg-white/10 border border-white/20 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Subgroup name"
                            />
                            <input
                              type="number"
                              value={value.max}
                              onChange={(e) => updateTempSubgroup(key, 'max', e.target.value)}
                              min="1"
                              className="w-24 bg-white/10 border border-white/20 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        setTempConfig(config);
                      }}
                      className="flex-1 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfigSave}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/20">
                    <button
                      onClick={resetAll}
                      className="w-full bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-400 py-3 rounded-lg font-semibold hover:bg-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Reset All Data
                    </button>
                    <p className="text-white/40 text-xs text-center mt-2">
                      This will clear all done, skipped, and bookmarked items
                    </p>
                  </div>
                </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 text-center">
          <p className="text-white/60 text-sm mb-2">
            © 2025 <span className="text-white font-semibold">Pranav Singh</span>
          </p>
          <div className="flex justify-center gap-4 text-xs text-white/50">
            <a
              href="https://github.com/pranavsinghpatil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              GitHub: @pranavsinghpatil
            </a>
            <span className="text-white/30">•</span>
            <a
              href="https://x.com/pranavenv"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              X: @pranavenv
            </a>
            <span className="text-white/30">•</span>
            <a
              href="https://prnav.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/80 transition-colors"
            >
              prnav.me
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;