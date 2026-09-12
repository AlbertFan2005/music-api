const NCM = require('NeteaseCloudMusicApi');
let unblock;
try {
  unblock = require('@radicon/unblockneteasemusic');
} catch (e) {
  console.warn("Unblock module load fallback", e);
}

module.exports = async (req, res) => {
  // 開啟跨網域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let path = req.url.split('?')[0];
  path = path.replace(/^\/api\/?/, '').replace(/^\//, '');

  if (!path) {
    return res.status(200).json({ status: "API is working with Unblock support!" });
  }

  const query = req.query || {};

  try {
    // 1. 如果是請求歌曲播放連結 (/song/url)
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      // 先向官方請求
      const officialRes = await NCM['song_url']({ id, cookie: query.cookie || '' });
      let songData = officialRes.body.data && officialRes.body.data[0];

      // 如果官方給了可用 url，直接回傳
      if (songData && songData.url) {
        return res.status(200).json(officialRes.body);
      }

      // 若官方回傳空值 (VIP 版權歌)，啟動外掛從酷狗/咪咕/B站跨源匹配
      if (unblock) {
        try {
          const matchResult = await unblock(id, ['kugou', 'migu', 'bilibili']);
          if (matchResult && matchResult.url) {
            return res.status(200).json({
              code: 200,
              data: [{
                id: Number(id),
                url: matchResult.url.replace(/^http:/, 'https:'),
                br: matchResult.br || 128000,
                size: matchResult.size || 0,
                type: "mp3"
              }]
            });
          }
        } catch (unblockErr) {
          console.warn("Unblock failed:", unblockErr.message);
        }
      }

      return res.status(200).json(officialRes.body);
    }

    // 2. 其它請求 (如搜尋 /search)
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
      return res.status(404).json({ code: 404, message: `Function ${action} not found` });
    }
  } catch (err) {
    return res.status(500).json({ code: 500, error: err.message });
  }
};
