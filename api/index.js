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
    // 1. 搜尋歌曲（取得歌曲名稱、歌手與專屬 Hash）
    if (path === 'search' || path === 'cloudsearch') {
      const keyword = query.keywords || '';
      const searchUrl = `https://songsearch.kugou.com/song_search_v2?keyword=${encodeURIComponent(keyword)}&page=1&pagesize=20&platform=WebFilter`;

      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const data = await resp.json();

      const lists = (data.data && data.data.lists) ? data.data.lists : [];
      const songs = lists.map(item => ({
        id: item.FileHash,
        albumId: item.AlbumID,
        name: item.SongName.replace(/<\/?em>/g, ''),
        artists: [{ name: item.SingerName.replace(/<\/?em>/g, '') }],
        duration: item.Duration
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 解析整首歌曲的真實 MP3 串流與封面
    if (path === 'song/url' || path === 'song/url/v1') {
      const hash = query.id;
      const albumId = query.albumId || '0';

      const detailUrl = `https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${hash}`;
      const resp = await fetch(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      });
      const data = await resp.json();

      const playUrl = (data.url || '').replace(/^http:/, 'https:');
      const pic = (data.imgUrl || '').replace('{size}', '400');

      return res.status(200).json({
        code: 200,
        data: [{
          id: hash,
          url: playUrl,
          pic: pic
        }]
      });
    }

    return res.status(200).json({ status: "API is ready" });
  } catch (err) {
    return res.status(200).json({ result: { songs: [] }, error: err.message });
  }
};
