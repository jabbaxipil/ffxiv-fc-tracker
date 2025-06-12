import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Free Company ID is required' });

  try {
    const response = await fetch(`https://ffxivcollect.com/fc/${id}`);
    if (!response.ok) {
      const html = await response.text();
      return res.status(response.status).json({ error: `FFXIVCollect returned ${response.status}`, htmlSnippet: html.slice(0, 100) });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const members = [];
    $('a[href^="/characters/"]').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      const match = href.match(/\\/characters\\/(\\d+)/);
      const lodestoneId = match?.[1];
      if (name && lodestoneId) {
        members.push({ name, lodestoneId });
      }
    });

    res.status(200).json(members);
  } catch (err) {
    console.error('FC fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch FC data', details: err.message });
  }
}
