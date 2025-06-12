import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Free Company ID is required' });

  try {
    const response = await fetch(`https://na.finalfantasyxiv.com/lodestone/freecompany/${id}/member/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error(`Lodestone returned ${response.status}`);

    const html = await response.text();
    const dom = new JSDOM(html);
    const entries = Array.from(dom.window.document.querySelectorAll('.entry'));

    const members = entries.map(entry => {
      const name = entry.querySelector('.entry__name')?.textContent?.trim();
      const server = entry.querySelector('.entry__world')?.textContent?.trim();
      return name && server ? { name, server } : null;
    }).filter(Boolean);

    res.status(200).json(members);
  } catch (err) {
    console.error('Error fetching FC members:', err);
    res.status(500).json({ error: 'Failed to fetch Free Company members', details: err.message });
  }
}
