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
  
  try {
    console.log(`Fetching character data for Lodestone ID: ${lodestoneId}`);
    
    // Fetch character page from Lodestone
    const lodestoneUrl = `https://na.finalfantasyxiv.com/lodestone/character/${lodestoneId}/`;
    
    const response = await fetch(lodestoneUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Character not found' });
      }
      throw new Error(`Lodestone returned ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Check if profile is private
    if (html.includes('This character profile is private') || 
        html.includes('private character profile')) {
      return res.status(403).json({ 
        error: 'Character profile is private',
        lodestoneId 
      });
    }
    
    // Parse basic character info
    const name = document.querySelector('.frame__chara__name')?.textContent?.trim();
    const server = document.querySelector('.frame__chara__world')?.textContent?.trim();
    const avatar = document.querySelector('.frame__chara__face img')?.src;
    
    if (!name) {
      throw new Error('Could not parse character name - page structure may have changed');
    }
    
    // Parse mounts
    const mounts = [];
    const mountElements = document.querySelectorAll('.mount__list .mount__list__item');
    mountElements.forEach(element => {
      const mountName = element.querySelector('.mount__list__item__name')?.textContent?.trim();
      if (mountName) {
        mounts.push({ name: mountName });
      }
    });
    
    // Parse minions
    const minions = [];
    const minionElements = document.querySelectorAll('.minion__list .minion__list__item');
    minionElements.forEach(element => {
      const minionName = element.querySelector('.minion__list__item__name')?.textContent?.trim();
      if (minionName) {
        minions.push({ name: minionName });
      }
    });
    
    // Parse achievements (recent ones from profile)
    const achievements = [];
    const achievementElements = document.querySelectorAll('.achievement__list .achievement__list__item');
    achievementElements.forEach(element => {
      const achievementName = element.querySelector('.achievement__list__item__name')?.textContent?.trim();
      if (achievementName) {
        achievements.push({ name: achievementName });
      }
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
    
    console.log(`Successfully parsed character: ${name} (${mounts.length} mounts, ${minions.length} minions, ${achievements.length} achievements)`);
    
    res.status(200).json(characterData);
    
  } catch (error) {
    console.error('Error parsing character:', error);
    res.status(500).json({ 
      error: 'Failed to parse character data',
      details: error.message 
    });
  }
}