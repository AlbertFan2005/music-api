const NCM = require('NeteaseCloudMusicApi');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let path = req.url.split('?')[0];
  path = path.replace(/^\/api\/?/, '').replace(/^\//, '');

  if (!path) {
    return res.status(200).json({ status: "API is ready" });
  }

  const query = req.query || {};

  try {
    // 專門處理音訊網址請求
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      
      // 嘗試調用 song_url_v1 (官方最新推薦接口，支援標準免費用戶串流)
      let result;
      if (typeof NCM['song_url_v1'] === 'function') {
        result = await NCM['song_url_v1']({
          id,
          level: 'standard',
          cookie: query.cookie || ''
        });
      } else if (typeof NCM['song_url'] === 'function') {
        result = await NCM['song_url']({
          id,
          br: 128000,
          cookie: query.cookie || ''
        });
      }

      // 如果官方介面拿到的 url 是 http 開頭，轉為 https
      if (result && result.body && result.body.data && result.body.data[0]) {
        let songItem = result.body.data[0];
        if (songItem.url) {
          songItem.url = songItem.url.replace(/^http:/, 'https:');
          return res.status(200).json(result.body);
        }
      }

      // 備援方案：若官方未回傳 url，使用網易公開 CDN 預設直鏈規則嘗試
      const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      return res.status(200).json({
        code: 200,
        data: [{
          id: Number(id),
          url: fallbackUrl,
          br: 128000,
          type: "mp3"
        }]
      });
    }

    // 搜尋與其他路徑
    let action = path;
    if (action === 'search' || action === 'cloudsearch') {
      action = typeof NCM['cloudsearch'] === 'function' ? 'cloudsearch' : 'search';
    }

    if (typeof NCM[action] === 'function') {
      const result = await NCM[action]({
        ...query,
        cookie: query.cookie || ''
      });
      return res.status(result.status || 200).json(result.body);
    } else {
      return res.status(404).json({ code: 404, message: `Action ${action} not found` });
    }
  } catch (err) {
    return res.status(500).json({ code: 500, error: err.message });
  }
};
