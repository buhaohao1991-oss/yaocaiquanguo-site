const DEFAULT_SYMBOL = "000792";
const RANGE_KEYS = ["1M", "3M", "6M"];
const DEFAULT_WORKFLOW = [
  { title: "先筛选后深挖", body: "先看全市场候选池，再进入单股页做真实数据研究。" },
  { title: "只保留长期因子", body: "重点关注经营质量、成长质量、估值性价比和价格位置。" },
  { title: "AI 只做研究助手", body: "OpenClaw 用来整理结论，不替代原始数据和长期判断。" },
  { title: "输出可跟踪结论", body: "每次研究都落到催化、风险、证据链和后续观察点。" }
];
const API_BASE = document.querySelector('meta[name="stockdesk-api-base"]')?.content?.trim() || "";

const state = {
  apiReady: false,
  openclawReady: false,
  busy: false,
  selectedCode: DEFAULT_SYMBOL,
  activeRange: "3M",
  marketOverview: null,
  stock: null,
  stockCache: {},
  universeItems: [],
  universeMeta: null,
  lastBatchSymbols: [],
  lastRunAt: "",
  lastSearchQuery: ""
};

const refs = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheRefs();
  bindEvents();
  setupReveal();
  refs["batch-input"].value = "000792\n601088\n300750";
  setMessage("正在连接本地研究服务...");
  render();
  void bootstrap();
});

function cacheRefs() {
  [
    "stock-search",
    "batch-input",
    "run-analysis",
    "run-batch",
    "export-report",
    "refresh-universe",
    "backend-status",
    "data-source-note",
    "global-message",
    "market-updated",
    "market-temperature-label",
    "market-temperature-score",
    "market-summary",
    "market-notes",
    "market-index-grid",
    "market-breadth-grid",
    "watchlist-note",
    "watchlist",
    "stock-title",
    "stock-meta",
    "market-session-badge",
    "price-main",
    "price-sub",
    "hero-summary",
    "hero-data-note",
    "hero-tags",
    "hero-stats",
    "confidence-note",
    "confidence-ring",
    "confidence-value",
    "stance-title",
    "stance-summary",
    "thesis-metrics",
    "range-tabs",
    "range-performance",
    "range-volatility",
    "axis-start",
    "axis-end",
    "chart-grid",
    "chart-area",
    "chart-line",
    "chart-bars",
    "chart-metrics",
    "flow-tone",
    "heatmap",
    "score-grid",
    "factor-bars",
    "analysis-current",
    "analysis-technical",
    "analysis-fundamental",
    "analysis-catalysts",
    "analysis-risks",
    "timeline-list",
    "evidence-grid",
    "log-stream",
    "log-note"
  ].forEach((id) => {
    refs[id] = document.getElementById(id);
  });
}

function bindEvents() {
  refs["refresh-universe"].addEventListener("click", async () => {
    if (!state.apiReady) {
      setMessage("本地服务未连接，无法刷新真实市场数据。");
      return;
    }
    await fetchMarketOverview({ forceRefresh: true });
    await fetchUniverse({ forceRefresh: true, query: "", message: "已刷新全部 A 股长期候选池。" });
  });

  refs["run-analysis"].addEventListener("click", async () => {
    await handleSingleAnalysis();
  });

  refs["run-batch"].addEventListener("click", async () => {
    await handleBatchAnalysis();
  });

  refs["export-report"].addEventListener("click", async () => {
    await handleExport();
  });

  refs["stock-search"].addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleSearch();
    }
  });
}

function setupReveal() {
  const nodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  nodes.forEach((node) => observer.observe(node));
}

async function bootstrap() {
  await fetchHealth();
  if (!state.apiReady) {
    render();
    return;
  }

  await fetchMarketOverview();
  await fetchUniverse({
    query: "",
    message: "已接入真实股票数据，当前展示全部 A 股长期候选池。"
  });
  await hydrateSymbol(state.selectedCode, {
    analyze: false,
    message: "已载入单股真实数据，点击“单股深研”可生成结构化研究结论。"
  });
}

