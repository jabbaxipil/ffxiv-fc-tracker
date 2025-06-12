import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Free Company ID is required' });

  try {
    const url = `https://ffxivcollect.com/fc/${id}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch FC page from FFXIVCollect' });
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const members = Array.from(document.querySelectorAll('a[href^="/characters/"]'))
      .map(a => {
        const href = a.getAttribute('href');
        const name = a.textContent.trim();
        const idMatch = href.match(/\\/characters\\/(\\d+)/);
        const lodestoneId = idMatch ? idMatch[1] : null;
        return lodestoneId && name ? { name, lodestoneId } : null;
      })
      .filter(Boolean);

    res.status(200).json(members);
  } catch (error) {
    console.error('FC fetch error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
}
