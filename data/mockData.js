/*
  Mock data generator for the Spokesperson dashboard.
  Converted to an ES module for the React implementation.
*/

const channels = [
    {
      id: 'financial-times',
      name: 'Financial Times',
      region: 'United Kingdom',
      categories: ['Climate', 'Companies', 'Technology'],
      status: 'active',
      avgLatencyMinutes: 6,
      audienceShare: 0.28,
    },
    {
      id: 'fortune',
      name: 'Fortune',
      region: 'United States',
      categories: ['Finance', 'Economy', 'Leadership'],
      status: 'active',
      avgLatencyMinutes: 12,
      audienceShare: 0.23,
    },
    {
      id: 'bloomberg',
      name: 'Bloomberg',
      region: 'Global',
      categories: ['Markets', 'Technology', 'Energy'],
      status: 'active',
      avgLatencyMinutes: 9,
      audienceShare: 0.19,
    },
    {
      id: 'reuters',
      name: 'Reuters',
      region: 'Global',
      categories: ['World', 'Politics', 'Markets'],
      status: 'paused',
      avgLatencyMinutes: 21,
      audienceShare: 0.16,
    },
    {
      id: 'business-insider',
      name: 'Business Insider',
      region: 'United States',
      categories: ['Technology', 'Markets', 'Lifestyle'],
      status: 'active',
      avgLatencyMinutes: 15,
      audienceShare: 0.14,
    },
  ];

  const regions = Array.from(new Set(channels.map((channel) => channel.region)));

  const companiesCatalog = [
    { name: 'GlobalBank plc', sector: 'Financial Services' },
    { name: 'EcoPower Group', sector: 'Energy & Utilities' },
    { name: 'Nordic Tech Systems', sector: 'Technology' },
    { name: 'Continental Metals', sector: 'Industrials' },
    { name: 'Apex Healthcare', sector: 'Healthcare' },
    { name: 'Green Logistics', sector: 'Transportation' },
    { name: 'Future Foods', sector: 'Consumer Staples' },
    { name: 'Skyline Media', sector: 'Media & Entertainment' },
  ];

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const statuses = ['Completed', 'In Queue', 'Improper'];
  const categories = [
    'Climate',
    'Finance',
    'Technology',
    'Companies',
    'Politics',
    'Energy',
    'Media',
  ];

  const now = new Date();
  const articles = [];

  for (let i = 0; i < 120; i += 1) {
    const channel = channels[randomBetween(0, channels.length - 1)];
    const company = companiesCatalog[randomBetween(0, companiesCatalog.length - 1)];
    const daysAgo = randomBetween(0, 58);
    const publishedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - randomBetween(0, 18) * 3600000);

    articles.push({
      id: `article-${i + 1}`,
      title: `${channel.name} feature #${i + 1}`,
      teaser: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      source: channel.name,
      region: channel.region,
      category: categories[randomBetween(0, categories.length - 1)],
      channelId: channel.id,
      status: statuses[randomBetween(0, statuses.length - 1)],
      publishedAt: publishedAt.toISOString(),
      companyName: company.name,
      sector: company.sector,
      engagement: {
        webViews: randomBetween(2400, 11800),
        mobileViews: randomBetween(1200, 5600),
        shares: randomBetween(35, 420),
        dwellSeconds: randomBetween(70, 320),
      },
    });
  }

  const scheduler = Array.from({ length: 12 }).map((_, index) => {
    const channel = channels[index % channels.length];
    const cron = `${randomBetween(0, 59)} */${randomBetween(2, 4)} * * *`;
    const latency = channel.avgLatencyMinutes + randomBetween(-4, 9);
    const status = latency < 15 ? 'healthy' : latency < 25 ? 'warning' : 'critical';
    const active = index % 5 !== 3;
    const peakHour = randomBetween(6, 20);
    const hourlyLoad = Array.from({ length: 24 }).map((__, hour) => {
      const intensity = Math.max(0, 12 - Math.abs(hour - peakHour));
      const baseRuns = Math.max(0, Math.round(intensity * (0.4 + Math.random())));
      const failures = Math.min(baseRuns, randomBetween(0, 2));
      const queued = Math.min(baseRuns - failures, randomBetween(0, 3));
      const success = Math.max(baseRuns - failures - queued, 0);
      return { hour, success, queued, failed: failures };
    });

    return {
      id: 100 + index,
      name: `${channel.name} ${channel.categories[index % channel.categories.length]}`,
      channel: channel.name,
      channelId: channel.id,
      cron,
      latencyMinutes: Math.max(latency, 3),
      successRate: 0.82 + Math.random() * 0.15,
      active,
      status,
      hourlyLoad,
    };
  });

  const companyOptions = Array.from(new Set(articles.map((article) => article.companyName))).sort();
  const sectorOptions = Array.from(new Set(companiesCatalog.map((company) => company.sector))).sort();

  function aggregateTrend(rangeDays = 30) {
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const buckets = new Map();

    articles
      .filter((article) => new Date(article.publishedAt) >= cutoff)
      .forEach((article) => {
        const dateKey = article.publishedAt.slice(0, 10);
        if (!buckets.has(dateKey)) {
          buckets.set(dateKey, {
            total: 0,
            channels: new Map(),
          });
        }
        const bucket = buckets.get(dateKey);
        bucket.total += 1;
        bucket.channels.set(article.channelId, (bucket.channels.get(article.channelId) || 0) + 1);
      });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, value]) => ({
        date,
        total: value.total,
        channels: Object.fromEntries(value.channels),
      }));
  }

  function distributionByChannel(rangeDays = 30) {
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const distribution = new Map();

    articles
      .filter((article) => new Date(article.publishedAt) >= cutoff)
      .forEach((article) => {
        distribution.set(article.channelId, (distribution.get(article.channelId) || 0) + 1);
      });

    return channels.map((channel) => ({
      channelId: channel.id,
      label: channel.name,
      count: distribution.get(channel.id) || 0,
      status: channel.status,
    }));
  }

  function statusBreakdown(rangeDays = 30) {
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const breakdown = new Map();

    articles
      .filter((article) => new Date(article.publishedAt) >= cutoff)
      .forEach((article) => {
        const channelStats = breakdown.get(article.channelId) || {
          channel: channels.find((channel) => channel.id === article.channelId).name,
          counts: { Completed: 0, 'In Queue': 0, Improper: 0 },
        };
        channelStats.counts[article.status] += 1;
        breakdown.set(article.channelId, channelStats);
      });

    return Array.from(breakdown.values());
  }

  function schedulerHourlyMetrics(channelId = 'all') {
    const relevant =
      channelId === 'all'
        ? scheduler
        : scheduler.filter((job) => job.channelId === channelId || job.channel === channelId);

    const totals = Array.from({ length: 24 }).map((_, hour) => ({ hour, success: 0, queued: 0, failed: 0 }));

    relevant.forEach((job) => {
      job.hourlyLoad.forEach((slot) => {
        totals[slot.hour].success += slot.success;
        totals[slot.hour].queued += slot.queued;
        totals[slot.hour].failed += slot.failed;
      });
    });

    return totals;
  }

export const mockDataset = {
  channels,
  regions,
  companyOptions,
  sectorOptions,
  categoryOptions: categories,
  articles,
  scheduler,
  distributionByChannel,
  aggregateTrend,
  statusBreakdown,
  schedulerHourlyMetrics,
};

