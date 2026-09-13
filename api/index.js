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
        albumId: item.AlbumID || '0',
        name: item.SongName.replace(/<\/?em>/g, ''),
        artists: [{ name: item.SingerName.replace(/<\/?em>/g, '') }]
      }));

      return res.status(200).json({
        result: {
          songs: songs
        }
      });
    }

    // 2. 解析完整 MP3 音訊直鏈（採用官方開放桌面端接口）
    if (path === 'song/url' || path === 'song/url/v1') {
      const hash = query.id;
      const albumId = query.albumId || '0';

      const playApi = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&album_id=${albumId}&mid=1`;
      
      const resp = await fetch(playApi, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.kugou.com/'
        }
      });
      const data = await resp.json();
      const songInfo = data.data || {};

      let playUrl = songInfo.play_url || songInfo.play_backup_url || '';
      playUrl = playUrl.replace(/^http:/, 'https:');
      const pic = songInfo.img || '';

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
