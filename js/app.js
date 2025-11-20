import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import dayjs from 'https://esm.sh/dayjs@1.11.11';
import utc from 'https://esm.sh/dayjs@1.11.11/plugin/utc';
import relativeTime from 'https://esm.sh/dayjs@1.11.11/plugin/relativeTime';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.esm.js';

import { mockDataset } from '../data/mockData.js';
import { Utils } from './utils.js';

dayjs.extend(utc);
dayjs.extend(relativeTime);

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
);

const palette = ['#0f766e', '#2563eb', '#f97316', '#9333ea', '#ef4444', '#06b6d4', '#14b8a6'];

const filterDefaults = {
  channelId: 'all',
  category: 'all',
  company: 'all',
  sector: 'all',
  region: 'all',
  rangeDays: 30,
  showEngagement: false,
};

const rangeOptions = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last 12 months' },
];

const calcDelta = (current, previous) => {
  if (previous === 0) {
    if (current === 0) {
      return { label: '0.0% vs prev', value: 0 };
    }
    return { label: 'new', value: null };
  }
  const percentage = ((current - previous) / previous) * 100;
  return {
    label: `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}% vs prev`,
    value: percentage,
  };
};

const ChartCanvas = ({ type, data, options }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    chartRef.current = new ChartJS(canvasRef.current, {
      type,
      data,
      options,
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data = data;
    chartRef.current.options = options;
    chartRef.current.update();
  }, [data, options]);

  return React.createElement('canvas', { ref: canvasRef });
};

const SegmentCard = ({ label, badgeClass, badgeValue, value, caption, rangeLabel }) =>
  React.createElement(
    'article',
    { className: 'segment-card' },
    React.createElement(
      'div',
      { className: 'segment-header' },
      React.createElement('span', null, label),
      React.createElement('span', { className: `segment-badge ${badgeClass}` }, badgeValue),
    ),
    React.createElement('span', { className: 'segment-value' }, Utils.formatNumber(value)),
    React.createElement(
      'div',
      { className: 'segment-subline' },
      React.createElement('span', null, caption),
      React.createElement('span', { className: 'trend-chip' }, rangeLabel),
    ),
  );

const KpiCard = ({ label, value, delta, meta, kpiKey }) =>
  React.createElement(
    'article',
    { className: 'kpi-card', 'data-kpi': kpiKey },
    React.createElement('span', { className: 'kpi-label' }, label),
    React.createElement('span', { className: 'kpi-value' }, value),
    React.createElement(
      'div',
      { className: 'kpi-meta' },
      React.createElement(
        'span',
        { className: `kpi-delta ${delta.value === null ? 'delta-neutral' : Utils.deltaClass(delta.value)}` },
        delta.label,
      ),
      React.createElement('span', { className: 'trend-chip' }, meta),
    ),
  );

const getBaselineArticles = (filters) => {
  const now = dayjs();
  const scopedArticles = Utils.filterArticles({
    articles: mockDataset.articles,
    channelId: filters.channelId,
    category: filters.category,
    company: filters.company,
    sector: filters.sector,
    region: filters.region,
    rangeDays: filters.rangeDays * 2,
  });

  return scopedArticles.filter((article) => {
    const ts = dayjs(article.publishedAt);
    const diffDays = now.diff(ts, 'day', true);
    return diffDays >= filters.rangeDays && diffDays < filters.rangeDays * 2;
  });
};

