# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two main projects:

1. **StockDesk (股票分析系统)** - A stock analysis backend and frontend for analyzing A-share stocks with real market data, financial analysis, and AI-powered research summaries via OpenClaw.
2. **中药材溯源平台** - A traditional Chinese medicine traceability platform with dashboard for tracking market prices across four major markets (亳州，安国，成都，玉林).

## StockDesk Architecture

```
scripts/
  serve_stockdesk.py    # Entry point - runs the HTTP server
  stockdesk/
    server.py           # HTTP server with API routes (/api/health, /api/workspace, /api/analyze, etc.)
    config.py           # Settings loaded from environment variables
    service.py          # Core business logic: data fetching, caching, analysis, OpenClaw integration
    errors.py           # Custom exceptions (ValidationError, NotFoundError, ExternalServiceError)
```

### Running StockDesk

```bash
# Start the server (default: http://127.0.0.1:8765)
python scripts/serve_stockdesk.py

# Override host/port
python scripts/serve_stockdesk.py --host 0.0.0.0 --port 9000
```

### Environment Variables (.env.example)

```
STOCKDESK_HOST=127.0.0.1
STOCKDESK_PORT=8765
STOCKDESK_CACHE_TTL_SECONDS=900
STOCKDESK_OPENCLAW_AGENT=main
STOCKDESK_OPENCLAW_TIMEOUT_SECONDS=180
STOCKDESK_ALLOWED_ORIGIN=http://127.0.0.1:8765
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with OpenClaw status |
| GET | `/api/workspace?symbol=<code>` | Get single stock workspace data |
| GET | `/api/market-overview` | Get market overview with major indexes |
| GET | `/api/universe?q=<query>&limit=60` | Search stock universe |
| POST | `/api/analyze` | Analyze single stock (body: `{"symbols": [...]}`) |
| POST | `/api/batch-analyze` | Batch analyze stocks |
| POST | `/api/export-report` | Export analysis report to HTML |

### Data Flow

1. **Data Sources**: Uses `akshare` (imported as `ak`) to fetch real stock data from Chinese markets
2. **Caching**: JSON caches stored in `output/stockdesk-cache/` with configurable TTL
3. **OpenClaw Integration**: Optional AI analysis via external OpenClaw agent (configured in `~/.openclaw/openclaw.json`)

### Key Functions in service.py

- `build_workspace()` - Build complete stock workspace with price history, fundamentals, news
- `analyze_symbols()` - Run analysis on given symbols, optionally with OpenClaw AI
- `build_market_overview()` - Aggregate major market indexes (上证指数，深证成指，创业板指，沪深 300)
- `query_universe()` - Search and filter A-share universe

## 中药材溯源平台 Architecture

```
scripts/
  build_dashboard_data.py   # Build dashboard.json from Excel workbook
  build_excel_template.py   # Generate Excel template for data entry
public/
  index.html                # Main entry point
  assets/
    trace-admin.css/js      # Frontend for traceability system
```

### Building Dashboard Data

```bash
# Build dashboard JSON from Excel workbook
python scripts/build_dashboard_data.py /path/to/workbook.xlsx
```

### Excel Template Structure

The system uses a multi-sheet Excel template with:
- **产地行情**: Origin market prices
- **四大市场**: Four major markets (亳州，安国，成都，玉林)
- **行业热点**: Industry news and policy updates
- **下拉选项**: Hidden sheet with validation lists

## Directory Structure

```
.
├── scripts/
│   ├── serve_stockdesk.py
│   ├── stockdesk/
│   ├── build_dashboard_data.py
│   └── build_excel_template.py
├── public/
│   ├── stock-analysis-upgrade.html   # StockDesk frontend
│   ├── index.html                     # 中药材溯源平台 entry
│   ├── assets/
│   └── data/dashboard.json
├── output/
│   ├── stockdesk-cache/              # Auto-generated cache
│   └── reports/                       # Exported HTML reports
└── .env.example
```

## Dependencies

Key Python packages (no requirements.txt, installed system-wide or via other means):
- `akshare` - Chinese stock market data
- `openpyxl` - Excel file manipulation
- Standard library: `http.server`, `json`, `pathlib`, `datetime`

## Testing

```bash
# Test Bailian/MiniMax API integration
python scripts/test_bailian_minimax_m25.py --prompt "测试问题"
```
