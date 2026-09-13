module.exports = async (req, res) => {
  // 開啟跨域支援
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
    // 1. 歌曲搜尋功能 (/api/search?keywords=...)
    if (path === 'search' || path === 'cloudsearch') {
      const keywords = query.keywords || '';
      const limit = query.limit || 20;

      const response = await fetch(`https://music.163.com/api/search/get?s=${encodeURIComponent(keywords)}&type=1&limit=${limit}&offset=0`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.163.com'
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // 2. 歌曲資訊與 URL 取得 (/api/song/url?id=...)
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      if (!id) return res.status(400).json({ code: 400, message: "Missing id" });

      // 使用原生無防盜鏈的標準串流直鏈
      const streamUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;

      return res.status(200).json({
        code: 200,
        data: [{
          id: Number(id),
          url: streamUrl
        }]
      });
    }

    // 3. 歌曲詳情查詢 (/api/song/detail?ids=...)
    if (path === 'song/detail') {
      const ids = query.ids;
      const response = await fetch(`https://music.163.com/api/song/detail/?id=${ids}&ids=[${ids}]`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://music.163.com'
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(200).json({ status: "API is alive and ready!" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};const NCM = require('NeteaseCloudMusicApi');
const https = require('https');
const http = require('http');

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
    // 1. 直鏈音訊代理 (直接把音訊串流丟回瀏覽器，繞過防盜鏈)
    if (path === 'stream') {
      const id = query.id;
      if (!id) return res.status(400).send("Missing id");

      // 取得實際播放音訊位址
      let targetUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      try {
        const urlRes = await NCM['song_url']({ id, br: 128000 });
        if (urlRes.body.data && urlRes.body.data[0] && urlRes.body.data[0].url) {
          targetUrl = urlRes.body.data[0].url;
        }
      } catch (e) {}

      // 重定向至目標音訊
      return res.redirect(302, targetUrl);
    }

    // 2. 取得歌曲 URL
    if (path === 'song/url' || path === 'song/url/v1') {
      const id = query.id;
      let streamUrl = null;

      try {
        const result = await NCM['song_url']({ id, br: 128000, cookie: query.cookie || '' });
        if (result.body.data && result.body.data[0] && result.body.data[0].url) {
          streamUrl = result.body.data[0].url.replace(/^http:/, 'https:');
        }
      } catch (e) {}

      // 若官方未回傳有效連結，改走我們自己的 /api/stream 代理端點
      if (!streamUrl) {
        streamUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      }

      return res.status(200).json({
        code: 200,
        data: [{
          id: Number(id),
          url: streamUrl
        }]
      });
    }

    // 3. 搜尋處理
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
};const NCM = require('NeteaseCloudMusicApi');

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
