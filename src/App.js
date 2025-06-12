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
      if (!Array.isArray(data)) throw new Error(data.error || 'Unexpected response');
      setFcMemberList(data);
      setFcMemberList(members);
      setAccordionOpen(true);
    } catch (err) {
      console.error('Failed to fetch FC members:', err);
    }
  };

  const toggleFCMemberSelection = (member) => {
    setSelectedFCMembers(prev => prev.includes(member) ? prev.filter(m => m !== member) : [...prev, member]);
  };

  const addSelectedFCMembers = () => {
    const newMembers = selectedFCMembers.map(m => ({ ...m, id: Date.now() + Math.random(), completedContent: new Set(), lodestoneId: m.lodestoneId || null }));
    setFcMembers(prev => [...prev, ...newMembers]);
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

      {/* Add rest of the UI from original App.js here if needed */}
    </div>
  );
};

export default FFXIVContentTracker;