async function fetchHealth() {
  try {
    const response = await requestJson(apiUrl("/api/health"));
    state.apiReady = Boolean(response.ok);
    state.openclawReady = Boolean(response.openclaw?.available);

    refs["backend-status"].textContent = "真实数据";
    refs["backend-status"].classList.add("is-live");
    refs["data-source-note"].textContent = state.openclawReady
      ? `AKShare + OpenClaw 已连接 · agent ${response.openclaw.model || "main"}`
      : "AKShare 已连接，OpenClaw 暂未就绪";
  } catch (error) {
    state.apiReady = false;
    state.openclawReady = false;
    refs["backend-status"].textContent = "未连接";
    refs["backend-status"].classList.remove("is-live");
    refs["data-source-note"].textContent = "请先运行本地 Python 服务，再加载真实数据与单股研究。";
    setMessage("本地服务未启动。运行 python3 scripts/serve_stockdesk.py 后再打开页面。");
  }
}

async function fetchMarketOverview({ forceRefresh = false } = {}) {
  if (!state.apiReady) {
    return;
  }

  setBusy(true, forceRefresh ? "正在刷新市场温度..." : "正在载入市场温度...");
  try {
    const suffix = forceRefresh ? "?refresh=1" : "";
    const response = await requestJson(apiUrl(`/api/market-overview${suffix}`));
    state.marketOverview = response;
    render();
  } catch (error) {
    setMessage(`载入市场温度失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function fetchUniverse({ query = "", forceRefresh = false, message = "" } = {}) {
  if (!state.apiReady) {
    return;
  }

  setBusy(true, forceRefresh ? "正在刷新全部 A 股候选池..." : "正在载入全部 A 股候选池...");
  try {
    const params = new URLSearchParams({
      q: query,
      limit: "60"
    });
    if (forceRefresh) {
      params.set("refresh", "1");
    }

    const response = await requestJson(apiUrl(`/api/universe?${params.toString()}`));
    state.universeItems = Array.isArray(response.items) ? response.items : [];
    state.universeMeta = response.meta || null;
    state.lastSearchQuery = query;
    render();
    if (message) {
      setMessage(message);
    }
  } catch (error) {
    setMessage(`载入候选池失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function handleSearch() {
  if (!state.apiReady) {
    setMessage("本地服务未连接，无法搜索真实股票。");
    return;
  }

  const rawQuery = refs["stock-search"].value.trim();
  if (!rawQuery) {
    setMessage("请输入股票代码或名称。");
    return;
  }

  const normalized = normalizeSymbol(rawQuery);
  if (normalized.length === 6) {
    await hydrateSymbol(normalized, {
      analyze: false,
      message: `已切换到 ${normalized} 的真实数据页。`
    });
    return;
  }

  await fetchUniverse({ query: rawQuery, message: `已搜索“${rawQuery}”并刷新候选池。` });
  const firstMatch = state.universeItems[0];
  if (!firstMatch) {
    setMessage(`没有找到“${rawQuery}”对应的 A 股。`);
    return;
  }

  refs["stock-search"].value = firstMatch.code;
  await hydrateSymbol(firstMatch.code, {
    analyze: false,
    message: `已切换到 ${firstMatch.name}（${firstMatch.code}）的真实数据页。`
  });
}

async function handleSingleAnalysis() {
  if (!state.apiReady) {
    setMessage("请先启动本地服务。");
    return;
  }
  if (!state.openclawReady) {
    setMessage("OpenClaw 未连接，当前只能查看真实数据，暂不能生成单股深研结论。");
    return;
  }

  state.lastRunAt = nowTime();
  await hydrateSymbol(state.selectedCode, {
    analyze: true,
    message: `已完成 ${state.selectedCode} 的单股深研。`
  });
}

async function handleBatchAnalysis() {
  if (!state.apiReady) {
    setMessage("请先启动本地服务。");
    return;
  }
  if (!state.openclawReady) {
    setMessage("OpenClaw 未连接，暂不能执行批量 AI 分析。");
    return;
  }

  const symbols = parseSymbols(refs["batch-input"].value);
  if (!symbols.length) {
    setMessage("请输入至少一个 6 位股票代码。");
    return;
  }

  setBusy(true, `正在批量分析 ${symbols.length} 只股票...`);
  try {
    const response = await requestJson(apiUrl("/api/batch-analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols })
    });

    const stocks = Array.isArray(response.stocks) ? response.stocks : [];
    stocks.forEach((stock) => {
      state.stockCache[stock.code] = stock;
    });
    if (stocks[0]) {
      state.selectedCode = stocks[0].code;
      state.stock = stocks[0];
      refs["stock-search"].value = stocks[0].code;
    }
    state.lastBatchSymbols = stocks.map((stock) => stock.code);
    render();
    setMessage(`批量分析完成：已生成 ${stocks.length} 只股票的结构化研究结论。`);
  } catch (error) {
    setMessage(`批量分析失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function handleExport() {
  if (!state.apiReady) {
    setMessage("请先启动本地服务。");
    return;
  }
  if (!state.openclawReady) {
    setMessage("OpenClaw 未连接，暂不能导出研究报告。");
    return;
  }

  const symbols = parseSymbols(refs["batch-input"].value);
  const exportSymbols = symbols.length ? symbols : [state.selectedCode];

  setBusy(true, "正在生成导出报告...");
  try {
    const response = await requestJson(apiUrl("/api/export-report"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: exportSymbols })
    });

    const link = document.createElement("a");
    link.href = response.download_url;
    link.download = response.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage(`报告已导出：${response.filename}`);
  } catch (error) {
    setMessage(`导出失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function hydrateSymbol(symbol, { analyze = false, message = "" } = {}) {
  if (!symbol) {
    return;
  }

  setBusy(true, analyze ? `正在生成 ${symbol} 的单股深研结论...` : `正在拉取 ${symbol} 的真实数据...`);
  try {
    const response = analyze
      ? await requestJson(apiUrl("/api/analyze"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: [symbol] })
        })
      : await requestJson(apiUrl(`/api/workspace?symbol=${encodeURIComponent(symbol)}`));

    const stock = analyze ? response.stocks?.[0] : response.stock;
    if (!stock) {
      throw new Error("未返回有效股票数据。");
    }

    state.selectedCode = stock.code;
    state.stock = stock;
    state.stockCache[stock.code] = stock;
    refs["stock-search"].value = stock.code;
    if (!RANGE_KEYS.includes(state.activeRange) || !stock.ranges?.[state.activeRange]) {
      state.activeRange = "3M";
    }
    render();
    if (message) {
      setMessage(message);
    }
  } catch (error) {
    setMessage(`加载 ${symbol} 失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function apiUrl(path) {
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

function setBusy(flag, message = "") {
  state.busy = flag;
  [
    "run-analysis",
    "run-batch",
    "export-report",
    "refresh-universe",
    "stock-search",
    "batch-input"
  ].forEach((id) => {
    if (refs[id]) {
      refs[id].disabled = flag;
    }
  });
  if (message) {
    setMessage(message);
  }
}

function setMessage(message) {
  refs["global-message"].textContent = message;
}

function normalizeSymbol(input) {
  return String(input || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

function parseSymbols(rawValue) {
  return Array.from(
    new Set(
      String(rawValue || "")
        .split(/[\s,，;；]+/)
        .map((item) => normalizeSymbol(item))
        .filter((item) => item.length === 6)
    )
  ).slice(0, 12);
}

function getActiveStock() {
  return state.stock || state.stockCache[state.selectedCode] || null;
}

function getDisplayedCandidates() {
  const items = [];
  const seen = new Set();

  const pushCandidate = (candidate) => {
    if (!candidate || !candidate.code || seen.has(candidate.code)) {
      return;
    }
    seen.add(candidate.code);
    items.push(candidate);
  };

  const selectedStock = getActiveStock();
  if (selectedStock) {
    pushCandidate(buildCandidateFromStock(selectedStock));
  }

  state.lastBatchSymbols.forEach((code) => {
    if (state.stockCache[code]) {
      pushCandidate(buildCandidateFromStock(state.stockCache[code]));
    }
  });

  state.universeItems.forEach((candidate) => {
    if (state.stockCache[candidate.code]) {
      pushCandidate(mergeCandidateWithStock(candidate, state.stockCache[candidate.code]));
    } else {
      pushCandidate(candidate);
    }
  });

  return items.slice(0, 60);
}

function buildCandidateFromStock(stock) {
  return {
    code: stock.code,
    name: stock.name,
    sector: stock.sector,
    long_term_score: toNumber(stock.heroStats?.[0]?.value),
    note: stock.summary,
    live: true,
    price: stock.price,
    changePct: stock.changePct,
    stance: stock.thesis?.stance || "已研究"
  };
}

function mergeCandidateWithStock(candidate, stock) {
  return {
    ...candidate,
    live: true,
    price: stock.price,
    changePct: stock.changePct,
    note: stock.summary,
    stance: stock.thesis?.stance || "已研究",
    long_term_score: toNumber(stock.heroStats?.[0]?.value) || candidate.long_term_score
  };
}

function render() {
  renderMarketOverview();
  renderWatchlist();

  const stock = getActiveStock();
  if (!stock) {
    renderEmptyState();
    return;
  }

  const range = stock.ranges?.[state.activeRange] || stock.ranges?.["3M"] || Object.values(stock.ranges || {})[0];
  renderHero(stock);
  renderRangeTabs(stock);
  renderChart(stock, range);
  renderFactors(stock);
  renderAnalysis(stock);
  renderTimeline(stock);
  renderEvidence(stock);
  renderLogs(stock);
}

function renderEmptyState() {
  refs["stock-title"].textContent = "等待载入";
  refs["stock-meta"].textContent = "请先启动本地服务并载入真实股票数据";
  refs["market-session-badge"].textContent = state.apiReady ? "真实数据" : "未连接";
  refs["price-main"].textContent = "--";
  refs["price-sub"].textContent = state.apiReady ? "输入股票代码开始研究" : "运行本地服务后可用";
  refs["price-sub"].className = "price-sub";
  refs["hero-summary"].textContent = "这个页面只做两件事：先看全市场长期候选池，再对单只 A 股生成真实研究结论。";
  refs["hero-data-note"].textContent = "日期口径会分别标明行情、财务、新闻和研报对应的时间。";
  refs["hero-tags"].innerHTML = ["全部A股", "长期主义", "真实数据"]
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");
  refs["hero-stats"].innerHTML = "";
  refs["confidence-note"].textContent = "等待数据";
  refs["confidence-ring"].style.setProperty("--score", "0");
  refs["confidence-value"].textContent = "0";
  refs["stance-title"].textContent = "尚未载入";
  refs["stance-summary"].textContent = "候选池和个股研究结果会在服务可用后自动显示。";
  refs["thesis-metrics"].innerHTML = "";
  refs["range-tabs"].innerHTML = "";
  refs["range-performance"].textContent = "--";
  refs["range-performance"].className = "";
  refs["range-volatility"].textContent = "--";
  refs["axis-start"].textContent = "--";
  refs["axis-end"].textContent = "--";
  refs["chart-grid"].innerHTML = "";
  refs["chart-area"].setAttribute("d", "");
  refs["chart-line"].setAttribute("d", "");
  refs["chart-bars"].innerHTML = "";
  refs["chart-metrics"].innerHTML = "";
  refs["flow-tone"].textContent = "等待数据";
  refs["heatmap"].innerHTML = "";
  refs["score-grid"].innerHTML = "";
  refs["factor-bars"].innerHTML = "";
  refs["analysis-current"].textContent = "未载入";
  refs["analysis-technical"].innerHTML = "";
  refs["analysis-fundamental"].innerHTML = "";
  refs["analysis-catalysts"].innerHTML = "";
  refs["analysis-risks"].innerHTML = "";
  refs["timeline-list"].innerHTML = "";
  refs["evidence-grid"].innerHTML = "";
  refs["log-stream"].innerHTML = `<div class="log-line"><span>${escapeHtml(nowTime())}</span><div>${escapeHtml(state.apiReady ? "INFO  服务已连接，等待载入股票数据。" : "INFO  本地服务未连接。")}</div></div>`;
  refs["log-note"].textContent = state.apiReady ? "真实数据" : "未连接";
}

function renderMarketOverview() {
  const market = state.marketOverview;
  if (!market) {
    refs["market-updated"].textContent = state.apiReady ? "等待市场数据" : "未连接";
    refs["market-temperature-label"].textContent = "等待数据";
    refs["market-temperature-score"].textContent = "--";
    refs["market-summary"].textContent = "市场温度会基于真实指数和涨跌家数自动更新。";
    refs["market-notes"].innerHTML = "";
    refs["market-index-grid"].innerHTML = "";
    refs["market-breadth-grid"].innerHTML = "";
    return;
  }

  const labelTone =
    market.temperature?.score >= 74 ? "is-hot" : market.temperature?.score >= 60 ? "is-warm" : market.temperature?.score >= 45 ? "is-neutral" : "is-cold";
  refs["market-updated"].textContent = market.updated_at || "实时更新";
  refs["market-temperature-label"].textContent = market.temperature?.label || "中性";
  refs["market-temperature-label"].className = `status-badge ${labelTone}`;
  refs["market-temperature-score"].textContent = market.temperature?.score ?? "--";
  refs["market-summary"].textContent = market.temperature?.summary || "";
  refs["market-notes"].innerHTML = (market.temperature?.notes || [])
    .map((note) => `<div class="market-note">${escapeHtml(note)}</div>`)
    .join("");
  refs["market-index-grid"].innerHTML = (market.indices || [])
    .map((item) => {
      const changeClass = item.changePct >= 0 ? "positive" : "negative";
      return `
        <article class="market-index-card">
          <div class="market-index-head">
            <div>
              <strong>${escapeHtml(item.short || item.name)}</strong>
              <span>${escapeHtml(item.name)}</span>
            </div>
            <em class="${changeClass}">${formatSigned(item.changePct)}%</em>
          </div>
          <div class="market-index-value">${escapeHtml(formatMarketLevel(item.close))}</div>
          <div class="market-index-meta">
            <span>${escapeHtml(item.trend || "")}</span>
            <span>1M ${escapeHtml(formatSigned(item.monthChangePct))}%</span>
            <span>3M ${escapeHtml(formatSigned(item.quarterChangePct))}%</span>
          </div>
        </article>
      `;
    })
    .join("");
  refs["market-breadth-grid"].innerHTML = (market.breadth || [])
    .map((item) => {
      return `
        <article class="mini-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.note || "")}</small>
        </article>
      `;
    })
    .join("");
}

function renderWatchlist() {
  const displayed = getDisplayedCandidates();
  const marketCount = state.universeMeta?.market_count || 0;
  const candidateCount = state.universeMeta?.candidate_count || 0;
  const reportDate = state.universeMeta?.report_date || "";
  refs["watchlist-note"].textContent = marketCount
    ? `全市场 ${marketCount} / 候选 ${candidateCount}${reportDate ? ` / 年报 ${reportDate}` : ""}`
    : "等待候选池";

  if (!displayed.length) {
    refs["watchlist"].innerHTML = `<p class="panel-note">服务启动后会显示全部 A 股长期候选池。</p>`;
    return;
  }

  refs["watchlist"].innerHTML = displayed
    .map((item) => {
      const activeClass = item.code === state.selectedCode ? "is-active" : "";
      const changePct = toNumber(item.changePct);
      const changeClass = Number.isFinite(changePct) ? (changePct >= 0 ? "is-up" : "is-down") : "";
      const headline = item.live
        ? `
          <div class="watch-price ${changeClass}">
            <strong>${formatPrice(item.price)}</strong>
            <span>${formatSigned(changePct)}%</span>
          </div>
        `
        : `
          <div class="watch-price">
            <strong>${formatCandidateScore(item.long_term_score)}</strong>
            <span>候选评分</span>
          </div>
        `;
      const footLeft = item.stance || `评分 ${formatCandidateScore(item.long_term_score)}`;
      const footRight = item.note || item.sector || "等待研究";
      return `
        <button class="watch-item ${activeClass}" type="button" data-watch-code="${escapeHtml(item.code)}">
          <div class="watch-head">
            <div class="watch-name">
              <strong>${escapeHtml(item.name || item.code)}</strong>
              <span>${escapeHtml(item.code)} · ${escapeHtml(item.sector || "待分析")}</span>
            </div>
            ${headline}
          </div>
          <div class="watch-foot">
            <span>${escapeHtml(footLeft)}</span>
            <span>${escapeHtml(trimText(footRight, 26))}</span>
          </div>
        </button>
      `;
    })
    .join("");

  refs["watchlist"].querySelectorAll("[data-watch-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      await hydrateSymbol(button.dataset.watchCode, {
        analyze: false,
        message: `已切换到 ${button.dataset.watchCode} 的真实数据页。`
      });
    });
  });
}

function renderHero(stock) {
  refs["stock-title"].textContent = stock.name;
  refs["stock-meta"].textContent = `${stock.ticker} · ${stock.sector} · 更新时间 ${stock.updated}`;
  refs["market-session-badge"].textContent = state.marketOverview?.temperature?.label
    ? `市场${state.marketOverview.temperature.label}`
    : state.openclawReady
      ? "真实数据 + AI"
      : "真实数据";
  refs["price-main"].textContent = formatPrice(stock.price);
  refs["price-sub"].textContent = `${formatSigned(stock.change)} / ${formatSigned(stock.changePct)}%`;
  refs["price-sub"].className = `price-sub ${stock.changePct >= 0 ? "positive" : "negative"}`;
  refs["hero-summary"].textContent = stock.summary;
  refs["hero-data-note"].textContent = buildDataDateNote(stock.dataDates);
  refs["hero-tags"].innerHTML = (stock.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  refs["hero-stats"].innerHTML = (stock.heroStats || [])
    .map((item) => {
      return `
        <div class="stat-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
          <small>${escapeHtml(item.note || "")}</small>
        </div>
      `;
    })
    .join("");

  refs["confidence-note"].textContent = `置信度 ${stock.thesis.confidence}%`;
  refs["confidence-ring"].style.setProperty("--score", String(stock.thesis.confidence));
  refs["confidence-value"].textContent = stock.thesis.confidence;
  refs["stance-title"].textContent = stock.thesis.stance;
  refs["stance-summary"].textContent = stock.thesis.summary;
  refs["thesis-metrics"].innerHTML = (stock.thesis.metrics || [])
    .map((item) => {
      return `
        <div class="mini-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
        </div>
      `;
    })
    .join("");
}

function renderRangeTabs(stock) {
  refs["range-tabs"].innerHTML = RANGE_KEYS.filter((key) => stock.ranges?.[key])
    .map((range) => {
      const activeClass = range === state.activeRange ? "is-active" : "";
      return `<button class="range-tab ${activeClass}" type="button" data-range="${escapeHtml(range)}">${escapeHtml(range)}</button>`;
    })
    .join("");

  refs["range-tabs"].querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeRange = button.dataset.range;
      render();
    });
  });
}

function renderChart(stock, range) {
  if (!range) {
    return;
  }
  refs["range-performance"].textContent = `${formatSigned(range.performance)}%`;
  refs["range-performance"].className = range.performance >= 0 ? "positive" : "negative";
  refs["range-volatility"].textContent = `${toNumber(range.volatility).toFixed(1)}%`;
  refs["axis-start"].textContent = range.axisStart;
  refs["axis-end"].textContent = range.axisEnd;
  refs["flow-tone"].textContent = range.flowTone;
  refs["chart-metrics"].innerHTML = (range.metrics || [])
    .map((item) => {
      return `
        <div class="mini-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
        </div>
      `;
    })
    .join("");
  refs["heatmap"].innerHTML = (stock.heatmap || [])
    .map((value) => {
      const alpha = (0.16 + value * 0.62).toFixed(2);
      return `<div class="heat-cell" style="background: rgba(29, 163, 124, ${alpha})"></div>`;
    })
    .join("");

  drawChart(range.price || [], range.volume || []);
}

function drawChart(priceData, volumeData) {
  if (!priceData.length) {
    refs["chart-grid"].innerHTML = "";
    refs["chart-area"].setAttribute("d", "");
    refs["chart-line"].setAttribute("d", "");
    refs["chart-bars"].innerHTML = "";
    return;
  }

  const width = 760;
  const height = 360;
  const paddingX = 34;
  const paddingTop = 20;
  const volumeHeight = 76;
  const chartBottom = height - volumeHeight - 18;
  const min = Math.min(...priceData) - 0.5;
  const max = Math.max(...priceData) + 0.5;
  const denominator = Math.max(max - min, 1);
  const stepX = priceData.length > 1 ? (width - paddingX * 2) / (priceData.length - 1) : 0;

  const points = priceData.map((value, index) => {
    const x = paddingX + stepX * index;
    const y = chartBottom - ((value - min) / denominator) * (chartBottom - paddingTop);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${chartBottom} L ${firstPoint.x.toFixed(2)} ${chartBottom} Z`;

  refs["chart-line"].setAttribute("d", linePath);
  refs["chart-area"].setAttribute("d", areaPath);

  const volumeMax = Math.max(...volumeData, 1);
  refs["chart-bars"].innerHTML = volumeData
    .map((value, index) => {
      const barWidth = Math.max(8, stepX * 0.46 || 20);
      const barHeight = (value / volumeMax) * 58;
      const x = paddingX + stepX * index - barWidth / 2;
      const y = height - 12 - barHeight;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${barHeight.toFixed(2)}" rx="4"></rect>`;
    })
    .join("");

  refs["chart-grid"].innerHTML = Array.from({ length: 4 })
    .map((_, index) => {
      const y = paddingTop + ((chartBottom - paddingTop) / 3) * index;
      return `<line x1="18" y1="${y.toFixed(2)}" x2="742" y2="${y.toFixed(2)}"></line>`;
    })
    .join("");
}

function renderFactors(stock) {
  refs["score-grid"].innerHTML = (stock.scores || [])
    .map((item) => {
      return `
        <div class="score-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
          <small>${escapeHtml(item.note || "")}</small>
        </div>
      `;
    })
    .join("");

  refs["factor-bars"].innerHTML = (stock.factors || [])
    .map((factor) => {
      return `
        <div class="factor-row">
          <div class="factor-head">
            <strong>${escapeHtml(factor.label)}</strong>
            <span>${escapeHtml(String(factor.value))}</span>
          </div>
          <div class="factor-track">
            <div class="factor-fill" style="width: ${clampPercent(factor.value)}%"></div>
          </div>
          <div class="factor-caption">${escapeHtml(factor.caption || "")}</div>
        </div>
      `;
    })
    .join("");
}

function renderAnalysis(stock) {
  refs["analysis-current"].textContent = stock.thesis.current;
  refs["analysis-technical"].innerHTML = (stock.thesis.technical || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  refs["analysis-fundamental"].innerHTML = (stock.thesis.fundamental || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  refs["analysis-catalysts"].innerHTML = (stock.thesis.catalysts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  refs["analysis-risks"].innerHTML = (stock.thesis.risks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTimeline(stock) {
  refs["timeline-list"].innerHTML = (stock.timeline || [])
    .map((item) => {
      return `
        <div class="timeline-item">
          <div class="timeline-date">
            <span>${escapeHtml(item.month)} 月</span>
            <strong>${escapeHtml(item.day)}</strong>
          </div>
          <div class="timeline-copy">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.body)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEvidence(stock) {
  refs["evidence-grid"].innerHTML = (stock.evidence || [])
    .map((item) => {
      return `
        <div class="evidence-card">
          <span class="evidence-tag">${escapeHtml(item.tag)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </div>
      `;
    })
    .join("");
}

function renderLogs(stock) {
  const logs = Array.isArray(stock.logs) ? [...stock.logs] : [];

  if (state.lastRunAt) {
    logs.unshift({
      time: state.lastRunAt,
      text: `INFO  手动触发单股深研：${stock.code} 已更新结构化结论。`
    });
  }

  refs["log-note"].textContent = state.openclawReady ? "真实数据 + OpenClaw" : "真实数据";
  refs["log-stream"].innerHTML = logs
    .map((log) => {
      return `
        <div class="log-line">
          <span>${escapeHtml(log.time)}</span>
          <div>${escapeHtml(log.text)}</div>
        </div>
      `;
    })
    .join("");
}

function formatPrice(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return number.toFixed(number >= 100 ? 1 : 2);
}

function formatSigned(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return `${number >= 0 ? "+" : ""}${number
    .toFixed(Math.abs(number) >= 10 ? 1 : 2)
    .replace(/(\.\d*[1-9])0+$/, "$1")
    .replace(/\.0$/, "")}`;
}

function formatCandidateScore(value) {
  const number = toNumber(value);
  return Number.isFinite(number) ? number.toFixed(1) : "--";
}

function buildDataDateNote(dataDates) {
  if (!dataDates) {
    return "日期口径待更新。";
  }

  const parts = [];
  if (dataDates.quote_time) {
    parts.push(`行情抓取 ${dataDates.quote_time}`);
  }
  if (dataDates.financial_report_date) {
    parts.push(`财务口径 ${dataDates.financial_report_date}`);
  }
  if (dataDates.latest_news_at) {
    parts.push(`最新新闻 ${dataDates.latest_news_at}`);
  }
  if (dataDates.latest_report_at) {
    parts.push(`最新研报 ${dataDates.latest_report_at}`);
  }
  return parts.join(" · ") || "日期口径待更新。";
}

function formatMarketLevel(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return "--";
  }
  return number.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function clampPercent(value) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(number, 100));
}

function trimText(text, maxLength) {
  const raw = String(text || "");
  return raw.length > maxLength ? `${raw.slice(0, maxLength - 1)}…` : raw;
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }
  const number = Number.parseFloat(String(value));
  return Number.isFinite(number) ? number : Number.NaN;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
