const crypto = require('crypto');

const ADMIN_HASH = '94718851696c4e600062f4772aecd129f7356ee2222419aaa6a5c92f2124ea8f';
const GH_REPO = 'marcvasseurpolytech-dot/toeic-dates';
const GH_FILE = 'sessions.json';

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { code, sessions } = req.body || {};

    if (!code || sha256Hex(code) !== ADMIN_HASH) {
      res.status(401).json({ ok: false, error: 'Code admin invalide.' });
      return;
    }

    if (!Array.isArray(sessions)) {
      res.status(400).json({ ok: false, error: 'Format de sessions invalide.' });
      return;
    }

    const token = process.env.GH_TOKEN;
    if (!token) {
      res.status(500).json({ ok: false, error: 'GH_TOKEN manquant côté serveur (configuration Vercel).' });
      return;
    }

    const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`;

    const shaRes = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });
    const shaData = await shaRes.json();
    if (!shaRes.ok) {
      res.status(shaRes.status).json({ ok: false, error: shaData.message || 'Lecture du fichier impossible.' });
      return;
    }

    const content = Buffer.from(JSON.stringify(sessions, null, 2), 'utf8').toString('base64');

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Mise a jour calendrier TOEIC (admin)',
        content,
        sha: shaData.sha
      })
    });
    const putData = await putRes.json();
    if (!putRes.ok) {
      res.status(putRes.status).json({ ok: false, error: putData.message || 'Enregistrement impossible.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Erreur serveur.' });
  }
};
