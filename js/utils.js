// Utility functions shared across dashboard widgets (ES module version)
import dayjs from 'https://esm.sh/dayjs@1.11.11';
import utc from 'https://esm.sh/dayjs@1.11.11/plugin/utc';
import relativeTime from 'https://esm.sh/dayjs@1.11.11/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(relativeTime);

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatDate(dateInput) {
  return dayjs(dateInput).format('YYYY-MM-DD HH:mm');
}

function formatRelative(dateInput) {
  return dayjs(dateInput).fromNow();
}

function deltaClass(delta) {
  if (delta > 0) return 'delta-up';
  if (delta < 0) return 'delta-down';
  return 'delta-neutral';
}

function buildCsv(rows) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = value.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  return rows.map((row) => row.map(escape).join(',')).join('\n');
}

function downloadCsv(filename, rows) {
  const csvContent = buildCsv(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
}

function calculateKpis(articles, scheduler) {
  const todayKey = dayjs().format('YYYY-MM-DD');
  const publishedToday = articles.filter((article) => dayjs(article.publishedAt).format('YYYY-MM-DD') === todayKey)
    .length;
  const totalArticles = articles.length;
  const activeChannels = new Set(articles.map((article) => article.channelId)).size;
  const averageDwell =
    articles.reduce((acc, article) => acc + article.engagement.dwellSeconds, 0) / Math.max(totalArticles, 1);
  const successRate =
    scheduler.reduce((acc, item) => acc + item.successRate, 0) / Math.max(scheduler.length, 1);

  return {
    publishedToday,
    totalArticles,
    activeChannels,
    averageDwell,
    successRate,
  };
}

function latencyClass(latency) {
  if (latency <= 12) return 'latency-good';
  if (latency <= 22) return 'latency-warn';
  return 'latency-poor';
}

function statusPillClass(status) {
  switch (status) {
    case 'Completed':
      return 'status-active';
    case 'In Queue':
      return 'status-queued';
    case 'Improper':
      return 'status-improper';
    default:
      return 'status-paused';
  }
}

function schedulerStatusPill(status, active) {
  if (!active) return 'status-paused';
  if (status === 'healthy') return 'status-active';
  if (status === 'warning') return 'status-queued';
  return 'status-paused';
}

function filterArticles({ articles, channelId, region, rangeDays, company, sector, category }) {
  const cutoff = dayjs().subtract(rangeDays, 'day');
  return articles.filter((article) => {
    const matchesChannel = channelId === 'all' || article.channelId === channelId;
    const matchesRegion = region === 'all' || article.region === region;
    const matchesCompany = !company || company === 'all' || article.companyName === company;
    const matchesSector = !sector || sector === 'all' || article.sector === sector;
    const matchesCategory = !category || category === 'all' || article.category === category;
    const matchesRange = dayjs(article.publishedAt).diff(cutoff, 'minute') >= 0;
    return (
      matchesChannel &&
      matchesRegion &&
      matchesCompany &&
      matchesSector &&
      matchesCategory &&
      matchesRange
    );
  });
}

function countConfiguredPages(articles) {
  return new Set(articles.map((article) => article.source)).size;
}

function countPublications(articles) {
  return new Set(articles.map((article) => article.channelId)).size;
}

export const Utils = {
  formatNumber,
  formatDate,
  formatRelative,
  deltaClass,
  downloadCsv,
  calculateKpis,
  latencyClass,
  statusPillClass,
  schedulerStatusPill,
  filterArticles,
  countConfiguredPages,
  countPublications,
};
