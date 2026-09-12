const NCM = require('NeteaseCloudMusicApi');

module.exports = async (req, res) => {
  // 開啟跨網域 (讓你的 GitHub Pages 網站可以正常呼叫)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url.split('?')[0].replace(/^\/api\/?/, '');
  const query = req.query || {};

  try {
    if (typeof NCM[path] === 'function') {
      const result = await NCM[path]({
        ...query,
        cookie: query.cookie || ''
      });
      return res.status(result.status || 200).json(result.body);
    } else {
      return res.status(404).json({ code: 404, message: `Route ${path} not found` });
    }
  } catch (err) {
    return res.status(500).json({ code: 500, error: err.message });
  }
};
