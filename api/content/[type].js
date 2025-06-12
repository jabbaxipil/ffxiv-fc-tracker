// Vercel serverless function to fetch content data from FFXIVCollect

export default async function handler(req, res) {
  const { type } = req.query;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const validTypes = ['mounts', 'minions', 'achievements'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid content type',
      validTypes 
    });
  }
  
  try {
    console.log(`Fetching ${type} from FFXIVCollect`);
    
    const response = await fetch(`https://ffxivcollect.com/api/${type}`, {
      headers: {
        'User-Agent': 'FFXIV-FC-Tracker/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FFXIVCollect returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Add some metadata
    const contentData = {
      type,
      count: data.results ? data.results.length : data.length,
      lastUpdated: new Date().toISOString(),
      data: data.results || data
    };
    
    console.log(`Successfully fetched ${contentData.count} ${type}`);
    
    res.status(200).json(contentData);
    
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    res.status(500).json({ 
      error: `Failed to fetch ${type}`,
      details: error.message 
    });
  }
}