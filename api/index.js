module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let path = req.url.split('?')[0];
  path = path.replace(/^\/api\/?/, '').replace(/^\//, '');

  const query = req.query || {};

  try {
    // 1. 搜尋歌曲（自動解析 VIP 完整音源）
    if (path === 'search' || path === 'cloudsearch') {
      const keyword = query.keywords || '';
      
      // 呼叫具備 VIP 解鎖能力的 Meting 服務節點
      const targetUrl = `https://api.qijieya.cn/meting/?type=search&id=${encodeURIComponent(keyword)}`;
      const resp = await fetch(targetUrl);
      const list = await resp.json();

      const songs = (Array.isArray(list) ? list : []).map(item => ({
        id: item.id || item.songid,
        name: item.name || item.title,
        artists: [{ name: item.artist || item.author || "周杰倫" }],
        pic: item.pic || '',
        url: item.url || `https://api.qijieya.cn/meting/?type=url&id=${item.id}`
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 獲取音訊 URL
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      return res.status(200).json({
        code: 200,
        data: [{
          id: id,
          url: `https://api.qijieya.cn/meting/?type=url&id=${id}`
        }]
      });
    }

    return res.status(200).json({ status: "API ready" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