const App = () => {
  const [filters, setFilters] = useState(filterDefaults);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => dayjs());

  const handleFilterChange = (field) => (event) => {
    const value = field === 'rangeDays' ? Number(event.target.value) : event.target.value;
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  useEffect(() => {
    setLastUpdated(dayjs());
  }, [filters, refreshing]);

  const filteredArticles = useMemo(
    () =>
      Utils.filterArticles({
        articles: mockDataset.articles,
        channelId: filters.channelId,
        category: filters.category,
        company: filters.company,
        sector: filters.sector,
        region: filters.region,
        rangeDays: filters.rangeDays,
      }),
    [filters],
  );

  const baselineArticles = useMemo(() => getBaselineArticles(filters), [filters]);

  const scheduler = useMemo(
    () =>
      filters.channelId === 'all'
        ? mockDataset.scheduler
        : mockDataset.scheduler.filter((item) => item.channelId === filters.channelId),
    [filters.channelId],
  );

  const previousDayCount = useMemo(() => {
    const previousDayKey = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    return mockDataset.articles.filter((article) => {
      if (dayjs(article.publishedAt).format('YYYY-MM-DD') !== previousDayKey) {
        return false;
      }
      if (filters.channelId !== 'all' && article.channelId !== filters.channelId) return false;
      if (filters.category !== 'all' && article.category !== filters.category) return false;
      if (filters.company !== 'all' && article.companyName !== filters.company) return false;
      if (filters.sector !== 'all' && article.sector !== filters.sector) return false;
      if (filters.region !== 'all' && article.region !== filters.region) return false;
      return true;
    }).length;
  }, [filters]);

  const kpiCards = useMemo(() => {
    const currentKpis = Utils.calculateKpis(filteredArticles, scheduler);
    const baselineKpis = Utils.calculateKpis(baselineArticles, scheduler);
    const uniquePublications = Utils.countPublications(filteredArticles);
    const baselinePublications = Utils.countPublications(baselineArticles);
    const configuredPages = Utils.countConfiguredPages(filteredArticles);
    const baselineConfigured = Utils.countConfiguredPages(baselineArticles);

    return [
      {
        key: 'totalArticles',
        label: 'Total Articles',
        value: Utils.formatNumber(currentKpis.totalArticles),
        delta: calcDelta(currentKpis.totalArticles, baselineKpis.totalArticles),
        meta: `${filters.rangeDays}-day window`,
      },
      {
        key: 'publications',
        label: 'Active Publications',
        value: Utils.formatNumber(uniquePublications),
        delta: calcDelta(uniquePublications, baselinePublications),
        meta: 'Unique feeds',
      },
      {
        key: 'configuredPages',
        label: 'Total Configured Pages',
        value: Utils.formatNumber(configuredPages),
        delta: calcDelta(configuredPages, baselineConfigured),
        meta: 'Distinct source pages',
      },
      {
        key: 'completedToday',
        label: 'Completed Today',
        value: Utils.formatNumber(currentKpis.publishedToday),
        delta: calcDelta(currentKpis.publishedToday, previousDayCount),
        meta: 'vs previous day',
      },
      {
        key: 'activeChannels',
        label: 'Active Channels',
        value: Utils.formatNumber(currentKpis.activeChannels),
        delta: calcDelta(currentKpis.activeChannels, baselineKpis.activeChannels),
        meta: 'Unique sources',
      },
      {
        key: 'averageDwell',
        label: 'Avg Dwell Time',
        value: `${Math.round(currentKpis.averageDwell)}s`,
        delta: calcDelta(currentKpis.averageDwell, baselineKpis.averageDwell),
        meta: 'Reader engagement',
      },
      {
        key: 'successRate',
        label: 'Scheduler Success',
        value: `${(currentKpis.successRate * 100).toFixed(1)}%`,
        delta: calcDelta(currentKpis.successRate, baselineKpis.successRate),
        meta: 'Execution reliability',
      },
    ];
  }, [baselineArticles, filteredArticles, filters.rangeDays, previousDayCount, scheduler]);

  const segmentData = useMemo(() => {
    if (!filteredArticles.length) {
      return [];
    }
    const counts = { completed: 0, queue: 0, improper: 0 };
    filteredArticles.forEach((article) => {
      if (article.status === 'Completed') counts.completed += 1;
      else if (article.status === 'In Queue') counts.queue += 1;
      else if (article.status === 'Improper') counts.improper += 1;
    });
    const total = filteredArticles.length || 1;
    return [
      {
        key: 'completed',
        label: 'Completed Articles',
        count: counts.completed,
        badgeClass: 'status-active',
        caption: 'Processed successfully',
        share: total ? ((counts.completed / total) * 100).toFixed(1) : '0.0',
      },
      {
        key: 'queue',
        label: 'Articles In Queue',
        count: counts.queue,
        badgeClass: 'status-queued',
        caption: 'Awaiting processing',
        share: total ? ((counts.queue / total) * 100).toFixed(1) : '0.0',
      },
      {
        key: 'improper',
        label: 'Improper Articles',
        count: counts.improper,
        badgeClass: 'status-improper',
        caption: 'Needs remediation',
        share: total ? ((counts.improper / total) * 100).toFixed(1) : '0.0',
      },
    ];
  }, [filteredArticles]);

  const channelsById = useMemo(
    () => new Map(mockDataset.channels.map((channel) => [channel.id, channel])),
    [],
  );

  const channelCoverage = useMemo(() => {
    const counts = new Map();
    filteredArticles.forEach((article) => {
      counts.set(article.channelId, (counts.get(article.channelId) || 0) + 1);
    });

    if (!counts.size) {
      return {
        label: 'No activity',
        chartData: {
          labels: ['No data'],
          datasets: [
            {
              data: [1],
              backgroundColor: ['#d1d5db'],
              borderColor: '#fff',
              borderWidth: 2,
            },
          ],
        },
      };
    }

    const labels = Array.from(counts.keys()).map((id) => channelsById.get(id)?.name ?? id);
    const values = Array.from(counts.values());

    return {
      label: `${counts.size} active`,
      chartData: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: palette.slice(0, values.length),
            borderColor: '#fff',
            borderWidth: 2,
          },
        ],
      },
    };
  }, [channelsById, filteredArticles]);

  const publicationTrend = useMemo(() => {
    if (!filteredArticles.length) {
      return {
        chartData: {
          labels: ['No data'],
          datasets: [
            {
              label: 'Total',
              data: [0],
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.25)',
            },
          ],
        },
      };
    }

    const grouped = new Map();
    filteredArticles.forEach((article) => {
      const dateKey = article.publishedAt.slice(0, 10);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, new Map());
      }
      const byChannel = grouped.get(dateKey);
      byChannel.set(article.channelId, (byChannel.get(article.channelId) || 0) + 1);
    });

    const sortedDates = Array.from(grouped.keys()).sort((a, b) => new Date(a) - new Date(b));
    const totals = sortedDates.map((date) => {
      const byChannel = grouped.get(date);
      return Array.from(byChannel.values()).reduce((sum, value) => sum + value, 0);
    });

    const datasets = Array.from(new Set(filteredArticles.map((article) => article.channelId))).map(
      (channelId, index) => ({
        label: channelsById.get(channelId)?.name ?? channelId,
        data: sortedDates.map((date) => grouped.get(date).get(channelId) || 0),
        borderColor: palette[index % palette.length],
        backgroundColor: palette[index % palette.length],
        tension: 0.35,
        fill: false,
      }),
    );

    return {
      chartData: {
        labels: sortedDates,
        datasets: [
          {
            label: 'Total',
            data: totals,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.18)',
            borderWidth: 3,
            fill: true,
            tension: 0.28,
          },
          ...datasets,
        ],
      },
    };
  }, [channelsById, filteredArticles]);

  const statusBreakdown = useMemo(() => {
    if (!filteredArticles.length) {
      return {
        totalLabel: '0 articles',
        chartData: {
          labels: ['No data'],
          datasets: [
            {
              label: 'Completed',
              data: [0],
              backgroundColor: '#94a3b8',
            },
          ],
        },
      };
    }

    const grouped = new Map();
    filteredArticles.forEach((article) => {
      if (!grouped.has(article.channelId)) {
        grouped.set(article.channelId, { Completed: 0, 'In Queue': 0, Improper: 0 });
      }
      grouped.get(article.channelId)[article.status] += 1;
    });

    const labels = Array.from(grouped.keys()).map((channelId) => channelsById.get(channelId)?.name ?? channelId);

    return {
      totalLabel: `${filteredArticles.length} articles`,
      chartData: {
        labels,
        datasets: [
          { label: 'Completed', data: Array.from(grouped.values()).map((stats) => stats.Completed), backgroundColor: '#22c55e' },
          { label: 'In Queue', data: Array.from(grouped.values()).map((stats) => stats['In Queue']), backgroundColor: '#facc15' },
          { label: 'Improper', data: Array.from(grouped.values()).map((stats) => stats.Improper), backgroundColor: '#ef4444' },
        ],
      },
    };
  }, [channelsById, filteredArticles]);

  const schedulerHourly = useMemo(() => {
    const data = mockDataset.schedulerHourlyMetrics(filters.channelId === 'all' ? 'all' : filters.channelId);
    const totals = data.map((slot) => slot.success + slot.queued + slot.failed);
    if (!totals.some((value) => value > 0)) {
      return {
        chartData: {
          labels: ['No data'],
          datasets: [
            { label: 'Completed', data: [0], backgroundColor: '#94a3b8' },
          ],
        },
        activeLabel: `${scheduler.length} schedules`,
      };
    }
    return {
      chartData: {
        labels: data.map((slot) => `${slot.hour.toString().padStart(2, '0')}:00`),
        datasets: [
          { label: 'Completed', data: data.map((slot) => slot.success), backgroundColor: 'rgba(34,197,94,0.6)' },
          { label: 'Queued', data: data.map((slot) => slot.queued), backgroundColor: 'rgba(234,179,8,0.6)' },
          { label: 'Failed', data: data.map((slot) => slot.failed), backgroundColor: 'rgba(248,113,113,0.6)' },
        ],
      },
      activeLabel: `${scheduler.length} schedules`,
    };
  }, [filters.channelId, scheduler.length]);

  const topStories = useMemo(() => {
    if (!filteredArticles.length) {
      return {
        chartData: {
          labels: ['No data'],
          datasets: [
            {
              label: 'Total Views',
              data: [0],
              backgroundColor: 'rgba(148, 163, 184, 0.35)',
              borderColor: '#94a3b8',
            },
          ],
        },
      };
    }

    const sorted = [...filteredArticles].sort((a, b) => {
      const aMetric = filters.showEngagement ? a.engagement.shares : a.engagement.webViews + a.engagement.mobileViews;
      const bMetric = filters.showEngagement ? b.engagement.shares : b.engagement.webViews + b.engagement.mobileViews;
      return bMetric - aMetric;
    });

    const topFive = sorted.slice(0, 5);
    return {
      chartData: {
        labels: topFive.map((article) => article.title),
        datasets: [
          {
            label: filters.showEngagement ? 'Shares' : 'Total Views',
            data: topFive.map((article) =>
              filters.showEngagement
                ? article.engagement.shares
                : article.engagement.webViews + article.engagement.mobileViews,
            ),
            backgroundColor: 'rgba(37, 99, 235, 0.22)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: 12,
          },
        ],
      },
    };
  }, [filteredArticles, filters.showEngagement]);

  const sortedArticles = useMemo(
    () => [...filteredArticles].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [filteredArticles],
  );

  const exportArticles = () => {
    const headers = ['Title', 'Source', 'Company', 'Sector', 'Region', 'Published', 'Status'];
    const rows = sortedArticles.map((article) => [
      article.title,
      article.source,
      article.companyName,
      article.sector,
      article.region,
      Utils.formatDate(article.publishedAt),
      article.status,
    ]);
    Utils.downloadCsv('articles-export.csv', [headers, ...rows]);
  };

  const lastUpdatedLabel = useMemo(() => {
    const stamp = lastUpdated.toDate();
    return `${Utils.formatDate(stamp)} (${Utils.formatRelative(stamp)})`;
  }, [lastUpdated]);

  return (
    React.createElement(
      'div',
      { className: 'page-wrapper' },
      React.createElement(
        'aside',
        { className: 'sidebar' },
        React.createElement(
          'div',
          { className: 'brand' },
          React.createElement('span', { className: 'brand-logo' }, '📰'),
          React.createElement(
            'div',
            null,
            React.createElement('h1', null, 'Spokesperson'),
            React.createElement('p', { className: 'brand-subtitle' }, 'Monitoring Dashboard'),
          ),
        ),
        React.createElement(
          'nav',
          null,
          React.createElement(
            'ul',
            null,
            ['Dashboard', 'Monitoring', 'Configuration', 'Scheduler'].map((item, index) =>
              React.createElement('li', { key: item, className: index === 0 ? 'active' : undefined }, item),
            ),
          ),
        ),
        React.createElement(
          'footer',
          { className: 'sidebar-footer' },
          React.createElement('p', { className: 'text-muted mb-1' }, 'Last updated'),
          React.createElement('p', { className: 'fw-semibold', id: 'last-updated' }, lastUpdatedLabel),
        ),
      ),
      React.createElement(
        'main',
        { className: 'content' },
        React.createElement(
          'header',
          { className: 'content-header' },
          React.createElement(
            'div',
            null,
            React.createElement('h2', null, 'Magazine Analytics'),
            React.createElement('p', { className: 'text-muted' }, 'Comprehensive view across all channels and schedules'),
          ),
          React.createElement(
            'div',
            { className: 'filters' },
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'channel-filter' }, 'Publication'),
              React.createElement(
                'select',
                {
                  id: 'channel-filter',
                  className: 'form-select form-select-sm',
                  value: filters.channelId,
                  onChange: handleFilterChange('channelId'),
                },
                React.createElement('option', { value: 'all' }, 'All publications'),
                mockDataset.channels.map((channel) =>
                  React.createElement('option', { key: channel.id, value: channel.id }, channel.name),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'category-filter' }, 'Category'),
              React.createElement(
                'select',
                {
                  id: 'category-filter',
                  className: 'form-select form-select-sm',
                  value: filters.category,
                  onChange: handleFilterChange('category'),
                },
                React.createElement('option', { value: 'all' }, 'All categories'),
                mockDataset.categoryOptions.map((category) =>
                  React.createElement('option', { key: category, value: category }, category),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'company-filter' }, 'Company'),
              React.createElement(
                'select',
                {
                  id: 'company-filter',
                  className: 'form-select form-select-sm',
                  value: filters.company,
                  onChange: handleFilterChange('company'),
                },
                React.createElement('option', { value: 'all' }, 'All companies'),
                mockDataset.companyOptions.map((company) =>
                  React.createElement('option', { key: company, value: company }, company),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'sector-filter' }, 'Sector'),
              React.createElement(
                'select',
                {
                  id: 'sector-filter',
                  className: 'form-select form-select-sm',
                  value: filters.sector,
                  onChange: handleFilterChange('sector'),
                },
                React.createElement('option', { value: 'all' }, 'All sectors'),
                mockDataset.sectorOptions.map((sector) =>
                  React.createElement('option', { key: sector, value: sector }, sector),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'region-filter' }, 'Region'),
              React.createElement(
                'select',
                {
                  id: 'region-filter',
                  className: 'form-select form-select-sm',
                  value: filters.region,
                  onChange: handleFilterChange('region'),
                },
                React.createElement('option', { value: 'all' }, 'All regions'),
                mockDataset.regions.map((region) =>
                  React.createElement('option', { key: region, value: region }, region),
                ),
              ),
            ),
            React.createElement(
              'div',
              { className: 'filter-group' },
              React.createElement('label', { htmlFor: 'range-filter' }, 'Date Range'),
              React.createElement(
                'select',
                {
                  id: 'range-filter',
                  className: 'form-select form-select-sm',
                  value: filters.rangeDays,
                  onChange: handleFilterChange('rangeDays'),
                },
                rangeOptions.map((option) =>
                  React.createElement('option', { key: option.value, value: option.value }, option.label),
                ),
              ),
            ),
          ),
        ),
        React.createElement(
          'section',
          { className: 'row g-4', id: 'kpi-cards' },
          kpiCards.map((card) => React.createElement(KpiCard, { key: card.key, ...card })),
        ),
        React.createElement(
          'section',
          { className: 'row g-4 mt-1', id: 'article-segments' },
          segmentData.length === 0
            ? React.createElement(SegmentCard, {
                label: 'No Articles',
                badgeClass: 'status-queued',
                badgeValue: '0%',
                value: 0,
                caption: 'Adjust filters to discover data',
                rangeLabel: `${filters.rangeDays}-day window`,
              })
            : segmentData.map((segment) =>
                React.createElement(SegmentCard, {
                  key: segment.key,
                  label: segment.label,
                  badgeClass: segment.badgeClass,
                  badgeValue: `${segment.share}%`,
                  value: segment.count,
                  caption: segment.caption,
                  rangeLabel: `${filters.rangeDays}-day window`,
                }),
              ),
        ),
        React.createElement(
          'section',
          { className: 'row g-4 mt-1 charts-grid' },
          React.createElement(
            'div',
            { className: 'col-xl-6' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Channel Coverage'),
                React.createElement('span', { className: 'badge rounded-pill text-bg-light', id: 'channel-count' }, channelCoverage.label),
              ),
              React.createElement(
                'div',
                { className: 'card-body' },
                React.createElement(ChartCanvas, {
                  type: 'doughnut',
                  data: channelCoverage.chartData,
                  options: {
                    plugins: { legend: { position: 'bottom' } },
                    cutout: '58%',
                  },
                }),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'col-xl-6' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Publication Trend'),
                React.createElement('span', { className: 'badge rounded-pill text-bg-light', id: 'trend-range' }, `Last ${filters.rangeDays} days`),
              ),
              React.createElement(
                'div',
                { className: 'card-body' },
                React.createElement(ChartCanvas, {
                  type: 'line',
                  data: publicationTrend.chartData,
                  options: {
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                  },
                }),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'col-xl-4' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Status Breakdown'),
                React.createElement('span', { className: 'badge rounded-pill text-bg-light', id: 'status-total' }, statusBreakdown.totalLabel),
              ),
              React.createElement(
                'div',
                { className: 'card-body' },
                React.createElement(ChartCanvas, {
                  type: 'bar',
                  data: statusBreakdown.chartData,
                  options: {
                    plugins: { legend: { position: 'bottom' } },
                    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                  },
                }),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'col-xl-8' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Top Performing Stories'),
                React.createElement(
                  'div',
                  { className: 'toggle-group' },
                  React.createElement('input', {
                    className: 'form-check-input',
                    type: 'checkbox',
                    id: 'engagement-toggle',
                    checked: filters.showEngagement,
                    onChange: (event) =>
                      setFilters((prev) => ({
                        ...prev,
                        showEngagement: event.target.checked,
                      })),
                  }),
                  React.createElement('label', { className: 'form-check-label', htmlFor: 'engagement-toggle' }, 'Show engagement metrics'),
                ),
              ),
              React.createElement(
                'div',
                { className: 'card-body' },
                React.createElement(ChartCanvas, {
                  type: 'bar',
                  data: topStories.chartData,
                  options: {
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.dataset.label}: ${Utils.formatNumber(context.raw)}`,
                        },
                      },
                    },
                    scales: {
                      x: { beginAtZero: true },
                    },
                  },
                }),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'col-12' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Scheduler Load by Hour'),
                React.createElement('span', { className: 'badge rounded-pill text-bg-light', id: 'scheduler-active-count' }, schedulerHourly.activeLabel),
              ),
              React.createElement(
                'div',
                { className: 'card-body' },
                React.createElement(ChartCanvas, {
                  type: 'bar',
                  data: schedulerHourly.chartData,
                  options: {
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      x: { stacked: true, ticks: { maxTicksLimit: 8 } },
                      y: { stacked: true, beginAtZero: true },
                    },
                  },
                }),
              ),
            ),
          ),
        ),
        React.createElement(
          'section',
          { className: 'row g-4 mt-1 table-grid' },
          React.createElement(
            'div',
            { className: 'col-xl-7' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Latest Articles'),
                React.createElement(
                  'button',
                  { className: 'btn btn-sm btn-outline-primary', id: 'export-articles', onClick: exportArticles },
                  'Export CSV',
                ),
              ),
              React.createElement(
                'div',
                { className: 'card-body table-responsive' },
                React.createElement(
                  'table',
                  { className: 'table table-hover align-middle', id: 'articles-table' },
                  React.createElement(
                    'thead',
                    null,
                    React.createElement(
                      'tr',
                      null,
                      ['Title', 'Source', 'Company', 'Sector', 'Region', 'Published', 'Status'].map((header) =>
                        React.createElement('th', { key: header }, header),
                      ),
                    ),
                  ),
                  React.createElement(
                    'tbody',
                    null,
                    sortedArticles.slice(0, 12).map((article) =>
                      React.createElement(
                        'tr',
                        { key: article.id },
                        React.createElement('td', null, article.title),
                        React.createElement('td', null, article.source),
                        React.createElement('td', null, article.companyName),
                        React.createElement('td', null, article.sector),
                        React.createElement('td', null, article.region),
                        React.createElement(
                          'td',
                          null,
                          React.createElement('div', null, Utils.formatDate(article.publishedAt)),
                          React.createElement('small', { className: 'text-muted' }, Utils.formatRelative(article.publishedAt)),
                        ),
                        React.createElement(
                          'td',
                          null,
                          React.createElement(
                            'span',
                            { className: `status-pill ${Utils.statusPillClass(article.status)}` },
                            article.status,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'col-xl-5' },
            React.createElement(
              'div',
              { className: 'card h-100' },
              React.createElement(
                'div',
                { className: 'card-header d-flex justify-content-between align-items-center' },
                React.createElement('h5', { className: 'mb-0' }, 'Scheduler Health'),
                React.createElement(
                  'button',
                  {
                    className: 'btn btn-sm btn-outline-secondary',
                    id: 'refresh-schedule',
                    onClick: handleRefresh,
                    disabled: refreshing,
                  },
                  refreshing ? 'Refreshing...' : 'Refresh',
                ),
              ),
              React.createElement(
                'div',
                { className: 'card-body table-responsive' },
                React.createElement(
                  'table',
                  { className: 'table table-sm align-middle', id: 'scheduler-table' },
                  React.createElement(
                    'thead',
                    null,
                    React.createElement(
                      'tr',
                      null,
                      ['Schedule', 'Channel', 'Cron', 'Latency', 'Status'].map((header) =>
                        React.createElement('th', { key: header }, header),
                      ),
                    ),
                  ),
                  React.createElement(
                    'tbody',
                    null,
                    scheduler.map((job) =>
                      React.createElement(
                        'tr',
                        { key: job.id },
                        React.createElement('td', null, job.name),
                        React.createElement('td', null, job.channel),
                        React.createElement('td', null, React.createElement('code', null, job.cron)),
                        React.createElement(
                          'td',
                          null,
                          React.createElement('div', { className: `latency-chip ${Utils.latencyClass(job.latencyMinutes)}` }, `${job.latencyMinutes} mins`),
                          React.createElement('small', { className: 'text-muted' }, `${Math.round(job.successRate * 100)}% success`),
                        ),
                        React.createElement(
                          'td',
                          null,
                          React.createElement('span', { className: `status-pill ${Utils.schedulerStatusPill(job.status, job.active)}` }, job.active ? 'Active' : 'Paused'),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    )
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(React.createElement(App));

