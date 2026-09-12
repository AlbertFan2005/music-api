const NCM = require('NeteaseCloudMusicApi');

module.exports = async (req, res) => {
  // 開啟 CORS，允許你的 GitHub Pages 呼叫
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 自動清理路徑，支援 /api/search 或直接 /search
  let path = req.url.split('?')[0];
  path = path.replace(/^\/api\/?/, '').replace(/^\//, '');

  // 預設如果沒給路徑就回傳歡迎訊息
  if (!path) {
    return res.status(200).json({ status: "API is working!" });
  }

  const query = req.query || {};

  try {
    // 同時支援 search 與 cloudsearch
    let action = path;
    if (action === 'cloudsearch' && typeof NCM['cloudsearch'] !== 'function') {
      action = 'search';
    }

    if (typeof NCM[action] === 'function') {
      const result = await NCM[action]({
        ...query,
        cookie: query.cookie || ''
      });
      return res.status(result.status || 200).json(result.body);
    } else {
      return res.status(404).json({ code: 404, message: `Function ${action} not found` });
    }
  } catch (err) {
    return res.status(500).json({ code: 500, error: err.message });
  }
};
