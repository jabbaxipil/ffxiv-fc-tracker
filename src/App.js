// Updated React component with Vercel API integration
import React, { useState, useEffect } from 'react';
import { Search, Users, Trophy, Download, Filter, Star, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

const FFXIVContentTracker = () => {
  const [content, setContent] = useState({ mounts: [], achievements: [], minions: [] });
  const [fcMembers, setFcMembers] = useState([]);
  const [newMember, setNewMember] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('mounts');
  const [filterBy, setFilterBy] = useState('missing');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [syncingMembers, setSyncingMembers] = useState(new Set());
  const [syncErrors, setSyncErrors] = useState({});
  const [lastSyncTimes, setLastSyncTimes] = useState({});

  // API base URL - will be your Vercel deployment URL
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://ffxiv-fc-tracker.vercel.app/api' 
    : '/api';

  // Initialize with sample data
  useEffect(() => {
    loadContentFromAPI();
  }, []);

  // Load content data from FFXIVCollect via Vercel API
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
          if (!error) {
            newContent[type] = data;
          } else {
            console.error(`Failed to load ${type}:`, error);
          }
        });
        return newContent;
      });
      
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search for character using Vercel API
  const searchCharacter = async (name, server) => {
    try {
      console.log(`🔍 Searching for character: "${name}" on server: "${server}"`);
      
      const response = await fetch(
        `${API_BASE}/character/search?name=${encodeURIComponent(name)}&server=${encodeURIComponent(server)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        console.log('✅ Found character(s):', data.results);
        return data.results[0]; // Return first result
      }
      
      return null;
      
    } catch (error) {
      console.error('Character search error:', error);
      throw error;
    }
  };

  // Fetch character data using Vercel API
  const fetchCharacterData = async (lodestoneId) => {
    try {
      console.log(`📡 Fetching character data for Lodestone ID: ${lodestoneId}`);
      
      const response = await fetch(`${API_BASE}/character/${lodestoneId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error('Character profile is private');
        }
        if (response.status === 404) {
          throw new Error('Character not found');
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const characterData = await response.json();
      console.log('✅ Character data received:', characterData);
      
      return characterData;
      
    } catch (error) {
      console.error('Character fetch error:', error);
      throw error;
    }
  };

  // Match character collections with FFXIVCollect content database
  const matchCollectionsToContent = (characterCollections) => {
    const completedIds = new Set();
    
    console.log("🔍 Matching mounts:");
    characterCollections.mounts?.forEach(mount => {
      const match = content.mounts.find(c =>
        c.name.toLowerCase() === mount.name.toLowerCase()
      );
      console.log(`  → Character has mount: "${mount.name}" — Match found: ${!!match}`);
    });

    console.log("🔍 Matching minions:");
    characterCollections.minions?.forEach(minion => {
      const match = content.minions.find(c =>
        c.name.toLowerCase() === minion.name.toLowerCase()
      );
      console.log(`  → Character has minion: "${minion.name}" — Match found: ${!!match}`);
    });

    console.log("🔍 Matching achievements:");
    characterCollections.achievements?.forEach(achievement => {
      const match = content.achievements.find(c =>
        c.name.toLowerCase() === achievement.name.toLowerCase()
      );
      console.log(`  → Character has achievement: "${achievement.name}" — Match found: ${!!match}`);
    });

    // Match mounts by name
    if (characterCollections.mounts) {
      characterCollections.mounts.forEach(mount => {
        const matchedMount = content.mounts.find(contentMount => 
          contentMount.name.toLowerCase() === mount.name.toLowerCase()
        );
        if (matchedMount) {
          completedIds.add(matchedMount.id);
        }
      });
    }
    
    // Match minions by name  
    if (characterCollections.minions) {
      characterCollections.minions.forEach(minion => {
        const matchedMinion = content.minions.find(contentMinion => 
          contentMinion.name.toLowerCase() === minion.name.toLowerCase()
        );
        if (matchedMinion) {
          completedIds.add(matchedMinion.id);
        }
      });
    }
    
    // Match achievements by name
    if (characterCollections.achievements) {
      characterCollections.achievements.forEach(achievement => {
        const matchedAchievement = content.achievements.find(contentAchievement => 
          contentAchievement.name.toLowerCase() === achievement.name.toLowerCase()
        );
        if (matchedAchievement) {
          completedIds.add(matchedAchievement.id);
        }
      });
    }
    
    return completedIds;
  };

  // Enhanced sync function using Vercel APIs
  const syncMemberProgress = async (memberId) => {
    const member = fcMembers.find(m => m.id === memberId);
    if (!member) return;

    setSyncingMembers(prev => new Set(prev).add(memberId));
    setSyncErrors(prev => ({ ...prev, [memberId]: null }));

    try {
      console.log(`🚀 Starting sync for ${member.name}@${member.server}`);
      
      // Step 1: Get Lodestone ID if we don't have it
      let lodestoneId = member.lodestoneId;
      
      if (!lodestoneId) {
        console.log(`🔍 Looking up Lodestone ID for ${member.name}@${member.server}`);
        
        const characterResult = await searchCharacter(member.name, member.server);
        
        if (!characterResult) {
          throw new Error(
            `Character "${member.name}" not found on server "${member.server}".\n\n` +
            `Please verify:\n` +
            `• Character name spelling and capitalization\n` +
            `• Server name is correct\n` +
            `• Character exists and has logged in recently`
          );
        }
        
        lodestoneId = characterResult.lodestoneId;
        console.log(`✅ Found Lodestone ID: ${lodestoneId}`);
        
        // Update member with Lodestone ID
        setFcMembers(prev => prev.map(m => 
          m.id === memberId 
            ? { ...m, lodestoneId }
            : m
        ));
      } else {
        console.log(`📋 Using cached Lodestone ID: ${lodestoneId}`);
      }

      // Step 2: Get character collection data
      const characterData = await fetchCharacterData(lodestoneId);
      
      if (!characterData) {
        throw new Error('Failed to fetch character data');
      }

      // Step 3: Match collections to content database
      const completedIds = matchCollectionsToContent(characterData.collections);

      console.log(`🎉 Successfully synced ${completedIds.size} items for ${member.name}`);

      // Update member's completed content
      setFcMembers(prev => prev.map(m => 
        m.id === memberId 
          ? { 
              ...m, 
              completedContent: completedIds, 
              lodestoneId,
              avatar: characterData.avatar
            }
          : m
      ));

      // Update last sync time
      setLastSyncTimes(prev => ({ ...prev, [memberId]: new Date() }));

    } catch (error) {
      console.error('💥 Sync error:', error);
      setSyncErrors(prev => ({ ...prev, [memberId]: error.message }));
    } finally {
      setSyncingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    }
  };

  const syncAllMembers = async () => {
    for (const member of fcMembers) {
      await syncMemberProgress(member.id);
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const addMember = () => {
    if (newMember.trim()) {
      const [name, server] = newMember.split('@');
      if (name && server) {
        setFcMembers([...fcMembers, {
          name: name.trim(),
          server: server.trim(),
          id: Date.now(),
          completedContent: new Set(),
          lodestoneId: null
        }]);
        setNewMember('');
      }
    }
  };

  const removeMember = (id) => {
    setFcMembers(fcMembers.filter(m => m.id !== id));
  };

  const toggleMemberCompletion = (memberId, contentId) => {
    setFcMembers(fcMembers.map(member => {
      if (member.id === memberId) {
        const newCompleted = new Set(member.completedContent);
        if (newCompleted.has(contentId)) {
          newCompleted.delete(contentId);
        } else {
          newCompleted.add(contentId);
        }
        return { ...member, completedContent: newCompleted };
      }
      return member;
    }));
  };

  const generateSuggestions = () => {
    const currentContent = content[selectedContentType] || [];
    const suggestions = [];

    currentContent.forEach(item => {
      const completedBy = fcMembers.filter(member => 
        member.completedContent.has(item.id)
      ).length;
      const totalMembers = fcMembers.length;
      const completionRate = totalMembers > 0 ? (completedBy / totalMembers) * 100 : 0;

      if (filterBy === 'missing' && completionRate < 100) {
        suggestions.push({
          ...item,
          completedBy,
          totalMembers,
          completionRate,
          priority: 100 - completionRate
        });
      } else if (filterBy === 'all') {
        suggestions.push({
          ...item,
          completedBy,
          totalMembers,
          completionRate,
          priority: 100 - completionRate
        });
      }
    });

    suggestions.sort((a, b) => b.priority - a.priority);
    setSuggestions(suggestions);
  };

  useEffect(() => {
    generateSuggestions();
  }, [fcMembers, selectedContentType, filterBy, content]);

  const filteredSuggestions = suggestions.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Users className="text-blue-600" />
          FFXIV Free Company Content Tracker
        </h1>
        <p className="text-gray-600">Track your FC's progress with live Lodestone data via Vercel serverless functions</p>
      </div>

      {/* FC Members Management */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="text-green-600" />
          Free Company Members
        </h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Character Name@Server (e.g., Cloud Strife@Excalibur)"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addMember()}
          />
          <button
            onClick={addMember}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Member
          </button>
          <button
            onClick={syncAllMembers}
            disabled={syncingMembers.size > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={syncingMembers.size > 0 ? 'animate-spin' : ''} />
            Sync All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fcMembers.map(member => (
            <div key={member.id} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {member.avatar && (
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-6 h-6 rounded"
                      />
                    )}
                    {member.name}
                  </div>
                  <div className="text-sm text-gray-600">{member.server}</div>
                  {member.lodestoneId && (
                    <div className="text-xs text-blue-600">
                      Lodestone ID: {member.lodestoneId}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {member.completedContent.size} items completed
                  </div>
                  {lastSyncTimes[member.id] && (
                    <div className="text-xs text-green-600">
                      Synced: {lastSyncTimes[member.id].toLocaleTimeString()}
                    </div>
                  )}
                  {syncErrors[member.id] && (
                    <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} />
                      <span className="whitespace-pre-line">{syncErrors[member.id]}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => syncMemberProgress(member.id)}
                    disabled={syncingMembers.has(member.id)}
                    className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                    title="Sync from Lodestone"
                  >
                    <RefreshCw size={16} className={syncingMembers.has(member.id) ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove member"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Selection and Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-purple-600" />
            <label className="font-medium">Content Type:</label>
            <select
              value={selectedContentType}
              onChange={(e) => setSelectedContentType(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="mounts">Mounts</option>
              <option value="achievements">Achievements</option>
              <option value="minions">Minions</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-medium">Filter:</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="missing">Missing by FC Members</option>
              <option value="all">All Content</option>
            </select>
          </div>

          <button
            onClick={() => loadContentFromAPI(selectedContentType)}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Download size={16} />
            {loading ? 'Loading...' : 'Refresh Content'}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Content Suggestions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-600" />
          Content Suggestions
          <span className="text-sm font-normal text-gray-600">
            ({filteredSuggestions.length} items)
          </span>
        </h2>

        <div className="space-y-4">
          {filteredSuggestions.map(item => (
            <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  {item.sources && item.sources.length > 0 && (
                    <div className="text-sm text-blue-600 mb-2">
                      <strong>Source:</strong> {item.sources[0].text}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Patch {item.patch} • {item.category || item.difficulty || 'Unknown difficulty'}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-purple-600">
                    {item.completedBy}/{item.totalMembers}
                  </div>
                  <div className="text-sm text-gray-600">completed</div>
                  <div className="text-xs text-gray-500">
                    {item.completionRate.toFixed(0)}% FC completion
                  </div>
                </div>
              </div>

              {/* Member completion status */}
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Member Progress:</div>
                <div className="flex flex-wrap gap-2">
                  {fcMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => toggleMemberCompletion(member.id, item.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        member.completedContent.has(item.id)
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {member.completedContent.has(item.id) ? (
                        <CheckCircle size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
            <p>No content found matching your criteria.</p>
            <p className="text-sm">Try adjusting your filters or adding more FC members.</p>
          </div>
        )}
      </div>

      {/* Vercel Integration Info */}
      <div className="mt-6 bg-green-50 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">🚀 Vercel Serverless Integration:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• <strong>Character Search:</strong> Direct Lodestone parsing via /api/character/search</li>
          <li>• <strong>Character Data:</strong> Live collection data via /api/character/[id]</li>
          <li>• <strong>Content Database:</strong> FFXIVCollect integration via /api/content/[type]</li>
          <li>• <strong>No Backend Required:</strong> Everything runs on Vercel serverless functions</li>
          <li>• <strong>Auto-Scaling:</strong> Handles traffic spikes automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default FFXIVContentTracker;