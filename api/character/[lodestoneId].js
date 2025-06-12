export default async function handler(req, res) {
  const { lodestoneId } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!lodestoneId) return res.status(400).json({ error: 'Lodestone ID is required' });

  const fetchCollection = async (type) => {
    const url = `https://ffxivcollect.com/api/users/${lodestoneId}/${type}/owned`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return [];
      const text = await response.text();
      throw new Error(`Failed to fetch ${type}: ${response.status} - ${text}`);
    }
    return await response.json();
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

    console.log(`✅ Retrieved ${mounts.length} mounts, ${minions.length} minions, ${achievements.length} achievements for ${lodestoneId}`);
    res.status(200).json(characterData);

  } catch (err) {
    console.error('❌ Error fetching from FFXIVCollect:', err);
    res.status(502).json({ error: 'Failed to fetch collections from FFXIVCollect', details: err.message });
  }
}
