import React, { useState, useEffect } from 'react';
import { Shuffle, Check, SkipForward, Bookmark, Trash2, List, Download, Settings, X, Lock } from 'lucide-react';

const DEFAULT_CONFIG = {
  topics: [
    {
      name: "General Arithmetic",
      subgroups: { QC: 51, PS: 50, MAC: 36, NE: 35 }
    },
    {
      name: "Sequences And Series",
      subgroups: { QC: 37, PS: 45, MAC: 9, NE: 14 }
    },
    {
      name: "Exponents & Roots",
      subgroups: { QC: 53, PS: 51, MAC: 34, NE: 40 }
    },
    {
      name: "Percentages",
      subgroups: { QC: 40, PS: 50, MAC: 13, NE: 42 }
    },
    {
      name: "Single AND Compound Interest",
      subgroups: { QC: 14, PS: 23, MAC: 1, NE: 5 }
    },
    {
      name: "Overlapping Sets",
      subgroups: { QC: 27, PS: 52, MAC: 18, NE: 7 }
    },
    {
      name: "Number system",
      subgroups: { QC: 101, PS: 81, MAC: 41, NE: 47 }
    },
    {
      name: "Equations + Ratios",
      subgroups: { QC: 29, PS: 43, MAC: 0, NE: 8 }
    },
    {
      name: "Inequalities and Modulus",
      subgroups: { QC: 60, PS: 59, MAC: 37, NE: 14 }
    },
    {
      name: "Statistics",
      subgroups: { QC: 64, PS: 72, MAC: 34, NE: 25 }
    },
    {
      name: "Permutations and Combinations",
      subgroups: { QC: 36, PS: 59, MAC: 10, NE: 38 }
    },
    {
      name: "Probability",
      subgroups: { QC: 72, PS: 40, MAC: 11, NE: 34 }
    },
    {
      name: "Coordinate Geometry and Functions",
      subgroups: { QC: 65, PS: 67, MAC: 53, NE: 22 }
    },
    {
      name: "Speed, Time, Distance and Work Rate",
      subgroups: { QC: 60, PS: 75, MAC: 9, NE: 27 }
    },
    {
      name: "Geometry",
      subgroups: { QC: 107, PS: 80, MAC: 0, DIA: 38 }
    },
    {
      name: "Data Interpretation Sets",
      subgroups: { QC: 107, PS: 80, MAC: 71, NE: 0 }
    },
    {
      name: "Miscellaneous",
      subgroups: { QC: 20, PS: 20, MAC: 20, NE: 20 }
    }
  ]
};

