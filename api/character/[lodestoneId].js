export default async function handler(req, res) {
  const { lodestoneId } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!lodestoneId) return res.status(400).json({ error: 'Lodestone ID is required' });

  const fetchCollection = async (type) => {
    const url = `https://ffxivcollect.com/api/characters/${lodestoneId}/${type}/owned`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch ${type}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  };

  try {
    const [mounts, minions, achievements] = await Promise.all([
      fetchCollection('mounts'),
      fetchCollection('minions'),
      fetchCollection('achievements')
    ]);

    const characterData = {
      lodestoneId,
      name: null,
      server: null,
      avatar: null,
      collections: {
        mounts,
        minions,
        achievements
      },
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(characterData);

  } catch (err) {
    console.error('❌ FFXIVCollect fetch error:', err);
    res.status(502).json({ error: 'Failed to fetch from FFXIVCollect', details: err.message });
  }
}
