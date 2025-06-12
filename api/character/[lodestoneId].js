// Vercel serverless function to fetch character collection data from FFXIVCollect
export default async function handler(req, res) {
  const { lodestoneId } = req.query;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!lodestoneId) {
    return res.status(400).json({ error: 'Lodestone ID is required' });
  }

  try {
    const response = await fetch(`https://ffxivcollect.com/api/characters/${lodestoneId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Character not found on FFXIVCollect' });
      }
      throw new Error(`FFXIVCollect returned ${response.status}`);
    }

    const data = await response.json();

    const characterData = {
      lodestoneId,
      name: data.name || null,
      server: data.server || null,
      avatar: data.avatar || null,
      collections: {
        mounts: data.mounts || [],
        minions: data.minions || [],
        achievements: data.achievements || []
      },
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ Retrieved from FFXIVCollect: ${characterData.mounts?.length || 0} mounts`);

    res.status(200).json(characterData);

  } catch (error) {
    console.error('Error fetching from FFXIVCollect:', error);
    res.status(500).json({
      error: 'Failed to fetch character data from FFXIVCollect',
      details: error.message
    });
  }
}
