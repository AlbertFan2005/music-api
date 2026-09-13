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

  // 固定選擇穩定可用的 Audius 官方廣播節點
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
        artists: [{ name: item.user ? item.user.name : "流行音樂" }],
        pic: item.artwork ? (item.artwork['480x480'] || item.artwork['150x150'] || '') : '',
        streamUrl: `${AUDIUS_HOST}/v1/tracks/${item.id}/stream?app_name=${APP_NAME}`,
        duration: item.duration
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 取得音訊 URL
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      const streamUrl = `${AUDIUS_HOST}/v1/tracks/${id}/stream?app_name=${APP_NAME}`;

      return res.status(200).json({
        code: 200,
        data: [{
          id: id,
          url: streamUrl
        }]
      });
    }

    return res.status(200).json({ status: "API is active and healthy" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
