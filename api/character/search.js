// api/character/search.js
// Vercel serverless function to search for characters by name/server

import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const { name, server } = req.query;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!name || !server) {
    return res.status(400).json({ error: 'Name and server are required' });
  }
  
  try {
    console.log(`Searching for character: ${name} on ${server}`);
    
    // Use Lodestone search
    const searchUrl = `https://na.finalfantasyxiv.com/lodestone/character/?q=${encodeURIComponent(name)}&worldname=${encodeURIComponent(server)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Lodestone search returned ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Parse search results
    const results = [];
    const characterElements = document.querySelectorAll('.ldst__window .entry');
    
    characterElements.forEach(element => {
      const characterName = element.querySelector('.entry__name')?.textContent?.trim();
      const characterServer = element.querySelector('.entry__world')?.textContent?.trim();
      const characterLink = element.querySelector('.entry__link')?.href;
      
      if (characterName && characterServer && characterLink) {
        // Extract Lodestone ID from URL
        const lodestoneIdMatch = characterLink.match(/\/lodestone\/character\/(\d+)\//);
        const lodestoneId = lodestoneIdMatch ? lodestoneIdMatch[1] : null;
        
        if (lodestoneId) {
          results.push({
            name: characterName,
            server: characterServer,
            lodestoneId,
            avatar: element.querySelector('.entry__chara__face img')?.src
          });
        }
      }
    });
    
    // Filter for exact matches
    const exactMatches = results.filter(char => 
      char.name.toLowerCase() === name.toLowerCase() && 
      char.server.toLowerCase() === server.toLowerCase()
    );
    
    if (exactMatches.length > 0) {
      console.log(`Found ${exactMatches.length} exact match(es)`);
      res.status(200).json({ results: exactMatches });
    } else if (results.length > 0) {
      console.log(`Found ${results.length} partial match(es)`);
      res.status(200).json({ results: results.slice(0, 5) }); // Return top 5 partial matches
    } else {
      console.log('No characters found');
      res.status(404).json({ error: 'No characters found' });
    }
    
  } catch (error) {
    console.error('Error searching characters:', error);
    res.status(500).json({ 
      error: 'Failed to search characters',
      details: error.message 
    });
  }
}