export default function RandomNumberGenerator() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [doneNumbers, setDoneNumbers] = useState(new Set());
  const [bookmarkedNumbers, setBookmarkedNumbers] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [stats, setStats] = useState({ remaining: 0, done: 0, bookmarked: 0 });
  const [skippedNumbers, setSkippedNumbers] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [tempConfig, setTempConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    const loadData = async () => {
      try {
        const configResult = await window.storage.get('app-config', true);
        const doneResult = await window.storage.get('done-numbers', true);
        const bookmarkResult = await window.storage.get('bookmarked-numbers', true);
        const skippedResult = await window.storage.get('skipped-numbers', true);
        
        if (configResult?.value) {
          setConfig(JSON.parse(configResult.value));
          setTempConfig(JSON.parse(configResult.value));
        }
        if (doneResult?.value) {
          setDoneNumbers(new Set(JSON.parse(doneResult.value)));
        }
        if (bookmarkResult?.value) {
          setBookmarkedNumbers(JSON.parse(bookmarkResult.value));
        }
        if (skippedResult?.value) {
          setSkippedNumbers(JSON.parse(skippedResult.value));
        }
      } catch (error) {
        console.log('No saved data found, starting fresh');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let total = 0;
    for (const topic of config.topics) {
      for (const count of Object.values(topic.subgroups)) {
        total += count;
      }
    }
    
    setStats({
      remaining: total - doneNumbers.size,
      done: doneNumbers.size,
      bookmarked: bookmarkedNumbers.length,
      total: total
    });
  }, [doneNumbers, bookmarkedNumbers, config]);

  const generateKey = (topicIndex, subgroup, number) => `${topicIndex}-${subgroup}-${number}`;

  const generateRandom = () => {
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const topicIndex = Math.floor(Math.random() * config.topics.length);
      const topic = config.topics[topicIndex];
      
      const availableSubgroups = Object.entries(topic.subgroups).filter(([_, count]) => count > 0);
      if (availableSubgroups.length === 0) continue;
      
      const [subgroup, maxCount] = availableSubgroups[Math.floor(Math.random() * availableSubgroups.length)];
      const number = Math.floor(Math.random() * maxCount) + 1;
      
      const key = generateKey(topicIndex, subgroup, number);
      
      if (!doneNumbers.has(key)) {
        setCurrentNumber({ 
          topicIndex, 
          topicName: topic.name,
          subgroup, 
          number, 
          key 
        });
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
      await window.storage.set('done-numbers', JSON.stringify([...newDone]), true);
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
      await window.storage.set('skipped-numbers', JSON.stringify(newSkipped), true);
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
      await window.storage.set('bookmarked-numbers', JSON.stringify(newBookmarks), true);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
    
    setCurrentNumber(null);
  };

  const removeBookmark = async (index) => {
    const newBookmarks = bookmarkedNumbers.filter((_, i) => i !== index);
    setBookmarkedNumbers(newBookmarks);
    
    try {
      await window.storage.set('bookmarked-numbers', JSON.stringify(newBookmarks), true);
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
        await window.storage.delete('done-numbers', true);
        await window.storage.delete('bookmarked-numbers', true);
        await window.storage.delete('skipped-numbers', true);
      } catch (error) {
        console.error('Failed to reset:', error);
      }
    }
  };

  const downloadData = () => {
    const allCombinations = [];
    
    config.topics.forEach((topic, topicIndex) => {
      Object.entries(topic.subgroups).forEach(([subgroup, maxCount]) => {
        for (let number = 1; number <= maxCount; number++) {
          const key = generateKey(topicIndex, subgroup, number);
          let status = 'Remaining';
          
          if (doneNumbers.has(key)) {
            status = 'Done';
          } else if (bookmarkedNumbers.some(b => b.key === key)) {
            status = 'Bookmarked';
          } else if (skippedNumbers.some(s => s.key === key)) {
            status = 'Skipped';
          }
          
          allCombinations.push({
            Topic: topic.name,
            Subgroup: subgroup,
            Number: number,
            Status: status
          });
        }
      });
    });
    
    const headers = ['Topic', 'Subgroup', 'Number', 'Status'];
    const csvContent = [
      headers.join(','),
      ...allCombinations.map(row => 
        `"${row.Topic}",${row.Subgroup},${row.Number},${row.Status}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gre-quant-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAuthSubmit = () => {
    if (authKey === 'randombuiltbypranav') {
      setIsAuthenticated(true);
      setAuthKey('');
    } else {
      alert('Invalid authentication key!');
      setAuthKey('');
    }
  };

  const handleConfigSave = async () => {
    if (window.confirm('Are you sure you want to change the configuration? This will download your current data first.')) {
      downloadData();
      
      setConfig(tempConfig);
      try {
        await window.storage.set('app-config', JSON.stringify(tempConfig), true);
        alert('Configuration updated successfully!');
        setShowSettings(false);
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Failed to save config:', error);
        alert('Failed to save configuration');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-3 sm:p-4 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-grow">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 mb-3 sm:mb-4 border border-white/20">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              GRE Quant Generator
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
                <p className="text-base sm:text-lg">Click below to generate a random question</p>
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
                <div className="text-white/80 text-sm sm:text-base mb-2 font-medium">
                  {currentNumber.topicName}
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
                  {currentNumber.subgroup} #{currentNumber.number}
                </div>
                <div className="text-white/60 text-xs sm:text-sm">
                  Topic {currentNumber.topicIndex + 1} • {currentNumber.subgroup} • Question {currentNumber.number}
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
              Bookmarked Questions
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
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm sm:text-base">
                        {item.subgroup} #{item.number}
                      </div>
                      <div className="text-white/60 text-xs">{item.topicName}</div>
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
                    setIsAuthenticated(false);
                    setAuthKey('');
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {!isAuthenticated ? (
                <div>
                  <div className="mb-4">
                    <label className="block text-white/80 mb-2 text-sm">
                      <Lock className="inline mr-2" size={16} />
                      Enter Authentication Key
                    </label>
                    <input
                      type="password"
                      value={authKey}
                      onChange={(e) => setAuthKey(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAuthSubmit()}
                      placeholder="Enter key to unlock settings"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleAuthSubmit}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95"
                  >
                    Authenticate
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="text-white/80 mb-3 text-sm font-semibold">Configuration Info</h3>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-2 text-sm text-white/70">
                      <div>Total Topics: {config.topics.length}</div>
                      <div>Total Questions: {stats.total}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowSettings(false);
                        setIsAuthenticated(false);
                      }}
                      className="flex-1 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-semibold hover:bg-white/20 transition-all active:scale-95"
                    >
                      Close
                    </button>
                    <button
                      onClick={downloadData}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all active:scale-95"
                    >
                      Download Data
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
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 text-center">
          <p className="text-white/60 text-sm mb-2">
            © 2025 <span className="text-white font-semibold">Pranav Singh</span>
          </p>
          <div className="flex justify-center gap-4 text-xs text-white/50 flex-wrap">
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