// Full script for FFXIVContentTracker with FC member checklist integration
import React, { useState, useEffect } from 'react';
import { Search, Users, Trophy, Download, Filter, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

const FFXIVContentTracker = () => {
  const [content, setContent] = useState({ mounts: [], achievements: [], minions: [] });
  const [fcMembers, setFcMembers] = useState([]);
  const [newMember, setNewMember] = useState('');
  const [selectedDataCenter, setSelectedDataCenter] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [fcSearchName, setFcSearchName] = useState('');
  const [fcSearchDataCenter, setFcSearchDataCenter] = useState('');
  const [fcSearchServer, setFcSearchServer] = useState('');
  const [fcSearchResults, setFcSearchResults] = useState([]);
  const [selectedFC, setSelectedFC] = useState(null);
  const [loadingFCSearch, setLoadingFCSearch] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState('mounts');
  const [filterBy, setFilterBy] = useState('missing');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [syncingMembers, setSyncingMembers] = useState(new Set());
  const [syncErrors, setSyncErrors] = useState({});
  const [lastSyncTimes, setLastSyncTimes] = useState({});
  const [fcMemberList, setFcMemberList] = useState([]);
  const [selectedFCMembers, setSelectedFCMembers] = useState([]);
  const [selectedSource, setSelectedSource] = useState('all');
  const [accordionOpen, setAccordionOpen] = useState(false);
  
  // FFXIV Data Centers and Servers
  const dataCenters = {
    'North America': {
      'Aether': ['Adamantoise', 'Cactuar', 'Faerie', 'Gilgamesh', 'Jenova', 'Midgardsormr', 'Sargatanas', 'Siren'],
      'Crystal': ['Balmung', 'Brynhildr', 'Coeurl', 'Diabolos', 'Goblin', 'Malboro', 'Mateus', 'Zalera'],
      'Dynamis': ['Halicarnassus', 'Maduin', 'Marilith', 'Seraph'],
      'Primal': ['Behemoth', 'Excalibur', 'Exodus', 'Famfrit', 'Hyperion', 'Lamia', 'Leviathan', 'Ultros']
    },
    'Europe': {
      'Chaos': ['Cerberus', 'Louisoix', 'Moogle', 'Omega', 'Phantom', 'Ragnarok', 'Sagittarius', 'Spriggan'],
      'Light': ['Alpha', 'Lich', 'Odin', 'Phoenix', 'Raiden', 'Shiva', 'Twintania', 'Zodiark']
    },
    'Japan': {
      'Elemental': ['Aegis', 'Atomos', 'Carbuncle', 'Garuda', 'Gungnir', 'Kujata', 'Tonberry', 'Typhon'],
      'Gaia': ['Alexander', 'Bahamut', 'Durandal', 'Fenrir', 'Ifrit', 'Ridill', 'Tiamat', 'Ultima'],
      'Mana': ['Anima', 'Asura', 'Chocobo', 'Hades', 'Ixion', 'Masamune', 'Pandaemonium', 'Titan']
    },
    'Oceania': {
      'Materia': ['Bismarck', 'Ravana', 'Sephirot', 'Sophia', 'Zurvan']
    }
  };

  const getServersForDataCenter = () => {
    if (!selectedDataCenter) return [];
    const region = Object.keys(dataCenters).find(region => 
      Object.keys(dataCenters[region]).includes(selectedDataCenter)
    );
    return region ? dataCenters[region][selectedDataCenter] : [];
  };

  const getServersForSearchDataCenter = () => {
    if (!fcSearchDataCenter) return [];
    const region = Object.keys(dataCenters).find(region => 
      Object.keys(dataCenters[region]).includes(fcSearchDataCenter)
    );
    return region ? dataCenters[region][fcSearchDataCenter] : [];
  };

  // Dynamic content sources - will be populated from API data
  const [contentSources, setContentSources] = useState(['all']); 
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://ffxiv-fc-tracker.vercel.app/api' 
    : '/api';

  useEffect(() => { loadContentFromAPI(); }, []);

  const loadContentFromAPI = async (contentType = null) => {
    const types = contentType ? [contentType] : ['mounts', 'minions', 'achievements'];
    setLoading(true);
    try {
      const promises = types.map(type => 
        fetch(`${API_BASE}/content/${type}`)
          .then(res => res.json())
          .then(data => ({ type, data: data.data || [] }))
          .catch(err => ({ type, data: [], error: err.message }))
      );
      const results = await Promise.all(promises);
      setContent(prev => {
        const newContent = { ...prev };
        results.forEach(({ type, data, error }) => {
          if (!error) newContent[type] = data;
        });
        return newContent;
      });
      
      // Update content sources based on loaded data
      updateContentSources();
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique source types from all content types
  const updateContentSources = () => {
    const allSources = new Set(['all']);
    
    Object.values(content).forEach(items => {
      items.forEach(item => {
        if (item.sources && Array.isArray(item.sources)) {
          item.sources.forEach(source => {
            if (source.type) {
              allSources.add(source.type);
            }
          });
        }
      });
    });
    
    setContentSources([...allSources].sort());
  };

  // Update sources when content changes
  useEffect(() => {
    updateContentSources();
  }, [content]);

  const searchCharacter = async (name, server) => {
    const response = await fetch(`${API_BASE}/character/search?name=${encodeURIComponent(name)}&server=${encodeURIComponent(server)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0] || null;
  };

  const fetchCharacterData = async (lodestoneId) => {
    const response = await fetch(`${API_BASE}/character/${lodestoneId}`);
    if (!response.ok) throw new Error('Character not found');
    return await response.json();
  };

  const matchCollectionsToContent = (collections) => {
    const completedByType = {
      mounts: new Set(),
      minions: new Set(), 
      achievements: new Set()
    };
    
    ['mounts', 'minions', 'achievements'].forEach(type => {
      const collectionItems = collections[type] || [];
      const contentItems = content[type] || [];
      
      collectionItems.forEach(item => {
        // Try exact name match first
        let match = contentItems.find(c => c.name === item.name);
        
        // If no exact match, try case-insensitive
        if (!match) {
          match = contentItems.find(c => c.name.toLowerCase() === item.name.toLowerCase());
        }
        
        // If still no match, try fuzzy matching (remove special characters)
        if (!match) {
          const cleanItemName = item.name.replace(/[^\w\s]/gi, '').toLowerCase();
          match = contentItems.find(c => 
            c.name.replace(/[^\w\s]/gi, '').toLowerCase() === cleanItemName
          );
        }
        
        if (match) {
          completedByType[type].add(match.id);
          console.log(`Matched: "${item.name}" -> "${match.name}" (ID: ${match.id})`);
        }
      });
    });
    
    return completedByType;
  };

  const syncMemberProgress = async (memberId) => {
    const member = fcMembers.find(m => m.id === memberId);
    if (!member) return;
    setSyncingMembers(prev => new Set(prev).add(memberId));
    setSyncErrors(prev => ({ ...prev, [memberId]: null }));
    try {
      let lodestoneId = member.lodestoneId;
      if (!lodestoneId) {
        const result = await searchCharacter(member.name, member.server);
        if (!result) throw new Error('Character not found');
        lodestoneId = result.lodestoneId;
        setFcMembers(prev => prev.map(m => m.id === memberId ? { ...m, lodestoneId } : m));
      }
      const data = await fetchCharacterData(lodestoneId);
      console.log('Full character data received:', data);
      console.log('Portrait field:', data.portrait);
      console.log('Avatar field:', data.avatar);
      console.log('Available fields:', Object.keys(data));
      const completedByType = matchCollectionsToContent(data.collections);
      setFcMembers(prev => prev.map(m => m.id === memberId ? { 
        ...m, 
        completedContent: completedByType, 
        lodestoneId, 
        avatar: data.portrait || data.avatar
      } : m));
      setLastSyncTimes(prev => ({ ...prev, [memberId]: new Date() }));
    } catch (error) {
      setSyncErrors(prev => ({ ...prev, [memberId]: error.message }));
    } finally {
      setSyncingMembers(prev => { const newSet = new Set(prev); newSet.delete(memberId); return newSet; });
    }
  };

  const syncAllMembers = async () => {
    for (const member of fcMembers) {
      await syncMemberProgress(member.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const addMember = () => {
    const name = newMember.trim();
    if (name && selectedServer) {
      setFcMembers([...fcMembers, { 
        name: name, 
        server: selectedServer, 
        id: Date.now(), 
        completedContent: { mounts: new Set(), minions: new Set(), achievements: new Set() }, 
        lodestoneId: null 
      }]);
      setNewMember('');
      setSelectedDataCenter('');
      setSelectedServer('');
    }
  };

  const removeMember = (id) => setFcMembers(fcMembers.filter(m => m.id !== id));

  const toggleMemberCompletion = (memberId, contentId) => {
    setFcMembers(fcMembers.map(member => {
      if (member.id === memberId) {
        const newCompleted = new Set(member.completedContent);
        newCompleted.has(contentId) ? newCompleted.delete(contentId) : newCompleted.add(contentId);
        return { ...member, completedContent: newCompleted };
      }
      return member;
    }));
  };

  const searchFreeCompanies = async () => {
    if (!fcSearchName.trim() || !fcSearchServer) return;
    
    setLoadingFCSearch(true);
    setFcSearchResults([]);
    try {
      const response = await fetch(`${API_BASE}/freecompany/search?name=${encodeURIComponent(fcSearchName)}&server=${encodeURIComponent(fcSearchServer)}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setFcSearchResults(data);
      } else {
        console.error('FC search error:', data.error);
        setFcSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to search FCs:', err);
      setFcSearchResults([]);
    } finally {
      setLoadingFCSearch(false);
    }
  };

  const fetchFCMembers = async (fcId) => {
    try {
      const response = await fetch(`${API_BASE}/freecompany/${fcId}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(data.error || 'Unexpected response from server');
      setFcMemberList(data);
      setAccordionOpen(true);
    } catch (err) {
      console.error('Failed to fetch FC members:', err);
    }
  };

  const toggleFCMemberSelection = (member) => {
    setSelectedFCMembers(prev => prev.includes(member) ? prev.filter(m => m !== member) : [...prev, member]);
  };

  const addSelectedFCMembers = () => {
    const existingIds = new Set(fcMembers.map(m => m.lodestoneId));
    const newMembers = selectedFCMembers.filter(m => !existingIds.has(m.lodestoneId)).map(m => ({
      ...m,
      id: Date.now() + Math.random(),
      server: m.server || '',
      completedContent: { mounts: new Set(), minions: new Set(), achievements: new Set() },
      lodestoneId: m.lodestoneId || null
    }));

    setFcMembers(prev => [...prev, ...newMembers]);
    setSelectedFCMembers([]);
    setAccordionOpen(false);
  };

  const filteredContent = content[selectedContentType]
    .filter(item => {
      const ownedCount = fcMembers.filter(m => m.completedContent?.[selectedContentType]?.has(item.id)).length;
      const matchesFilter = filterBy === 'missing' ? ownedCount < fcMembers.length : ownedCount === fcMembers.length;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Check if item matches selected source type
      let matchesSource = selectedSource === 'all';
      if (!matchesSource && item.sources && Array.isArray(item.sources)) {
        matchesSource = item.sources.some(source => source.type === selectedSource);
      }
      
      return matchesFilter && matchesSearch && matchesSource;
    });

  const getCompletionStats = (member) => {
    const currentContent = content[selectedContentType] || [];
    const memberCompleted = member.completedContent?.[selectedContentType] || new Set();
    const completed = currentContent.filter(item => memberCompleted.has(item.id)).length;
    const total = currentContent.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">FC Tracker</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Free Company Members Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Free Company Members</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              placeholder="Character Name (e.g., Cloud Strife)"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={selectedDataCenter}
              onChange={(e) => {
                setSelectedDataCenter(e.target.value);
                setSelectedServer(''); // Reset server when data center changes
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Data Center</option>
              {Object.keys(dataCenters).map(region => (
                <optgroup key={region} label={region}>
                  {Object.keys(dataCenters[region]).map(dc => (
                    <option key={dc} value={dc}>{dc}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              disabled={!selectedDataCenter}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Server</option>
              {getServersForDataCenter().map(server => (
                <option key={server} value={server}>{server}</option>
              ))}
            </select>
            
            <button 
              onClick={addMember} 
              disabled={!newMember.trim() || !selectedServer}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Member
            </button>
          </div>
          
          <div className="flex gap-3 mb-4">
            <button 
              onClick={syncAllMembers} 
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Search for Free Company</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                type="text"
                placeholder="FC Name (e.g., Maelstrom)"
                value={fcSearchName}
                onChange={(e) => setFcSearchName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <select
                value={fcSearchDataCenter}
                onChange={(e) => {
                  setFcSearchDataCenter(e.target.value);
                  setFcSearchServer(''); // Reset server when data center changes
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Data Center</option>
                {Object.keys(dataCenters).map(region => (
                  <optgroup key={region} label={region}>
                    {Object.keys(dataCenters[region]).map(dc => (
                      <option key={dc} value={dc}>{dc}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              
              <select
                value={fcSearchServer}
                onChange={(e) => setFcSearchServer(e.target.value)}
                disabled={!fcSearchDataCenter}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Server</option>
                {getServersForSearchDataCenter().map(server => (
                  <option key={server} value={server}>{server}</option>
                ))}
              </select>
              
              <button 
                onClick={searchFreeCompanies}
                disabled={!fcSearchName.trim() || !fcSearchServer || loadingFCSearch}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingFCSearch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Search FCs'
                )}
              </button>
            </div>

            {/* FC Search Results */}
            {fcSearchResults.length > 0 && (
              <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Found Free Companies:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fcSearchResults.map((fc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded border hover:shadow-sm">
                      <div>
                        <div className="font-medium text-gray-900">{fc.name}</div>
                        <div className="text-sm text-gray-600">{fc.server} • {fc.tag || 'No tag'}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFC(fc);
                          fetchFCMembers(fc.id);
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                      >
                        Load Members
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected FC Info */}
            {selectedFC && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">Selected FC: {selectedFC.name}</div>
                <div className="text-sm text-blue-700">{selectedFC.server} • {selectedFC.tag || 'No tag'}</div>
              </div>
            )}
            
            {accordionOpen && fcMemberList.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold mb-3">Add Members from {selectedFC?.name || 'FC'}</h3>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {fcMemberList.map((member, i) => (
                    <label key={i} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFCMembers.includes(member)}
                        onChange={() => toggleFCMemberSelection(member)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{member.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={addSelectedFCMembers} 
                    className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Add Selected Members
                  </button>
                  <button 
                    onClick={() => {
                      setAccordionOpen(false);
                      setSelectedFCMembers([]);
                    }} 
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Member Cards */}
          {fcMembers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fcMembers.map((member) => {
                const stats = getCompletionStats(member);
                const isSync = syncingMembers.has(member.id);
                const error = syncErrors[member.id];
                const lastSync = lastSyncTimes[member.id];
                
                return (
                  <div key={member.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {member.avatar ? (
                          <img 
                            src={member.avatar} 
                            alt={`${member.name} avatar`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                        {member.server && member.server !== '???' && (
                          <p className="text-sm text-gray-600">@{member.server}</p>
                        )}
                        
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{stats.completed}/{stats.total} ({stats.percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                        </div>

                        {error && (
                          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {error}
                          </div>
                        )}

                        {lastSync && (
                          <div className="mt-1 text-xs text-gray-500">
                            Last sync: {lastSync.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => syncMemberProgress(member.id)}
                          disabled={isSync}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Sync progress"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSync ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          title="Remove member"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Content Type:</span>
            </div>
            <select 
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="mounts">Mounts</option>
              <option value="minions">Minions</option>
              <option value="achievements">Achievements</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Filter:</span>
            </div>
            <select 
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="missing">Missing by FC Members</option>
              <option value="owned">Owned by FC Members</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Source:</span>
            </div>
            <select 
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {contentSources.map(source => (
                <option key={source} value={source}>
                  {source === 'all' ? 'All Sources' : source}
                </option>
              ))}
            </select>

            <button 
              onClick={() => loadContentFromAPI(selectedContentType)} 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Refresh Content
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Collection */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Collection</h2>
            <span className="text-sm text-gray-500">({filteredContent.length} items)</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredContent.map((item) => {
              const completedMembers = fcMembers.filter(m => m.completedContent?.[selectedContentType]?.has(item.id));
              const completionRate = fcMembers.length > 0 ? Math.round((completedMembers.length / fcMembers.length) * 100) : 0;
              
              return (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{item.description || 'Summon forth your collectible.'}</p>
                      
                      {item.sources && item.sources.length > 0 && (
                        <div className="text-sm text-blue-600 mb-2">
                          <strong>Source:</strong> {item.sources[0].text}
                        </div>
                      )}
                      
                      {item.patch && (
                        <div className="text-sm text-gray-500 mb-3">
                          Patch {item.patch}
                        </div>
                      )}

                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Member Progress:</div>
                        <div className="flex flex-wrap gap-1">
                          {fcMembers.map((member) => {
                            const hasCompleted = member.completedContent?.[selectedContentType]?.has(item.id);
                            return (
                              <span
                                key={member.id}
                                className={`px-2 py-1 rounded-full text-xs text-white ${
                                  hasCompleted ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                              >
                                {member.name.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-gray-900">
                        {completedMembers.length}/{fcMembers.length}
                      </div>
                      <div className="text-xs text-gray-600">completed</div>
                      <div className="text-xs text-gray-500">{completionRate}% FC completion</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No content found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FFXIVContentTracker;
