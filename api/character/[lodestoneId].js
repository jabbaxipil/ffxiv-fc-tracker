// Vercel serverless function to parse character data from Lodestone
import { JSDOM } from 'jsdom';

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

  const fetchLodestonePage = async (url) => {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Character not found');
      }
      throw new Error(`Lodestone returned ${response.status}`);
    }

    const html = await response.text();
    return new JSDOM(html).window.document;
  };

  try {
    const baseUrl = `https://na.finalfantasyxiv.com/lodestone/character/${lodestoneId}`;

    // Fetch main profile page
    const profileDoc = await fetchLodestonePage(`${baseUrl}/`);

    // Check for private profile
    if (profileDoc.body.textContent.includes('This character profile is private')) {
      return res.status(403).json({
        error: 'Character profile is private',
        lodestoneId
      });
    }

    const name = profileDoc.querySelector('.frame__chara__name')?.textContent?.trim();
    const server = profileDoc.querySelector('.frame__chara__world')?.textContent?.trim();
    const avatar = profileDoc.querySelector('.frame__chara__face img')?.src;

    if (!name) {
      throw new Error('Could not parse character name - page structure may have changed');
    }

    // Fetch collectibles from dedicated subpages
    const [mountDoc, minionDoc, achievementDoc] = await Promise.all([
      fetchLodestonePage(`${baseUrl}/mount`),
      fetchLodestonePage(`${baseUrl}/minion`),
      fetchLodestonePage(`${baseUrl}/achievement`)
    ]);

    // Parse mounts
    const mounts = [];
    mountDoc.querySelectorAll('.mount__list .mount__list__item').forEach(el => {
      const mountName = el.querySelector('.mount__list__item__name')?.textContent?.trim();
      if (mountName) mounts.push({ name: mountName });
    });

    // Parse minions
    const minions = [];
    minionDoc.querySelectorAll('.minion__list .minion__list__item').forEach(el => {
      const minionName = el.querySelector('.minion__list__item__name')?.textContent?.trim();
      if (minionName) minions.push({ name: minionName });
    });

    // Parse achievements
    const achievements = [];
    achievementDoc.querySelectorAll('.achievement__list .achievement__list__item').forEach(el => {
      const achievementName = el.querySelector('.achievement__list__item__name')?.textContent?.trim();
      if (achievementName) achievements.push({ name: achievementName });
    });

    const characterData = {
      lodestoneId,
      name,
      server,
      avatar,
      collections: {
        mounts,
        minions,
        achievements
      },
      lastUpdated: new Date().toISOString()
    };

    console.log(`✅ Parsed character "${name}": ${mounts.length} mounts, ${minions.length} minions, ${achievements.length} achievements`);
    res.status(200).json(characterData);

  } catch (error) {
    console.error('Error parsing character:', error);
    res.status(500).json({
      error: 'Failed to parse character data',
      details: error.message
    });
  }
}
