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
    // 1. 搜尋歌曲
    if (path === 'search' || path === 'cloudsearch') {
      const term = query.keywords || '';
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=20&country=TW`;

      const resp = await fetch(itunesUrl);
      const data = await resp.json();

      const songs = (data.results || []).map(item => ({
        id: item.trackId,
        name: item.trackName,
        artists: [{ name: item.artistName }],
        album: {
          name: item.collectionName,
          picUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : ''
        },
        streamUrl: item.previewUrl
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 音訊直連串流代理 (確保任何手機與瀏覽器都不會被 CORS 阻擋)
    if (path === 'stream') {
      const audioUrl = query.url;
      if (!audioUrl) return res.status(400).send("Missing audio url");

      const audioResp = await fetch(audioUrl);
      res.setHeader('Content-Type', audioResp.headers.get('content-type') || 'audio/mp4');
      const buffer = await audioResp.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }

    return res.status(200).json({ status: "API is ready" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
