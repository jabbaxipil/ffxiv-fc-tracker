import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Free Company ID is required' });

  try {
    const fcUrl = `https://ffxivcollect.com/fc/${id}`;
    const response = await fetch(fcUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const html = await response.text();

    if (!response.ok || !html.includes('/characters/')) {
      return res.status(response.status).json({
        error: `FFXIVCollect failed or returned no usable data`,
        htmlSnippet: html.slice(0, 200)
      });
    }

    const $ = cheerio.load(html);
    const members = [];

    $('a[href^="/characters/"]').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      const match = href.match(/\/characters\/(\d+)/);
      const lodestoneId = match?.[1];
      if (name && lodestoneId) {
        members.push({ name, lodestoneId });
      }
    });

    if (members.length === 0) {
      return res.status(404).json({ error: 'No members found on FC page.' });
    }

    res.status(200).json(members);
  } catch (error) {
    console.error('❌ Scrape failed:', error);
    res.status(500).json({ error: 'Failed to fetch FC members', details: error.message });
  }
}
