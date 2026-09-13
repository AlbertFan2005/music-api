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
  const AUDIUS_HOST = "https://discoveryprovider.audius.co";
  const APP_NAME = "WaveSyncPlayer";

  try {
    // 1. 搜尋歌曲
    if (path === 'search' || path === 'cloudsearch') {
      const keyword = query.keywords || '';
      const searchUrl = `${AUDIUS_HOST}/v1/tracks/search?query=${encodeURIComponent(keyword)}&app_name=${APP_NAME}`;

      const resp = await fetch(searchUrl);
      const data = await resp.json();

      const trackList = data.data || [];
      const songs = trackList.map(item => ({
        id: item.id,
        name: item.title,
        artists: [{ name: item.user ? item.user.name : "熱門音樂" }],
        pic: item.artwork ? (item.artwork['480x480'] || item.artwork['150x150'] || '') : '',
        duration: item.duration
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 取得真實音訊 URL (伺服器自動跟隨 302 重定向，直接拿最終 MP3 直鏈)
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      const initialStreamUrl = `${AUDIUS_HOST}/v1/tracks/${id}/stream?app_name=${APP_NAME}`;

      // 使用 redirect: 'follow' 追蹤到真實檔案 CDN 位址
      const headResp = await fetch(initialStreamUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const finalUrl = headResp.url || initialStreamUrl;

      return res.status(200).json({
        code: 200,
        data: [{
          id: id,
          url: finalUrl
        }]
      });
    }

    return res.status(200).json({ status: "API is active" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
