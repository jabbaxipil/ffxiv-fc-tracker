// Full script for FFXIVContentTracker with FC member checklist integration
import React, { useState, useEffect } from 'react';
import { Search, Users, Trophy, Download, Filter, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
// removed jsdom import since we use cheerio now

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
  const [fcMemberList, setFcMemberList] = useState([]);
  const [selectedFCMembers, setSelectedFCMembers] = useState([]);
  const [accordionOpen, setAccordionOpen] = useState(false);

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
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const completedIds = new Set();
    ['mounts', 'minions', 'achievements'].forEach(type => {
      (collections[type] || []).forEach(item => {
        const match = content[type].find(c => c.name.toLowerCase() === item.name.toLowerCase());
        if (match) completedIds.add(match.id);
      });
    });
    return completedIds;
  };

  const syncMemberProgress = async (memberId) => {
    const member = fcMembers.find(m => m.id === memberId);
    if (!member) return;
    setSyncingMembers(prev => new Set(prev).add(memberId));
    try {
      let lodestoneId = member.lodestoneId;
      if (!lodestoneId) {
        const result = await searchCharacter(member.name, member.server);
        if (!result) throw new Error('Character not found');
        lodestoneId = result.lodestoneId;
        setFcMembers(prev => prev.map(m => m.id === memberId ? { ...m, lodestoneId } : m));
      }
      const data = await fetchCharacterData(lodestoneId);
      const completedIds = matchCollectionsToContent(data.collections);
      setFcMembers(prev => prev.map(m => m.id === memberId ? { ...m, completedContent: completedIds, lodestoneId, avatar: data.avatar } : m));
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
    const [name, server] = newMember.split('@');
    if (name && server) {
      setFcMembers([...fcMembers, { name: name.trim(), server: server.trim(), id: Date.now(), completedContent: new Set(), lodestoneId: null }]);
      setNewMember('');
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

  const fetchFCMembers = async () => {
    try {
      const response = await fetch(`${API_BASE}/freecompany/9231394073691144051`);
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
      completedContent: new Set(),
      lodestoneId: m.lodestoneId || null
    }));

    console.log('Adding selected FC members:', selectedFCMembers);
    setFcMembers(prev => {
      const updated = [...prev, ...newMembers];
      console.log('Updated fcMembers:', updated);
      return updated;
    });

    setSelectedFCMembers([]);
    setAccordionOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Character Name@Server"
          value={newMember}
          onChange={(e) => setNewMember(e.target.value)}
          className="px-3 py-2 border rounded w-full"
        />
        <button onClick={addMember} className="px-4 py-2 bg-blue-600 text-white rounded">Add Member</button>
        <button onClick={syncAllMembers} className="px-4 py-2 bg-green-600 text-white rounded">Sync All</button>
      </div>

      <div>
        <button onClick={fetchFCMembers} className="px-4 py-2 bg-indigo-600 text-white rounded">
          {accordionOpen ? 'Hide FC Member List' : 'Load FC Member List'}
        </button>
        {accordionOpen && (
          <div className="mt-4 border rounded p-4 bg-white">
            <h3 className="font-semibold mb-2">Add Members from FC</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {fcMemberList.map((member, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedFCMembers.includes(member)}
                    onChange={() => toggleFCMemberSelection(member)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
            <button onClick={addSelectedFCMembers} className="mt-3 px-4 py-2 bg-green-700 text-white rounded">
              Add Selected Members
            </button>
          </div>
        )}
      </div>

      {fcMembers.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Tracked Members</h2>
          <ul className="space-y-2 mb-6">
            {fcMembers.map((m, i) => (
              <li key={m.id} className="text-sm">
                ✅ {m.name}@{m.server || '???'} — Lodestone ID: {m.lodestoneId || 'Not yet synced'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content Selector and Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <div className="flex gap-2">
          <button onClick={() => setSelectedContentType('mounts')} className={`px-3 py-1 rounded ${selectedContentType === 'mounts' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mounts</button>
          <button onClick={() => setSelectedContentType('minions')} className={`px-3 py-1 rounded ${selectedContentType === 'minions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Minions</button>
          <button onClick={() => setSelectedContentType('achievements')} className={`px-3 py-1 rounded ${selectedContentType === 'achievements' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Achievements</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilterBy('missing')} className={`px-3 py-1 rounded ${filterBy === 'missing' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>Missing</button>
          <button onClick={() => setFilterBy('owned')} className={`px-3 py-1 rounded ${filterBy === 'owned' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Owned</button>
        </div>
      </div>

      {/* Filtered Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {content[selectedContentType]
          .filter(item => {
            const ownedCount = fcMembers.filter(m => m.completedContent?.has(item.id)).length;
            return filterBy === 'missing' ? ownedCount < fcMembers.length : ownedCount === fcMembers.length;
          })
          .map(item => (
            <div key={item.id} className="border rounded p-3 bg-white shadow-sm">
              <h4 className="font-medium mb-1">{item.name}</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {fcMembers.map(member => (
                  <span key={member.id} className={`px-2 py-1 rounded text-white ${member.completedContent?.has(item.id) ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {member.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
        ))}
      </div>
    </div>

      {/* Content Selector and Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <div className="flex gap-2">
          <button onClick={() => setSelectedContentType('mounts')} className={`px-3 py-1 rounded ${selectedContentType === 'mounts' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mounts</button>
          <button onClick={() => setSelectedContentType('minions')} className={`px-3 py-1 rounded ${selectedContentType === 'minions' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Minions</button>
          <button onClick={() => setSelectedContentType('achievements')} className={`px-3 py-1 rounded ${selectedContentType === 'achievements' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Achievements</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilterBy('missing')} className={`px-3 py-1 rounded ${filterBy === 'missing' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>Missing</button>
          <button onClick={() => setFilterBy('owned')} className={`px-3 py-1 rounded ${filterBy === 'owned' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Owned</button>
        </div>
      </div>

      {/* Filtered Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {content[selectedContentType]
          .filter(item => {
            const ownedCount = fcMembers.filter(m => m.completedContent?.has(item.id)).length;
            return filterBy === 'missing' ? ownedCount < fcMembers.length : ownedCount === fcMembers.length;
          })
          .map(item => (
            <div key={item.id} className="border rounded p-3 bg-white shadow-sm">
              <h4 className="font-medium mb-1">{item.name}</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                {fcMembers.map(member => (
                  <span key={member.id} className={`px-2 py-1 rounded text-white ${member.completedContent?.has(item.id) ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {member.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default FFXIVContentTracker;
