// 每日内容更新脚本：抓取真实热搜/新闻，写入 data.json
// 由 GitHub Actions 定时调用（无需任何密钥也能更新抖音热搜）
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
  const diff = d - start;
  return Math.floor(diff / 86400000);
}
const DOY = dayOfYear(new Date());

function guessType(t) {
  if (/剧|明星|歌|综|演员|主播/.test(t)) return 'entertainment';
  if (/台风|地震|灾害|事故|枪击|火灾/.test(t)) return 'social';
  if (/AI|科技|手机|芯片|算法/.test(t)) return 'tech';
  return 'life';
}

// 抖音热搜：优先用真实接口（无 key 也能用）
async function getHotTopics() {
  try {
    const r = await fetch('https://api.vvhan.com/api/hotlist/douyinHot');
    const j = await r.json();
    if (j && j.code === 200 && Array.isArray(j.data) && j.data.length) {
      return j.data.slice(0, 12).map((it, i) => ({
        rank: i + 1,
        title: it.title,
        desc: it.hot ? ('热度 ' + it.hot) : '抖音热搜',
        type: guessType(it.title),
        heat: it.hot || '热搜',
        keyword: it.title,
        detail: (it.title || '') + ' 登上抖音热搜，可趁热度做相关直播 / 短视频内容，注意结合自身人设。',
        angles: ['结合账号人设做热点解读', '注意客观中立表述', '延伸相关实用话题']
      }));
    }
  } catch (e) {
    console.log('抖音热搜接口失败，使用精选轮换：', e.message);
  }
  return rotate(curated.hotTopics, DOY).map((t, i) => Object.assign({}, t, { rank: i + 1 }));
}

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
  const [hot, news] = await Promise.all([getHotTopics(), getNews()]);
  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    hotTopics: hot,
    liveInspiration: rotate(curated.liveInspiration, DOY),
    newsData: news
  };
  fs.writeFileSync('data.json', JSON.stringify(out, null, 2));
  console.log('✅ data.json 已生成 | 热搜 ' + hot.length + ' 条 | 新闻 ' + news.length + ' 条');
})();
