# Spokesperson Magazine Analytics Dashboard

This is a standalone React dashboard that visualises magazine ingestion performance across multiple news channels. It is designed as a lightweight front-end prototype that you can host on any static web server or open directly in the browser (no build tooling required thanks to ES module imports from CDNs).

## Highlights

- KPI cards summarising article volume, active publications, configured pages, engagement, and scheduler health
- Interactive filters for publication, category, company, sector, region, and time window
- Segmented breakdown for in-queue, completed, and improper articles, plus Chart.js visuals for channel distribution, publication trends, scheduler hour-load, status mix, and top stories
- Latest article and scheduler health tables (with company/sector context) and CSV export support
- Mock data generator to simulate real ingestion pipelines (easy to replace with live API calls)

## Project Structure

```
dashboard/
├── index.html          # React mounting point + script module bootstrap
├── css/
│   └── styles.css      # Custom styles (built on top of Bootstrap 5)
├── data/
│   └── mockData.js     # Mock dataset generator for channels, articles, and schedulers
└── js/
    ├── app.js          # React components, state, and Chart.js bindings
    └── utils.js        # Shared utility helpers (formatting, CSV export, KPI maths)
```

## Getting Started

1. Open `dashboard/index.html` in any modern browser. React, ReactDOM, Chart.js, and Day.js are loaded as ES modules from trusted CDNs, so no Node.js tooling is required.
2. Use the filters in the header to change the analytics scope; charts and tables update instantly.
3. Click **Export CSV** to download the currently scoped article list.

## Using Real Data

- Replace the mock generator in `data/mockData.js` with actual fetch calls from your API or backend services.
- Populate the `channels`, `articles`, and `scheduler` collections using live data. Ensure each article includes:
  - `channelId`, `source`, `companyName`, `sector`, `category`, `region`, `status`, `publishedAt`
  - Optional `engagement` metrics (`webViews`, `mobileViews`, `shares`, `dwellSeconds`)
- Update `Utils.filterArticles` or the renderers if your schema differs.

## Next Steps

- Wire up authentication and follow your production design system for full integration.
- Move styling into your shared component library or CSS framework.
- Replace the mock scheduler health logic with your monitoring endpoint.
- Add automated tests (e.g., Cypress) once the dashboard is integrated into the application shell.

Feel free to drop this folder into your existing project or wrap it inside your SPA/SSR framework of choice.

