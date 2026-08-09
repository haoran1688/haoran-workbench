// 每日内容更新脚本：GitHub Actions 每日生成 data.json
// 说明：GitHub 服务器在美国，连不上中国热搜/新闻接口，
// 故「实时热搜」改由浏览器端拉取（见 index.html fetchLiveHot），
// 本脚本负责：时事政治（有 TIAN_API_KEY 时抓真实新闻，否则精选轮换）+ 创作灵感精选轮换。
const fs = require('fs');

const curated = JSON.parse(fs.readFileSync('curated.json', 'utf8'));
const KEY = process.env.TIAN_API_KEY || '';

function rotate(arr, n) {
  if (!arr || !arr.length) return arr;
  n = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}
function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
const DOY = dayOfYear(new Date());

// 时事新闻：有 TIAN_API_KEY 时抓真实新闻，否则精选轮换
async function getNews() {
  if (KEY) {
    try {
      const r = await fetch('https://apis.tianapi.com/topnews/index?key=' + KEY + '&num=10');
      const j = await r.json();
      if (j && j.code === 200 && Array.isArray(j.newslist) && j.newslist.length) {
        return j.newslist.map(n => ({
          badge: n.class || '综合',
          cls: 'internal',
          title: n.title,
          meta: (n.source || '天行数据') + ' · ' + (n.pubDate || '').slice(0, 10),
          keyword: n.title,
          detail: n.content || n.title,
          angles: ['结合时事做轻知识解读', '注意客观中立', '延伸相关实用话题']
        }));
      }
    } catch (e) {
      console.log('天行新闻接口失败，使用精选轮换：', e.message);
    }
  }
  return rotate(curated.newsData, DOY);
}

(async () => {
  const news = await getNews();
  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    // 热搜留空，由浏览器端 fetchLiveHot 实时填充；为空时回退到精选轮换
    hotTopics: [],
    liveNote: 'hotTopics 由浏览器端实时拉取，详见 index.html',
    liveInspiration: rotate(curated.liveInspiration, DOY),
    newsData: news
  };
  fs.writeFileSync('data.json', JSON.stringify(out, null, 2));
  console.log('✅ data.json 已生成 | 新闻 ' + news.length + ' 条 | 热搜由浏览器端实时拉取');
})();
