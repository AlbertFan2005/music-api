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
    // 1. 搜尋端點：全面支援周杰倫、各類流行歌手與歌曲
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

    // 2. 音訊端點
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      return res.status(200).json({
        code: 200,
        data: [{
          id: id,
          url: query.streamUrl || `https://music.163.com/song/media/outer/url?id=${id}.mp3`
        }]
      });
    }

    return res.status(200).json({ status: "API is ready" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
