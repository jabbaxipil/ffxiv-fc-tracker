export default async function handler(req, res) {
  const { lodestoneId } = req.query;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!lodestoneId) return res.status(400).json({ error: 'Lodestone ID is required' });

  try {
    const response = await fetch(`https://ffxivcollect.com/api/users/${lodestoneId}/collection/owned`);

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      const errorText = isJson
        ? (await response.json()).error
        : await response.text();

      return res.status(response.status).json({
        error: `FFXIVCollect error: ${errorText || `HTTP ${response.status}`}`
      });
    }

    const data = await response.json();

    const characterData = {
      lodestoneId,
      name: null,       // These are not returned here — can be filled in later
      server: null,
      avatar: null,
      collections: {
        mounts: data.mounts || [],
        minions: data.minions || [],
        achievements: data.achievements || []
      },
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ Retrieved: ${data.mounts?.length || 0} mounts, ${data.minions?.length || 0} minions, ${data.achievements?.length || 0} achievements`);
    res.status(200).json(characterData);

  } catch (error) {
    console.error('Error fetching from FFXIVCollect:', error);
    res.status(500).json({
      error: 'Failed to fetch character data from FFXIVCollect',
      details: error.message
    });
  }
}
