const NAV_ITEMS = [
  { id: "home", href: "index.html", title: "首页", subtitle: "总览与待办" },
  { id: "base-trace", href: "base-trace.html", title: "基地溯源", subtitle: "种植基地主档" },
  { id: "seed-trace", href: "seed-trace.html", title: "种源备案", subtitle: "种苗与供应商" },
  { id: "farming-trace", href: "farming-trace.html", title: "种植与农事", subtitle: "过程与田间留痕" },
  { id: "harvest-trace", href: "harvest-trace.html", title: "采收追溯", subtitle: "采收批次管理" },
  { id: "processing-trace", href: "processing-trace.html", title: "初加工与工艺", subtitle: "加工过程与步骤" },
  { id: "herb-management", href: "herb-management.html", title: "药材档案", subtitle: "物料规格与成品档" },
  { id: "trace-code-management", href: "trace-code-management.html", title: "赋码与查询", subtitle: "溯源码与查询页" },
  { id: "warehouse-management", href: "warehouse-management.html", title: "仓库管理", subtitle: "仓库主档与使用" }
];

const STORE_KEY = "trace-admin-workflow-v2";
const DRAFT_KEY_PREFIX = "trace-admin-draft-v2:";
const TRACE_QUERY_PAGE = "trace-query.html";
const TRACE_MAP_PAGE_ID = "base-trace";
const TRACE_MAP_SCRIPT_ID = "trace-map-sdk";
const TRACE_MAP_CONFIG_DEFAULTS = {
  provider: "tianditu",
  tk: "",
  defaultCenter: [104.114129, 35.550339],
  defaultZoom: 5,
  detailZoom: 11,
  searchZoom: 15
};
const BASE_TRACE_MAX_PHOTOS = 6;
const BASE_TRACE_PHOTO_MAX_EDGE = 1440;
const BASE_TRACE_PHOTO_QUALITY = 0.84;
const TRACE_MAP_RUNTIME = {
  sdkPromise: null
};

const BASE_TYPES = ["一般基地", "GAP 基地", "GACP 基地", "共建基地"];
const COOPERATION_MODES = ["自建", "共建", "合作社联营", "委托种植"];
const BREED_MATERIALS = ["种子", "育苗", "块根", "其他"];
const SOURCE_TYPES = ["自繁自育", "合作采购", "委托繁育", "其他"];
const PLANT_METHODS = ["间作", "轮作", "套作", "直播", "移栽", "其他"];
const PLANT_TYPES = ["种植", "育苗"];
const FARM_WORK_NAMES = ["播种", "育苗", "移栽", "浇水", "施肥", "病虫害巡查", "除草", "采前抽样", "田间巡查"];
const HARVEST_TYPES = ["基地采收", "野生采收"];
const HARVEST_METHODS = ["人工采收", "机械采收", "混合采收"];
const PROCESS_TYPES = ["人工", "机械", "混合"];
const MATERIAL_TYPES = ["原药材", "饮片待包装", "饮片成品", "辅料", "包材", "其他"];
const STORAGE_CONDITIONS = ["阴凉干燥", "常温避光", "冷藏保鲜", "控温控湿"];
const STORAGE_METHODS = ["托盘堆码", "货架分层", "周转箱", "密封储藏"];
const DOCUMENT_STATUS_OPTIONS = ["待补充", "已归档"];
const DATE_DISPLAY = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const APP_STATE = {
  query: "",
  selectedId: "",
  autoOpenHandled: false,
  autoOpenKind: "primary"
};

const EMPTY_WORKFLOW_STORE = {
  version: 2,
  bases: [],
  seeds: [],
  plantProcesses: [],
  farmRecords: [],
  harvests: [],
  materials: [],
  primaryProcesses: [],
  processSteps: [],
  warehouses: [],
  qrCodes: [],
  activities: []
};

const PAGE_CONFIGS = {
  "base-trace": {
    kind: "entity",
    title: "基地溯源",
    kicker: "BASE TRACE",
    subtitle: "先把种植主体、基地资料和地理信息建成主档，后续种源、采收、加工都会从这里接上。",
    actionLabel: "新建基地档案",
    searchPlaceholder: "搜索基地名称、负责人、药材或地区",
    getViews: (shared) => shared.views.bases,
    getStats: (shared, views) => [
      { label: "基地档案", value: String(views.length), tone: "primary" },
      { label: "已完备主档", value: String(views.filter((item) => item.readiness >= 85).length), tone: "good" },
      { label: "已关联种源", value: String(views.filter((item) => item.seedCount > 0).length), tone: "normal" }
    ],
    searchText: (view) => [view.name, view.code, view.manager, view.herb, view.addressLine].join(" "),
    columns: [
      { label: "基地档案", render: (view) => titleCell(view.name, `${view.code} · ${view.herb}`) },
      { label: "负责人", render: (view) => view.manager },
      { label: "面积", render: (view) => view.areaText },
      { label: "资料状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "下游关联", render: (view) => metricMini(`${view.seedCount} 种源 / ${view.plantCount} 种植`) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderBaseDetail(view, shared)
  },
  "seed-trace": {
    kind: "entity",
    title: "种源备案",
    kicker: "SEED SOURCE",
    subtitle: "围绕种源批次、供应商、资质状态和关联网点建立可回查的种苗档案。",
    actionLabel: "新增种源批次",
    searchPlaceholder: "搜索种源批次、基地、药材或供应商",
    getViews: (shared) => shared.views.seeds,
    getStats: (shared, views) => [
      { label: "种源批次", value: String(views.length), tone: "primary" },
      { label: "已归档资质", value: String(views.filter((item) => item.certificateStatus === "已归档").length), tone: "good" },
      { label: "进入种植", value: String(views.filter((item) => item.plantCount > 0).length), tone: "normal" }
    ],
    searchText: (view) => [view.batchNo, view.herb, view.baseName, view.supplierName, view.brand].join(" "),
    columns: [
      { label: "种源批次", render: (view) => titleCell(view.batchNo, `${view.herb} · ${view.baseName}`) },
      { label: "供应商", render: (view) => view.supplierName },
      { label: "来源", render: (view) => `${view.sourceType} / ${view.breedMaterial}` },
      { label: "到货", render: (view) => view.quantityText },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderSeedDetail(view, shared)
  },
  "farming-trace": {
    kind: "compound",
    title: "种植与农事",
    kicker: "PLANT & FARM",
    subtitle: "把种植过程作为主线，把农事记录作为时间轴挂在过程下，形成真正可追到田间的履历。",
    actionLabel: "新建种植过程",
    secondaryActionLabel: "新增农事记录",
    searchPlaceholder: "搜索种植项目、批次、基地或种源",
    getViews: (shared) => shared.views.plants,
    getSecondaryViews: (selected, shared) => selected ? shared.views.farmRecords.filter((item) => item.plantId === selected.id) : [],
    getStats: (shared, views) => [
      { label: "种植过程", value: String(views.length), tone: "primary" },
      { label: "农事记录", value: String(shared.views.farmRecords.length), tone: "normal" },
      { label: "已进采收", value: String(views.filter((item) => item.harvestCount > 0).length), tone: "good" }
    ],
    searchText: (view) => [view.name, view.plantBatch, view.baseName, view.seedBatch, view.worker].join(" "),
    columns: [
      { label: "种植项目", render: (view) => titleCell(view.name, `${view.plantBatch} · ${view.herb}`) },
      { label: "基地 / 种源", render: (view) => stackedCell(view.baseName, view.seedBatch) },
      { label: "负责人", render: (view) => view.worker },
      { label: "农事记录", render: (view) => metricMini(`${view.farmCount} 条`) },
      { label: "阶段", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderPlantDetail(view, shared),
    renderSecondaryDetail: (items) => renderFarmTimeline(items)
  },
  "harvest-trace": {
    kind: "entity",
    title: "采收追溯",
    kicker: "HARVEST TRACE",
    subtitle: "采收必须接住上游种植过程，并把采收批次、重量、部位和验收负责人独立留档。",
    actionLabel: "新增采收批次",
    searchPlaceholder: "搜索采收名称、采收批次、基地或药材",
    getViews: (shared) => shared.views.harvests,
    getStats: (shared, views) => [
      { label: "采收批次", value: String(views.length), tone: "primary" },
      { label: "已进加工", value: String(views.filter((item) => item.processCount > 0).length), tone: "good" },
      { label: "鲜货总重", value: `${formatNumber(sumNumbers(views.map((item) => item.harvestWeight))) } kg`, tone: "normal" }
    ],
    searchText: (view) => [view.name, view.harvestBatch, view.baseName, view.plantBatch, view.herb].join(" "),
    columns: [
      { label: "采收批次", render: (view) => titleCell(view.name, `${view.harvestBatch} · ${view.herb}`) },
      { label: "来源", render: (view) => stackedCell(view.baseName, view.plantBatch) },
      { label: "采收重量", render: (view) => `${formatDecimal(view.harvestWeight)} kg` },
      { label: "负责人", render: (view) => view.harvestManager },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderHarvestDetail(view, shared)
  },
  "processing-trace": {
    kind: "compound",
    title: "初加工与工艺",
    kicker: "PRIMARY PROCESS",
    subtitle: "把采收来料、加工过程和工艺步骤拆开管理，既能看投入产出，也能看工艺细节。",
    actionLabel: "新增加工过程",
    secondaryActionLabel: "新增工艺步骤",
    searchPlaceholder: "搜索加工名称、批次、药材或来源采收",
    getViews: (shared) => shared.views.processes,
    getSecondaryViews: (selected, shared) => selected ? shared.views.processSteps.filter((item) => item.primaryProcessId === selected.id) : [],
    getStats: (shared, views) => [
      { label: "加工过程", value: String(views.length), tone: "primary" },
      { label: "工艺步骤", value: String(shared.views.processSteps.length), tone: "normal" },
      { label: "已赋码", value: String(views.filter((item) => item.qrCount > 0).length), tone: "good" }
    ],
    searchText: (view) => [view.name, view.ppBatch, view.materialName, view.harvestBatch, view.manager].join(" "),
    columns: [
      { label: "加工过程", render: (view) => titleCell(view.name, `${view.ppBatch} · ${view.materialName}`) },
      { label: "来源采收", render: (view) => stackedCell(view.harvestName, view.harvestBatch) },
      { label: "投入 / 产出", render: (view) => metricMini(`${formatDecimal(view.inputCount)} / ${formatDecimal(view.outputCount)} kg`) },
      { label: "工艺步骤", render: (view) => metricMini(`${view.stepCount} 步`) },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderProcessDetail(view, shared),
    renderSecondaryDetail: (items) => renderProcessStepTimeline(items)
  },
  "herb-management": {
    kind: "entity",
    title: "药材档案",
    kicker: "MATERIAL FILES",
    subtitle: "把药材物料、规格、包装单位和使用场景单独建档，为加工和赋码提供标准底座。",
    actionLabel: "新增药材档案",
    searchPlaceholder: "搜索药材编号、名称、规格或类型",
    getViews: (shared) => shared.views.materials,
    getStats: (shared, views) => [
      { label: "药材档案", value: String(views.length), tone: "primary" },
      { label: "已进入加工", value: String(views.filter((item) => item.processCount > 0).length), tone: "good" },
      { label: "成品类", value: String(views.filter((item) => item.materialType.includes("成品")).length), tone: "normal" }
    ],
    searchText: (view) => [view.materialNo, view.name, view.specification, view.materialType].join(" "),
    columns: [
      { label: "药材档案", render: (view) => titleCell(view.name, `${view.materialNo} · ${view.specification}`) },
      { label: "包装规格", render: (view) => `${view.packageUnit} / ${view.unit}` },
      { label: "类型", render: (view) => view.materialType },
      { label: "加工调用", render: (view) => metricMini(`${view.processCount} 次`) },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderMaterialDetail(view, shared)
  },
  "trace-code-management": {
    kind: "entity",
    title: "赋码与查询",
    kicker: "TRACE CODE",
    subtitle: "把溯源码绑定到加工过程和仓库上，并直接预览消费者查询页，这样每个码都有完整来源。",
    actionLabel: "新建溯源码",
    searchPlaceholder: "搜索溯源名称、溯源码、药材或仓库",
    getViews: (shared) => shared.views.qrCodes,
    getStats: (shared, views) => [
      { label: "溯源码", value: String(views.length), tone: "primary" },
      { label: "可查询", value: String(views.filter((item) => item.publicUrl).length), tone: "good" },
      { label: "已绑定仓库", value: String(views.filter((item) => item.warehouseName !== "--").length), tone: "normal" }
    ],
    searchText: (view) => [view.name, view.traceCode, view.materialName, view.warehouseName, view.baseName].join(" "),
    columns: [
      { label: "溯源码", render: (view) => titleCell(view.name, `${view.traceCode} · ${view.materialName}`) },
      { label: "链路摘要", render: (view) => stackedCell(view.baseName, `${view.harvestBatch} → ${view.processBatch}`) },
      { label: "仓库", render: (view) => view.warehouseName },
      { label: "查询页", render: (view) => publicPreviewLink(view.publicUrl) },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderQrDetail(view, shared)
  },
  "warehouse-management": {
    kind: "entity",
    title: "仓库管理",
    kicker: "WAREHOUSE",
    subtitle: "仓库主档与使用情况分开看，先把仓库条件建好，再把赋码后的批次落进去。",
    actionLabel: "新增仓库",
    searchPlaceholder: "搜索仓库名称、负责人、地区或条件",
    getViews: (shared) => shared.views.warehouses,
    getStats: (shared, views) => [
      { label: "仓库主档", value: String(views.length), tone: "primary" },
      { label: "已绑定溯源码", value: String(views.filter((item) => item.qrCount > 0).length), tone: "good" },
      { label: "总容量", value: `${formatNumber(sumNumbers(views.map((item) => item.storeSize)))} m³`, tone: "normal" }
    ],
    searchText: (view) => [view.name, view.manager, view.addressLine, view.conditions, view.method].join(" "),
    columns: [
      { label: "仓库主档", render: (view) => titleCell(view.name, `${view.conditions} · ${view.method}`) },
      { label: "负责人", render: (view) => view.manager },
      { label: "面积 / 容量", render: (view) => metricMini(`${formatDecimal(view.storeArea)}㎡ / ${formatDecimal(view.storeSize)}m³`) },
      { label: "使用情况", render: (view) => metricMini(`${view.qrCount} 个码已绑定`) },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => deleteActionButton(view.id) }
    ],
    renderDetail: (view, shared) => renderWarehouseDetail(view, shared)
  }
};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }

  const pageId = document.body.dataset.page || "home";
  const params = new URLSearchParams(window.location.search);
  APP_STATE.query = "";
  APP_STATE.selectedId = params.get("selected") || "";
  APP_STATE.autoOpenHandled = false;
  APP_STATE.autoOpenKind = params.get("kind") || "primary";
  renderAndBind(root, pageId);
}

function renderAndBind(root, pageId) {
  const shared = buildSharedData(readWorkflowStore());

  if (pageId === "trace-query") {
    document.title = "中药材溯源码查询";
    root.innerHTML = renderTraceQueryPage(shared);
    bindTraceQuery(root, shared);
    return;
  }

  if (pageId === "home") {
    document.title = "灵草数智 - 中药材溯源平台";
    root.innerHTML = renderHomePage(shared);
    bindHome(root, shared);
    return;
  }

  const config = PAGE_CONFIGS[pageId];
  if (!config) {
    root.innerHTML = renderHomePage(shared);
    bindHome(root, shared);
    return;
  }

  document.title = `灵草数智 - ${config.title}`;
  const views = config.getViews(shared);
  const filtered = filterRecords(views, APP_STATE.query, config.searchText);
  const selected = pickSelectedRecord(filtered, views, APP_STATE.selectedId);
  root.innerHTML = config.kind === "compound"
    ? renderCompoundPage(pageId, config, shared, views, filtered, selected)
    : renderEntityPage(pageId, config, shared, views, filtered, selected);
  bindModule(root, pageId, config, shared, selected);
}

function renderMobileHeader(title) {
  return `
    <header class="mobile-header">
      <button class="hamburger" data-action="toggle-sidebar">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <strong>${escapeHtml(title)}</strong>
      <div style="width: 32px"></div>
    </header>
  `;
}

function renderHomePage(shared) {
  const modules = NAV_ITEMS.filter((item) => item.id !== "home");

  // Stats & Calculations
  const totalBases = shared.views.bases.length;
  const totalQr = shared.views.qrCodes.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyActive = shared.store.activities.filter((a) => {
    const d = new Date(a.timestamp || a.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const completeQr = shared.views.qrCodes.filter((qr) => qr.primaryProcessId && qr.warehouseId).length;
  const healthScore = shared.views.qrCodes.length > 0 ? Math.round((completeQr / shared.views.qrCodes.length) * 100) : 0;
  const recentActs = shared.store.activities.slice(0, 10);

  return `
    <div class="app-shell">
      ${renderMobileHeader("灵草数智 · 溯源指挥中心")}
      ${renderSidebar("home", shared)}
      <main class="main home-main">
        <header class="home-hero-v3">
          <span class="kicker">INTELLIGENCE COMMAND V3.0</span>
          <h1 class="font-display">灵草数智溯源指挥中心</h1>
          <p>基于数字孪生与全程追溯逻辑的智慧管理中枢。当前全链路数据健康度评级：<strong style="color:var(--primary); font-size:1.2em;">${healthScore}%</strong></p>
        </header>

        <div class="bento-grid">
          <!-- Premium Stats Row -->
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Production Bases</span>
              <div class="value">${totalBases}</div>
              <div class="footer">
                <span class="badge-v3">基地资产</span>
                <span class="text-faint">运行中</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Traceable Units</span>
              <div class="value">${totalQr}</div>
              <div class="footer">
                <span class="badge-v3">赋码批次</span>
                <span class="text-faint">已存证</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Monthly Activity</span>
              <div class="value">${monthlyActive}</div>
              <div class="footer">
                <span class="badge-v3">活跃交互</span>
                <span class="text-faint">本月新增</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">System Health</span>
              <div class="value">${healthScore}%</div>
              <div class="footer">
                <span class="badge-v3">完备度</span>
                <span class="text-faint">链条评分</span>
              </div>
            </div>
          </div>

          <!-- Feature Navigation -->
          <div class="bento-card span-8">
            <div style="margin-bottom: 24px;">
              <h3 class="font-display" style="font-size: 24px; color: var(--primary-deep); margin: 0;">溯源核心业务矩阵</h3>
              <p style="color: var(--text-soft); font-size: 14px; margin-top: 8px;">快速进入各环节管理模块，维护全链路数据资产。</p>
            </div>
            <div class="home-module-grid-v2">
              ${modules.map((item) => renderHomeModuleCard(item, shared)).join("")}
            </div>
          </div>

          <!-- Live Activity Stream -->
          <div class="bento-card span-4">
            <div style="margin-bottom: 24px;">
              <h3 class="font-display" style="font-size: 24px; color: var(--primary-deep); margin: 0;">实时存证脉络</h3>
            </div>
            <div class="timeline-v3">
              ${recentActs.length > 0 ? recentActs.map((a) => `
                <div class="timeline-v3-item">
                  <div class="timeline-v3-marker" style="box-shadow: 0 0 0 4px var(--primary-soft);"></div>
                  <div class="timeline-v3-content">
                    <h4 style="margin: 0; font-size: 15px; font-family: var(--font-body);">${escapeHtml(a.title)}</h4>
                    <p style="margin: 4px 0 8px; font-size: 13px; color: var(--text-soft); line-height: 1.4;">${escapeHtml(a.description)}</p>
                    <time style="font-size: 11px; color: var(--text-faint); font-weight: 600;">${formatActivityTime(a.timestamp || a.createdAt)}</time>
                  </div>
                </div>
              `).join("") : `<div class="empty-state-small">等待数据同步中...</div>`}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderEntityPage(pageId, config, shared, allViews, filteredViews, selected) {
  const stats = config.getStats(shared, allViews);
  return `
    <div class="app-shell">
      ${renderMobileHeader(config.title)}
      ${renderSidebar(pageId, shared)}
      <main class="main module-main">
        <section class="page-hero">
          <div class="page-copy">
            <h1>${escapeHtml(config.title)}</h1>
          </div>
          ${shouldShowStats(stats) ? `
            <div class="stat-grid">
              ${stats.map((stat) => renderStatCard(stat)).join("")}
            </div>
          ` : ""}
        </section>

        <section class="panel command-panel">
          <div class="search-wrap">
            <input type="search" value="${escapeAttribute(APP_STATE.query)}" placeholder="${escapeAttribute(config.searchPlaceholder)}" data-search-input>
          </div>
          <div class="command-actions">
            ${filteredViews.length ? `<span class="result-count">${filteredViews.length} 条</span>` : ""}
            <button class="button primary" type="button" data-open-dialog="primary">${escapeHtml(config.actionLabel)}</button>
          </div>
        </section>

        <section class="content-layout">
          <section class="panel table-panel">
            <div class="panel-headline">
              <h2>${escapeHtml(config.title)}台账</h2>
            </div>
            <div class="panel-body">
              ${filteredViews.length ? renderTable(config.columns, filteredViews, selected) : renderEmptyState(config.title, allViews.length)}
            </div>
          </section>

          <aside class="detail-rail">
            <section class="panel detail-panel">
              <div class="panel-headline">
                <h2>当前详情</h2>
              </div>
              <div class="panel-body">
                ${selected ? config.renderDetail(selected, shared) : `
                  <div class="empty-state">
                    <strong>当前没有可展示的记录</strong>
                    <span>新增第一条数据后，这里会展示它的链路关系、状态和下一步操作。</span>
                  </div>
                `}
              </div>
            </section>
          </aside>
        </section>

        ${renderPageDialogs(pageId, shared, selected)}
      </main>
    </div>
  `;
}

function renderCompoundPage(pageId, config, shared, allViews, filteredViews, selected) {
  const secondaryItems = config.getSecondaryViews(selected, shared);
  const stats = config.getStats(shared, allViews);
  return `
    <div class="app-shell">
      ${renderMobileHeader(config.title)}
      ${renderSidebar(pageId, shared)}
      <main class="main module-main">
        <section class="page-hero">
          <div class="page-copy">
            <h1>${escapeHtml(config.title)}</h1>
          </div>
          ${shouldShowStats(stats) ? `
            <div class="stat-grid">
              ${stats.map((stat) => renderStatCard(stat)).join("")}
            </div>
          ` : ""}
        </section>

        <section class="panel command-panel">
          <div class="search-wrap">
            <input type="search" value="${escapeAttribute(APP_STATE.query)}" placeholder="${escapeAttribute(config.searchPlaceholder)}" data-search-input>
          </div>
          <div class="command-actions">
            ${filteredViews.length ? `<span class="result-count">${filteredViews.length} 条</span>` : ""}
            <button class="button primary" type="button" data-open-dialog="primary">${escapeHtml(config.actionLabel)}</button>
          </div>
        </section>

        <section class="content-layout">
          <section class="panel table-panel">
            <div class="panel-headline">
              <h2>${pageId === "farming-trace" ? "种植过程主线" : "加工过程主线"}</h2>
            </div>
            <div class="panel-body">
              ${filteredViews.length ? renderTable(config.columns, filteredViews, selected) : renderEmptyState(config.title, allViews.length)}
            </div>
          </section>

          <aside class="detail-rail">
            <section class="panel detail-panel">
              <div class="panel-headline">
                <h2>当前详情</h2>
              </div>
              <div class="panel-body">
                ${selected ? config.renderDetail(selected, shared) : `
                  <div class="empty-state">
                    <strong>先选择一条主线记录</strong>
                    <span>选中种植或加工过程后，右侧会展开它的关系链、状态和推进动作。</span>
                  </div>
                `}
              </div>
            </section>
          </aside>
        </section>

        <section class="panel">
          <div class="panel-headline">
            <h2>${pageId === "farming-trace" ? "农事记录时间轴" : "工艺步骤时间轴"}</h2>
            <div class="panel-tools">
              ${secondaryItems.length ? `<span class="result-count">${secondaryItems.length} 条</span>` : ""}
              <button class="button secondary" type="button" data-open-dialog="secondary" ${selected ? "" : "disabled"}>
                ${escapeHtml(config.secondaryActionLabel)}
              </button>
            </div>
          </div>
          <div class="panel-body">
            ${selected
              ? (secondaryItems.length
                ? config.renderSecondaryDetail(secondaryItems, shared)
                : `
                  <div class="empty-state compact">
                    <strong>${pageId === "farming-trace" ? "还没有农事记录" : "还没有工艺步骤"}</strong>
                    <span>${pageId === "farming-trace" ? "可以继续在这条种植过程下补充农事操作。" : "可以继续补充这条加工过程的步骤和工艺细节。"}</span>
                  </div>
                `)
              : `
                <div class="empty-state compact">
                  <strong>还没有选中主线记录</strong>
                  <span>先从上方台账中点选一条种植或加工过程，再继续补充下方时间轴。</span>
                </div>
              `}
          </div>
        </section>

        ${renderPageDialogs(pageId, shared, selected)}
      </main>
    </div>
  `;
}

function renderTraceQueryPage(shared) {
  const code = new URLSearchParams(window.location.search).get("code") || "";
  const target = code ? shared.views.qrCodes.find((item) => item.traceCode === code) : null;
  const options = shared.views.qrCodes.slice(0, 12);

  return `
    <main class="trace-public">
      <section class="trace-public-shell">
        ${target ? renderTracePublicDetail(target, shared) : `
          <header class="public-v3-hero">
            <span class="badge">V3.0 PREVIEW</span>
            <h1>中药材溯源码查询</h1>
            <p>请输入或选择一条溯源码以查看全链路信息</p>
          </header>
          
          <section class="public-v3-section">
            <h2>${code ? "未找到对应溯源码" : "请选择预览记录"}</h2>
            <p style="color: var(--text-soft); margin-bottom: 24px;">${code ? "该溯源码在当前系统中不存在数据。" : "您可以从下方列表中选择一条已生成的赋码记录进行视觉预览。"}</p>
            
            <div class="public-code-grid">
              ${options.map((item) => `
                <a class="public-code-card" href="${escapeAttribute(`${TRACE_QUERY_PAGE}?code=${encodeURIComponent(item.traceCode)}`)}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${escapeHtml(item.traceCode)}</span>
                  <em>${escapeHtml(item.materialName)}</em>
                </a>
              `).join("")}
            </div>
          </section>
        `}
        <footer class="public-v3-footer">
          <p>© 2026 灵草数智 · 全链路质量追溯体系</p>
          <p>数据通过加密上链存储，确保真实不可篡改</p>
        </footer>
      </section>
    </main>
  `;
}

function renderHomePage(shared) {
  const modules = NAV_ITEMS.filter((item) => item.id !== "home");

  // Stats & Calculations
  const totalBases = shared.views.bases.length;
  const totalQr = shared.views.qrCodes.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyActive = shared.store.activities.filter((a) => {
    const d = new Date(a.timestamp || a.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const completeQr = shared.views.qrCodes.filter((qr) => qr.primaryProcessId && qr.warehouseId).length;
  const healthScore = shared.views.qrCodes.length > 0 ? Math.round((completeQr / shared.views.qrCodes.length) * 100) : 0;

  return `
    <div class="app-shell">
      ${renderMobileHeader("灵草数智 · 溯源指挥中心")}
      ${renderSidebar("home", shared)}
      <main class="main home-main animate-up">
        <header class="home-hero-v3">
          <span class="kicker">INTELLIGENCE COMMAND V3.0</span>
          <h1 class="font-display">灵草数智溯源指挥中心</h1>
          <p>基于数字孪生与全程追溯逻辑的智慧管理中枢。当前全链路数据健康度评级：<strong style="color:var(--primary); font-size:1.2em;">${healthScore}%</strong></p>
        </header>

        <div class="bento-grid">
          <!-- Premium Stats Row -->
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Production Bases</span>
              <div class="value">${totalBases}</div>
              <div class="footer">
                <span class="badge-v3">基地资产</span>
                <span class="text-faint">运行中</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Traceable Units</span>
              <div class="value">${totalQr}</div>
              <div class="footer">
                <span class="badge-v3">赋码批次</span>
                <span class="text-faint">已存证</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">Monthly Activity</span>
              <div class="value">${monthlyActive}</div>
              <div class="footer">
                <span class="badge-v3">活跃交互</span>
                <span class="text-faint">本月新增</span>
              </div>
            </div>
          </div>
          <div class="bento-card span-3">
            <div class="stat-widget-v3">
              <span class="kicker">System Health</span>
              <div class="value">${healthScore}%</div>
              <div class="footer">
                <span class="badge-v3">完备度</span>
                <span class="text-faint">链条评分</span>
              </div>
            </div>
          </div>

          <!-- Feature Navigation -->
          <div class="bento-card span-8">
            <div style="margin-bottom: 24px;">
              <h3 class="font-display">业务模块中心</h3>
              <p class="text-faint">管控全生命周期的每一个核心节点</p>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
              ${modules.map((item) => `
                <a href="${escapeAttribute(item.href)}" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; padding:20px; border-radius:var(--radius-inner); background:var(--bg-main); transition:var(--transition-smooth);" class="v3-nav-item">
                  <div style="font-size:32px; margin-bottom:12px;">${renderNavIcon(item.id)}</div>
                  <div style="font-weight:700; color:var(--text-main); font-size:14px;">${escapeHtml(item.title)}</div>
                  <div style="font-size:11px; color:var(--text-faint); margin-top:4px;">${navCountFor(item.id, shared)} 记录</div>
                </a>
              `).join("")}
            </div>
          </div>

          <!-- Activity/Logs -->
          <div class="bento-card span-4">
            <div style="margin-bottom: 24px;">
               <h3 class="font-display">最近存证动态</h3>
               <p class="text-faint">实时区块链交易存证记录</p>
            </div>
            <div class="v3-timeline" style="display:flex; flex-direction:column; gap:20px;">
              ${shared.store.activities.slice(0, 10).length === 0 
                ? `<div style="padding:40px; text-align:center; color:var(--text-faint);">暂无存证记录</div>` 
                : shared.store.activities.slice(0, 10).map(a => `
                  <div style="display:flex; gap:16px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0;"></div>
                    <div>
                      <div style="font-size:11px; font-weight:700; color:var(--accent); margin-bottom:4px;">${formatActivityTime(a.timestamp || a.createdAt)}</div>
                      <div style="font-size:13px; color:var(--text-main); line-height:1.4;">${escapeHtml(a.message)}</div>
                    </div>
                  </div>
                `).join("")}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
}
  const farmRecords = shared.views.farmRecords.filter((r) => r.plantId === view.plantId);
  
  return `
    <div class="cert-v3-root">
      <header class="cert-v3-hero">
        <div class="cert-v3-hero-bg"></div>
        <div class="cert-v3-hero-overlay"></div>
        <div class="cert-v3-hero-content">
          <span class="cert-v3-tag">灵草数智 · 数字认证</span>
          <h1 class="font-display">${escapeHtml(view.materialName)}</h1>
          <div class="trace-id">全链路溯源存证：${escapeHtml(view.traceCode)}</div>
          
          <div style="margin-top: 64px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 32px;">
            <div>
              <label style="display:block; font-size: 12px; opacity: 0.6; margin-bottom: 8px;">道地产地</label>
              <strong style="font-size: 18px;">${escapeHtml(view.baseName)}</strong>
            </div>
            <div>
              <label style="display:block; font-size: 12px; opacity: 0.6; margin-bottom: 8px;">品质等级</label>
              <strong style="font-size: 18px;">精品一级</strong>
            </div>
            <div>
              <label style="display:block; font-size: 12px; opacity: 0.6; margin-bottom: 8px;">认证标准</label>
              <strong style="font-size: 18px;">GAP 示范基地</strong>
            </div>
          </div>
        </div>
      </header>

      <main class="narrative-v3">
        <div class="narrative-v3-intro">
          <h2 class="font-display">生命周期全景叙事</h2>
          <p>从种源采集到终端交付，每一个关键节点均由灵草数智区块链存证系统真实记录。</p>
        </div>

        <div class="narrative-timeline">
          <!-- Step 1: Base -->
          <article class="narrative-step">
            <div class="narrative-marker"></div>
            <div class="narrative-content">
              <h3 class="font-display">溯源起点：${escapeHtml(view.baseName)}</h3>
              <p>种植基地位于 ${escapeHtml(view.baseAddress)}。这里拥有得天独厚的自然气候与矿物质土壤，是道地药材的生长的核心要素。</p>
              <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
                <div><label style="color:var(--text-faint);">基地代码</label><div style="font-weight:700;">${escapeHtml(view.baseCode)}</div></div>
                <div><label style="color:var(--text-faint);">环境评级</label><div style="font-weight:700; color:var(--primary);">优选 A级</div></div>
              </div>
            </div>
            <div class="narrative-img-wrap">
              <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=600" alt="基地全景">
            </div>
          </article>

          <!-- Step 2: Seed -->
          <article class="narrative-step">
            <div class="narrative-marker"></div>
            <div class="narrative-content">
              <h3 class="font-display">良种精选：${escapeHtml(view.seedBatch || "道地良种")}</h3>
              <p>选用非转基因优选种苗，通过种源备案系统确保遗传性状稳定，保障有效成分积累。</p>
              <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
                <div><label style="color:var(--text-faint);">种源批次</label><div style="font-weight:700;">${escapeHtml(view.seedBatch || "--")}</div></div>
                <div><label style="color:var(--text-faint);">供应主体</label><div style="font-weight:700;">${escapeHtml(view.supplierName || "--")}</div></div>
              </div>
            </div>
            <div class="narrative-img-wrap">
              <img src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=600" alt="良种精选">
            </div>
          </article>

          <!-- Step 3: Farming -->
          <article class="narrative-step">
            <div class="narrative-marker"></div>
            <div class="narrative-content">
              <h3 class="font-display">农事留痕：已记录 ${farmRecords.length} 次操作</h3>
              <p>生长期间，严格遵循生态种植法。记录覆盖了从播种、除草到有机施肥的完整过程，确保零化学农残。</p>
              <div style="margin-top: 24px; font-size: 13px;">
                <label style="color:var(--text-faint);">种植批次</label>
                <div style="font-weight:700;">${escapeHtml(view.plantBatch || "--")}</div>
              </div>
            </div>
            <div class="narrative-img-wrap">
              <img src="https://images.unsplash.com/photo-1592919016381-8073b984d03b?auto=format&fit=crop&q=80&w=600" alt="农事作业">
            </div>
          </article>

          <!-- Step 4: Process -->
          <article class="narrative-step">
            <div class="narrative-marker"></div>
            <div class="narrative-content">
              <h3 class="font-display">匠心工艺：${escapeHtml(view.ppType || "道地加工")}</h3>
              <p>遵循 GMP 生产规范进行初加工。通过低温烘干或传统炮制，最大限度保留药材天然活性成分。</p>
              <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
                <div><label style="color:var(--text-faint);">加工批次</label><div style="font-weight:700;">${escapeHtml(view.ppBatch || "--")}</div></div>
                <div><label style="color:var(--text-faint);">工艺标准</label><div style="font-weight:700;">传统炮制/低温</div></div>
              </div>
            </div>
            <div class="narrative-img-wrap">
              <img src="https://images.unsplash.com/photo-1563213126-a4273aed2016?auto=format&fit=crop&q=80&w=600" alt="匠心加工">
            </div>
          </article>
        </div>

        <!-- Digital Trust & Laboratory Certification -->
        <div style="margin-top: 80px; padding: 60px; background: var(--primary-soft); border-radius: 40px; text-align: center; border: 1px solid var(--primary-glow);">
          <div style="margin-bottom: 32px;">
             <span style="display:inline-block; border: 1px solid var(--primary); color: var(--primary); padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 800; letter-spacing: 2px;">CERTIFIED LABORATORY</span>
          </div>
          <h3 class="font-display" style="font-size: 28px; color: var(--primary-deep);">数字化信任背书与实验室认证</h3>
          <p style="color: var(--text-soft); max-width: 500px; margin: 16px auto 32px;">本药材已通过国家级中药材质量检测中心认证，并接入“灵草数智”溯源云平台，数据上链且不可篡改。</p>
          
          <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 40px;">
             <div style="text-align:center;"><div style="font-weight:900; color:var(--primary); font-size:24px;">99.9%</div><div style="font-size:12px; color:var(--text-faint);">数据完整度</div></div>
             <div style="text-align:center;"><div style="font-weight:900; color:var(--primary); font-size:24px;">Verified</div><div style="font-size:12px; color:var(--text-faint);">认证状态</div></div>
             <div style="text-align:center;"><div style="font-weight:900; color:var(--primary); font-size:24px;">CNAS</div><div style="font-size:12px; color:var(--text-faint);">国家实验室</div></div>
          </div>

          <div style="display: flex; justify-content: center; gap: 20px;">
             <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-size: 10px; font-weight: 900; color: var(--accent);">GAP</div>
             <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-size: 10px; font-weight: 900; color: var(--accent);">GMP</div>
             <div style="width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-size: 10px; font-weight: 900; color: var(--accent);">ISO</div>
          </div>
        </div>
      </main>

      <footer style="padding: 100px 24px; text-align: center; background: var(--bg-sidebar); color: #fff; opacity: 0.9;">
        <div class="font-display" style="font-size: 24px; margin-bottom: 24px;">灵草数智 · 追本溯源</div>
        <div style="font-size: 13px; opacity: 0.5; max-width: 600px; margin: 0 auto; line-height: 2;">
          版权所有 © 2026 灵草数智 (Lingcao Shuzhi)。本页面生成的溯源信息仅作为品质参考，具体以实物批次检测报告为准。
          存证哈希：${Math.random().toString(36).substring(2, 15).toUpperCase()}
        </div>
      </footer>
    </div>
  `;
}

function renderPublicInfoCard(title, lines) {
  return `
    <article class="public-info-card">
      <span>${escapeHtml(title)}</span>
      ${lines.map((line) => `<strong>${escapeHtml(line || "--")}</strong>`).join("")}
    </article>
  `;
}

function renderHomeModuleCard(item, shared) {
  const count = navCountFor(item.id, shared);
  return `
    <a class="module-card-compact" href="${escapeAttribute(item.href)}">
      <div class="module-icon-box">
        ${renderNavIcon(item.id)}
      </div>
      <div class="module-info-box">
        <strong class="module-name">${escapeHtml(item.title)}</strong>
        <span class="module-count">${count || 0} 条记录</span>
      </div>
    </a>
  `;
}

function calculateStorageUsage() {
  const used = JSON.stringify(localStorage).length;
  const limit = 5 * 1024 * 1024;
  const percentage = Math.min(100, Math.round((used / limit) * 100));
  let tone = "";
  if (percentage > 95) tone = "danger";
  else if (percentage > 80) tone = "warning";
  return { used, percentage, tone };
}

function exportData() {
  const store = localStorage.getItem(STORE_KEY);
  if (!store) {
    alert("当前没有任何数据可以导出。");
    return;
  }
  const blob = new Blob([store], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  a.href = url;
  a.download = `溯源数据备份_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.bases || !data.activities) {
        throw new Error("无效的数据格式");
      }
      if (confirm("导入将覆盖当前所有数据且不可撤销，是否继续？")) {
        localStorage.setItem(STORE_KEY, e.target.result);
        window.location.reload();
      }
    } catch (err) {
      alert("导入失败：请提供正确的溯源数据 JSON 文件。");
    }
  };
  reader.readAsText(file);
}

function renderSidebar(activeId, shared) {
  const storage = calculateStorageUsage();
  return `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <svg viewBox="0 0 64 64" fill="none" class="brand-mark-svg">
            <circle cx="32" cy="32" r="24" fill="#F4F5EF" stroke="#D4D9CF" stroke-width="2"></circle>
            <path d="M32 18V46" stroke="#1D6A53" stroke-width="3.5" stroke-linecap="round"></path>
            <path d="M32 25C25.5 20 19.5 21.5 16 28C22.5 29.5 27 29 32 25Z" fill="#d4a373"></path>
            <path d="M32 25C38.5 20 44.5 21.5 48 28C41.5 29.5 37 29 32 25Z" fill="#d4a373"></path>
            <path d="M32 36C26.5 31.5 22 33 19.5 38.5C24.5 40 28 39.5 32 36Z" fill="#bc8a5f"></path>
            <path d="M32 36C37.5 31.5 42 33 44.5 38.5C39.5 40 36 39.5 32 36Z" fill="#bc8a5f"></path>
            <path d="M23 46H41" stroke="#97AA9B" stroke-width="2.5" stroke-linecap="round"></path>
          </svg>
        </div>
        <div class="brand-copy">
          <strong>灵草数智溯源</strong>
        </div>
      </div>

      <nav class="nav-group">
        ${NAV_ITEMS.map((item) => renderSidebarItem(item, activeId, shared)).join("")}
      </nav>

      <div class="sidebar-footer">
        <div class="storage-monitor">
          <div class="storage-label">
            <span>存储空间占用</span>
            <span>${storage.percentage}%</span>
          </div>
          <div class="storage-bar-bg">
            <div class="storage-bar-fill ${storage.tone}" style="width: ${storage.percentage}%"></div>
          </div>
        </div>
        <div class="sidebar-actions">
          <button class="button-sidebar" data-action="export-data" title="导出数据备份">导出数据</button>
          <button class="button-sidebar" data-action="trigger-import" title="导入数据备份">导入数据</button>
          <input type="file" id="import-input" accept=".json" style="display:none">
        </div>
      </div>
    </aside>
  `;
}

function renderSidebarItem(item, activeId, shared) {
  const count = navCountFor(item.id, shared);
  return `
    <a class="nav-item ${item.id === activeId ? "is-active" : ""}" href="${escapeAttribute(item.href)}">
      <span class="nav-icon">${renderNavIcon(item.id)}</span>
      <span class="nav-copy"><strong>${escapeHtml(item.title)}</strong></span>
      ${count ? `<span class="nav-count">${count}</span>` : ""}
    </a>
  `;
}

function renderStatCard(stat) {
  return `
    <article class="stat-card ${stat.tone ? `is-${stat.tone}` : ""}">
      <span>${escapeHtml(stat.label)}</span>
      <strong>${escapeHtml(stat.value)}</strong>
    </article>
  `;
}

function shouldShowStats(stats) {
  return stats.some((stat) => {
    const raw = String(stat.value ?? "").trim();
    return raw !== ""
      && raw !== "0"
      && raw !== "0.0"
      && raw !== "0.00"
      && raw !== "0 条"
      && raw !== "--";
  });
}

function renderTable(columns, rows, selected) {
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-row-id="${escapeAttribute(row.id)}" class="${selected && selected.id === row.id ? "is-selected" : ""}">
              ${columns.map((column) => `<td data-label="${escapeAttribute(column.label)}">${column.render(row)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEmptyState(moduleTitle, totalCount) {
  if (totalCount > 0) {
    return `
      <div class="empty-state">
        <strong>没有找到符合条件的${escapeHtml(moduleTitle)}记录</strong>
        <span>可以调整搜索词，或继续新增一条记录。</span>
      </div>
    `;
  }

  return `
    <div class="empty-state-v2">
      <div class="empty-illustration">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h3>开始建立${escapeHtml(moduleTitle)}</h3>
      <p>当前还没有记录。建立第一条记录后，系统会自动关联上下游链路，形成完整的溯源闭环。</p>
      <div class="empty-actions">
        <button class="button primary" type="button" data-open-dialog="primary">立即新建</button>
        <a href="index.html" class="button-outline">查看引导</a>
      </div>
    </div>
  `;
}

function renderPageDialogs(pageId, shared, selected) {
  if (pageId === "base-trace") {
    return renderDialogShell("primary", "新建基地档案", renderBaseDialog(shared, readDraft(pageId)), true);
  }

  if (pageId === "farming-trace") {
    return [
      renderDialogShell("primary", "新建种植过程", renderStandardDialogLayout(pageId, "primary", shared, readDraft(pageId), selected)),
      renderDialogShell("secondary", "新增农事记录", renderStandardDialogLayout(pageId, "secondary", shared, readDraft(pageId), selected))
    ].join("");
  }

  if (pageId === "processing-trace") {
    return [
      renderDialogShell("primary", "新增加工过程", renderStandardDialogLayout(pageId, "primary", shared, readDraft(pageId), selected)),
      renderDialogShell("secondary", "新增工艺步骤", renderStandardDialogLayout(pageId, "secondary", shared, readDraft(pageId), selected))
    ].join("");
  }

  return renderDialogShell("primary", getDialogTitle(pageId), renderStandardDialogLayout(pageId, "primary", shared, readDraft(pageId), selected));
}

function renderDialogShell(kind, title, body, wide = false) {
  return `
    <dialog class="workspace-dialog ${wide ? "is-wide" : ""}" data-dialog="${escapeAttribute(kind)}">
      <div class="dialog-frame">
        <div class="dialog-head">
          <h3>${escapeHtml(title)}</h3>
          <button class="dialog-close" type="button" data-close-dialog="${escapeAttribute(kind)}" aria-label="关闭">✕</button>
        </div>
        <form class="dialog-form" data-form-kind="${escapeAttribute(kind)}">
          ${body}
          <div class="dialog-foot">
            <span>保存后会立即更新链路关系和首页待办。</span>
            <div class="dialog-actions">
              <button class="button ghost" type="button" data-close-dialog="${escapeAttribute(kind)}">取消</button>
              <button class="button primary" type="submit">保存</button>
            </div>
          </div>
        </form>
      </div>
    </dialog>
  `;
}

function renderBaseDialog(shared, draft) {
  return `
    <div class="dialog-map-layout">
      <div class="dialog-form-column">
        ${renderFormSection("基础档案", [
          fieldText("name", "基地名称", "例如：甘肃岷县党参基地", true, draft.name),
          fieldText("code", "基地编号", "例如：BASE-202604-001", true, draft.code || suggestCode("BASE", shared.store.bases.length + 1)),
          fieldText("manager", "负责人", "例如：赵青林", true, draft.manager),
          fieldText("herb", "主栽药材", "例如：党参", true, draft.herb),
          fieldSelect("baseType", "基地类型", BASE_TYPES, true, draft.baseType),
          fieldSelect("cooperationMode", "合作模式", COOPERATION_MODES, true, draft.cooperationMode),
          fieldNumber("areaMu", "基地面积（亩）", "例如：128", true, draft.areaMu)
        ])}
        ${renderFormSection("地理与资料", [
          fieldText("address", "地区", "例如：甘肃省定西市岷县", true, draft.address, { mapSearch: true }),
          fieldTextarea("detailAddress", "详细地址", "例如：岷阳镇西寨村五社", true, draft.detailAddress),
          fieldSelect("landCertStatus", "土地证明", DOCUMENT_STATUS_OPTIONS, true, draft.landCertStatus || "待补充"),
          fieldSelect("envReportStatus", "环境检测", DOCUMENT_STATUS_OPTIONS, true, draft.envReportStatus || "待补充"),
          fieldNumber("longitude", "经度", "例如：104.037624", false, draft.longitude, { mapLongitude: true }),
          fieldNumber("latitude", "纬度", "例如：34.438215", false, draft.latitude, { mapLatitude: true }),
          fieldNumber("altitude", "海拔（m）", "例如：2310", false, draft.altitude),
          fieldNumber("avgTemp", "年均温（℃）", "例如：13.5", false, draft.avgTemp),
          fieldNumber("soilPh", "土壤 pH", "例如：6.8", false, draft.soilPh),
          fieldNumber("soilEc", "土壤 EC", "例如：0.38", false, draft.soilEc),
          fieldTextarea("intro", "基地介绍", "一句话说明基地背景、管理标准或产区特点", false, draft.intro)
        ])}
        ${renderGenericPhotoSection("基地照片")}
      </div>
      <aside class="dialog-map-column">
        ${renderBaseMapEditor()}
      </aside>
    </div>
  `;
}

function getPhotoSectionTitle(pageId, kind) {
  if (pageId === "base-trace") return "基地照片";
  if (pageId === "farming-trace" && kind === "primary") return "现场照片";
  if (pageId === "harvest-trace") return "采收照片";
  if (pageId === "processing-trace" && kind === "primary") return "加工环节照片";
  return null;
}

function renderGenericPhotoSection(title) {
  return `
    <section class="form-section form-section-photo">
      <div class="form-section-head section-flex">
        <h4>${escapeHtml(title)}</h4>
        <div class="photo-section-actions">
          <span class="chip neutral" data-photo-count>0 张</span>
          <button class="button ghost button-inline" type="button" data-open-photo-window>增加照片</button>
        </div>
      </div>
      <input type="hidden" name="photos" value="[]" data-photo-store>
      <div class="photo-strip" data-photo-grid>
        <div class="photo-empty">暂未添加照片</div>
      </div>
      <div class="photo-window-shell" data-photo-window hidden>
        <div class="photo-window-backdrop" data-close-photo-window></div>
        <div class="photo-window-panel" role="dialog" aria-modal="true" aria-label="${escapeAttribute(title)}">
          <div class="photo-window-header">
            <h5>${escapeHtml(title)}</h5>
            <button class="dialog-close" type="button" data-close-photo-window aria-label="关闭">✕</button>
          </div>
          <div class="photo-window-body">
            <label class="button secondary photo-picker-button">
              选择照片
              <input type="file" accept="image/*" multiple hidden data-photo-input>
            </label>
            <div class="photo-window-grid" data-photo-dialog-grid>
              <div class="photo-empty">暂未添加照片</div>
            </div>
          </div>
          <div class="photo-window-foot">
            <button class="button primary" type="button" data-close-photo-window>完成</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStandardDialogLayout(pageId, kind, shared, draft, selected) {
  const sections = getDialogSections(pageId, kind, shared, draft, selected);
  const hiddenFields = getHiddenDialogFields(pageId, kind, selected);
  const photoTitle = getPhotoSectionTitle(pageId, kind);
  return `
    <div class="dialog-standard-layout">
      <div class="dialog-standard-main">
        ${hiddenFields}
        ${sections.map((section) => renderFormSection(section.title, section.fields)).join("")}
        ${photoTitle ? renderGenericPhotoSection(photoTitle) : ""}
      </div>
      <aside class="dialog-context" data-form-context>
        ${renderInitialFormContext(pageId, kind, shared, draft, selected)}
      </aside>
    </div>
  `;
}

function renderFormSection(title, fields) {
  return `
    <section class="form-section">
      <div class="form-section-head">
        <h4>${escapeHtml(title)}</h4>
      </div>
      <div class="form-grid">
        ${fields.map((item) => renderField(item)).join("")}
      </div>
    </section>
  `;
}

function renderField(field) {
  if (field.type === "hidden") {
    return `<input type="hidden" name="${escapeAttribute(field.name)}" value="${escapeAttribute(field.value || "")}">`;
  }

  const classes = ["field"];
  if (field.full) {
    classes.push("is-full");
  }
  if (field.required) {
    classes.push("required");
  }
  const requiredText = field.required ? "required" : "";
  const dataAttrs = [];
  if (field.mapSearch) {
    dataAttrs.push("data-map-address-input");
  }
  if (field.mapLongitude) {
    dataAttrs.push("data-map-longitude-input");
    dataAttrs.push('inputmode="decimal"');
  }
  if (field.mapLatitude) {
    dataAttrs.push("data-map-latitude-input");
    dataAttrs.push('inputmode="decimal"');
  }

  if (field.type === "textarea") {
    return `
      <label class="${classes.join(" ")}">
        <span class="field-label">${escapeHtml(field.label)}</span>
        <textarea class="form-control" name="${escapeAttribute(field.name)}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText}>${escapeHtml(field.value || "")}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    return `
      <label class="${classes.join(" ")}">
        <span class="field-label">${escapeHtml(field.label)}</span>
        <select class="form-control" name="${escapeAttribute(field.name)}" ${requiredText}>
          <option value="">请选择</option>
          ${field.options.map((option) => `
            <option value="${escapeAttribute(option.value)}" ${String(option.value) === String(field.value || "") ? "selected" : ""}>
              ${escapeHtml(option.meta ? `${option.label} · ${option.meta}` : option.label)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }

  if (field.mapSearch) {
    return `
      <label class="${classes.join(" ")}">
        <span class="field-label">${escapeHtml(field.label)}</span>
        <div class="field-inline">
          <input class="form-control" name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type || "text")}" value="${escapeAttribute(field.value || "")}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText} ${dataAttrs.join(" ")}>
          <button class="button ghost button-inline" type="button" data-open-map-search>地图定位</button>
        </div>
      </label>
    `;
  }

  return `
    <label class="${classes.join(" ")}">
      <span class="field-label">${escapeHtml(field.label)}</span>
      <input class="form-control" name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type || "text")}" value="${escapeAttribute(field.value || "")}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText} ${dataAttrs.join(" ")}>
    </label>
  `;
}

function getDialogTitle(pageId) {
  const titles = {
    "seed-trace": "新增种源批次",
    "harvest-trace": "新增采收批次",
    "herb-management": "新增药材档案",
    "trace-code-management": "新建溯源码",
    "warehouse-management": "新增仓库"
  };
  return titles[pageId] || "新增记录";
}

function getDialogSections(pageId, kind, shared, draft, selected) {
  if (pageId === "seed-trace") {
    return [
      {
        title: "种源与来源",
        fields: [
          fieldSelect("baseId", "关联基地", selectBaseOptions(shared), true, draft.baseId),
          fieldText("batchNo", "种源批次", "例如：SEED-202604-001", true, draft.batchNo || suggestCode("SEED", shared.store.seeds.length + 1)),
          fieldText("herb", "药材名称", "例如：党参", true, draft.herb),
          fieldSelect("breedMaterial", "繁殖材料", BREED_MATERIALS, true, draft.breedMaterial),
          fieldSelect("sourceType", "来源方式", SOURCE_TYPES, true, draft.sourceType),
          fieldText("brand", "种源品牌", "例如：岷州良种", false, draft.brand)
        ]
      },
      {
        title: "供应商与资质",
        fields: [
          fieldText("supplierName", "供应商名称", "例如：岷州种苗中心", true, draft.supplierName),
          fieldText("supplierPhone", "联系电话", "例如：13900000000", false, draft.supplierPhone),
          fieldDate("boughtDate", "种源日期", true, draft.boughtDate || isoDate()),
          fieldNumber("quantity", "到货数量（kg）", "例如：320", true, draft.quantity),
          fieldSelect("certificateStatus", "资质状态", DOCUMENT_STATUS_OPTIONS, true, draft.certificateStatus || "待补充"),
          fieldTextarea("note", "补充说明", "记录资质文件、批次说明或特殊要求", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "farming-trace" && kind === "primary") {
    return [
      {
        title: "种植主线",
        fields: [
          fieldSelect("seedId", "选择种源", selectSeedOptions(shared), true, draft.seedId),
          fieldSelect("baseId", "选择基地", selectBaseOptions(shared), true, draft.baseId),
          fieldText("name", "种植项目", "例如：党参春季种植", true, draft.name),
          fieldText("plantBatch", "种植批次", "例如：PLANT-202604-001", true, draft.plantBatch || suggestCode("PLANT", shared.store.plantProcesses.length + 1)),
          fieldNumber("plantArea", "种植面积（亩）", "例如：80", true, draft.plantArea),
          fieldSelect("plantMethod", "种植方式", PLANT_METHODS, true, draft.plantMethod),
          fieldSelect("plantType", "类型", PLANT_TYPES, true, draft.plantType),
          fieldDate("startDate", "开始时间", true, draft.startDate || isoDate())
        ]
      },
      {
        title: "管理信息",
        fields: [
          fieldText("previewMat", "前茬作物", "例如：蚕豆", false, draft.previewMat),
          fieldText("worker", "负责人", "例如：陈素梅", true, draft.worker),
          fieldNumber("estimatedOutput", "预估产量", "例如：1600", false, draft.estimatedOutput),
          fieldText("unit", "单位", "例如：kg", false, draft.unit || "kg"),
          fieldTextarea("managementStandard", "管理制度", "例如：按照 GAP 种植要求执行", false, draft.managementStandard),
          fieldText("plantExperience", "从业年限", "例如：8 年", false, draft.plantExperience)
        ]
      }
    ];
  }

  if (pageId === "farming-trace" && kind === "secondary") {
    return [
      {
        title: "农事记录",
        fields: [
          fieldSelect("workName", "农事操作", FARM_WORK_NAMES, true, draft.workName),
          fieldNumber("orderSort", "顺序号", "例如：1", true, draft.orderSort || nextSecondaryOrder(shared, selected && selected.id, "farm")),
          fieldText("operator", "实施人", "例如：巡田组", true, draft.operator),
          fieldDate("startDate", "开始时间", true, draft.startDate || isoDate()),
          fieldDate("endDate", "结束时间", true, draft.endDate || isoDate()),
          fieldTextarea("operateDetail", "农事详情", "记录施肥、灌溉、病虫巡查等细节", true, draft.operateDetail),
          fieldTextarea("note", "备注", "可补充现场照片说明或异常情况", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "harvest-trace") {
    return [
      {
        title: "采收批次",
        fields: [
          fieldSelect("plantId", "种植过程", selectPlantOptions(shared), true, draft.plantId),
          fieldText("name", "采收名称", "例如：党参头茬采收", true, draft.name),
          fieldSelect("harvestType", "采收类型", HARVEST_TYPES, true, draft.harvestType),
          fieldText("harvestBatch", "采收批次", "例如：HV-202604-001", true, draft.harvestBatch || suggestCode("HV", shared.store.harvests.length + 1)),
          fieldText("harvestMedicinal", "采收药材", "例如：党参", true, draft.harvestMedicinal),
          fieldText("harvestPart", "采收部位", "例如：根部", true, draft.harvestPart),
          fieldNumber("growYears", "生长年限", "例如：2", false, draft.growYears),
          fieldSelect("harvestMethod", "采收方式", HARVEST_METHODS, true, draft.harvestMethod)
        ]
      },
      {
        title: "验收信息",
        fields: [
          fieldDate("startDate", "开始时间", true, draft.startDate || isoDate()),
          fieldDate("endDate", "结束时间", true, draft.endDate || isoDate()),
          fieldNumber("harvestWeight", "采收重量（kg）", "例如：860", true, draft.harvestWeight),
          fieldText("harvestManager", "采收负责人", "例如：王晓峰", true, draft.harvestManager),
          fieldTextarea("note", "备注", "记录现场情况、验收说明或图片备注", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "processing-trace" && kind === "primary") {
    return [
      {
        title: "来源与基础",
        fields: [
          fieldSelect("harvestId", "采收记录", selectHarvestOptions(shared), true, draft.harvestId),
          fieldSelect("materialId", "药材档案", selectMaterialOptions(shared), true, draft.materialId),
          fieldText("name", "加工名称", "例如：党参切制工艺", true, draft.name),
          fieldText("ppBatch", "加工批次", "例如：PP-202604-001", true, draft.ppBatch || suggestCode("PP", shared.store.primaryProcesses.length + 1)),
          fieldText("manager", "负责人", "例如：刘绍林", true, draft.manager),
          fieldSelect("ppType", "加工方式", PROCESS_TYPES, true, draft.ppType),
          fieldNumber("inputCount", "投入数量（kg）", "例如：860", true, draft.inputCount),
          fieldNumber("outputCount", "产出数量（kg）", "例如：310", true, draft.outputCount)
        ]
      },
      {
        title: "工艺信息",
        fields: [
          fieldDate("startDate", "开始时间", true, draft.startDate || isoDate()),
          fieldDate("endDate", "结束时间", true, draft.endDate || isoDate()),
          fieldTextarea("processAddress", "加工地址", "例如：净选车间 A / 切制一车间", true, draft.processAddress),
          fieldTextarea("note", "备注", "记录工艺参数、质检结论或异常项", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "processing-trace" && kind === "secondary") {
    return [
      {
        title: "工艺步骤",
        fields: [
          fieldNumber("orderSort", "顺序号", "例如：1", true, draft.orderSort || nextSecondaryOrder(shared, selected && selected.id, "step")),
          fieldText("name", "工艺名称", "例如：净选", true, draft.name),
          fieldText("processType", "加工方式", "例如：人工拣选", true, draft.processType),
          fieldDate("startDate", "开始时间", true, draft.startDate || isoDate()),
          fieldDate("endDate", "结束时间", true, draft.endDate || isoDate()),
          fieldTextarea("stepDetails", "工艺详情", "记录关键动作、参数和质控点", true, draft.stepDetails),
          fieldTextarea("note", "备注", "可补充图片说明或异常情况", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "herb-management") {
    return [
      {
        title: "药材档案",
        fields: [
          fieldText("materialNo", "药材编号", "例如：MAT-202604-001", true, draft.materialNo || suggestCode("MAT", shared.store.materials.length + 1)),
          fieldText("name", "药材名称", "例如：党参切片", true, draft.name),
          fieldText("specification", "药材规格", "例如：统片", true, draft.specification),
          fieldText("packageUnit", "包装规格", "例如：25kg / 袋", true, draft.packageUnit),
          fieldText("unit", "单位", "例如：kg", true, draft.unit || "kg"),
          fieldSelect("materialType", "药材类型", MATERIAL_TYPES, true, draft.materialType),
          fieldDate("createdTime", "创建时间", true, draft.createdTime || isoDate()),
          fieldTextarea("note", "备注", "记录标准、用途或关联说明", false, draft.note)
        ]
      }
    ];
  }

  if (pageId === "trace-code-management") {
    return [
      {
        title: "赋码绑定",
        fields: [
          fieldSelect("primaryProcessId", "加工过程", selectProcessOptions(shared), true, draft.primaryProcessId),
          fieldSelect("warehouseId", "仓库信息", selectWarehouseOptions(shared), true, draft.warehouseId),
          fieldText("name", "溯源名称", "例如：党参切制成品码", true, draft.name),
          fieldText("traceCode", "溯源码", "自动生成", true, draft.traceCode || suggestTraceCode(shared.store.qrCodes.length + 1))
        ]
      }
    ];
  }

  if (pageId === "warehouse-management") {
    return [
      {
        title: "仓库主档",
        fields: [
          fieldText("name", "仓库名称", "例如：岷县一号仓", true, draft.name),
          fieldText("manager", "负责人", "例如：周仁海", true, draft.manager),
          fieldSelect("conditions", "存储条件", STORAGE_CONDITIONS, true, draft.conditions),
          fieldSelect("method", "存储方式", STORAGE_METHODS, true, draft.method),
          fieldText("address", "地区", "例如：甘肃省定西市岷县", true, draft.address),
          fieldTextarea("detailAddress", "详细地址", "例如：梅川镇园区北仓 2 号", true, draft.detailAddress),
          fieldNumber("storeArea", "仓库面积（㎡）", "例如：320", true, draft.storeArea),
          fieldNumber("storeSize", "仓库容量（m³）", "例如：680", true, draft.storeSize),
          fieldTextarea("note", "备注", "记录设备、监控方式或巡检要求", false, draft.note)
        ]
      }
    ];
  }

  return [];
}

function getHiddenDialogFields(pageId, kind, selected) {
  if (pageId === "farming-trace" && kind === "secondary") {
    return `<input type="hidden" name="plantId" value="${escapeAttribute(selected ? selected.id : "")}">`;
  }
  if (pageId === "processing-trace" && kind === "secondary") {
    return `<input type="hidden" name="primaryProcessId" value="${escapeAttribute(selected ? selected.id : "")}">`;
  }
  return "";
}

function renderInitialFormContext(pageId, kind, shared, draft, selected) {
  const draftValues = draft || {};
  if (pageId === "farming-trace" && kind === "secondary" && selected) {
    return renderDialogContextCard("当前种植过程", [
      selected.name,
      `${selected.baseName} · ${selected.plantBatch}`,
      `${selected.farmCount} 条农事记录`
    ]);
  }
  if (pageId === "processing-trace" && kind === "secondary" && selected) {
    return renderDialogContextCard("当前加工过程", [
      selected.name,
      `${selected.materialName} · ${selected.ppBatch}`,
      `${selected.stepCount} 个工艺步骤`
    ]);
  }
  if (pageId === "seed-trace" && draftValues.baseId) {
    const base = shared.viewMaps.baseById.get(draftValues.baseId);
    return base ? renderDialogContextCard("草稿来源", [base.name, base.code, base.herb]) : renderDialogContextFallback();
  }
  return renderDialogContextFallback();
}

function renderDialogContextCard(title, lines) {
  return `
    <div class="context-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="context-lines">
        ${lines.map((line) => `<strong>${escapeHtml(line || "--")}</strong>`).join("")}
      </div>
    </div>
  `;
}

function renderDialogContextFallback() {
  return `
    <div class="context-card">
      <h4>等待选择上游记录</h4>
      <div class="context-lines">
        <strong>先选择基地、种源、采收或加工记录</strong>
        <strong>系统会在右侧实时显示链路摘要</strong>
      </div>
    </div>
  `;
}

function bindShell(root) {
  const sidebar = root.querySelector(".sidebar");
  const hamburger = root.querySelector('[data-action="toggle-sidebar"]');
  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("is-open");
    });
    // Close sidebar when clicking outside on mobile
    root.addEventListener("click", (e) => {
      if (sidebar.classList.contains("is-open") && !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove("is-open");
      }
    });
  }

  const exportBtn = root.querySelector('[data-action="export-data"]');
  if (exportBtn) {
    exportBtn.addEventListener("click", exportData);
  }

  const triggerImportBtn = root.querySelector('[data-action="trigger-import"]');
  const importInput = root.querySelector("#import-input");
  if (triggerImportBtn && importInput) {
    triggerImportBtn.addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", (e) => importData(e.target.files[0]));
  }
}

function bindHome(root, shared) {
  bindShell(root);
  root.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-clear-workflow]");
    if (clearButton) {
      if (window.confirm("确定清空当前浏览器里的整套流程数据吗？")) {
        clearWorkflowStore();
        window.location.reload();
      }
      return;
    }

    const continueButton = event.target.closest("[data-continue-workflow]");
    if (continueButton) {
      handleContinueWorkflow(continueButton);
    }
  });
}

function bindTraceQuery(root, shared) {
  bindBaseTracePreviewMaps(root);
}

function bindModule(root, pageId, config, shared, selected) {
  bindShell(root);
  const searchInput = root.querySelector("[data-search-input]");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      APP_STATE.query = event.target.value.trim();
      renderAndBind(root, pageId);
    });
  }

  root.addEventListener("click", async (event) => {
    const continueButton = event.target.closest("[data-continue-workflow]");
    if (continueButton) {
      handleContinueWorkflow(continueButton);
      return;
    }

    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) {
      const kind = closeButton.dataset.closeDialog;
      const dialog = root.querySelector(`[data-dialog="${kind}"]`);
      if (dialog) {
        dialog.close();
      }
      return;
    }

    const openButton = event.target.closest("[data-open-dialog]");
    if (openButton) {
      const kind = openButton.dataset.openDialog;
      if (kind === "secondary" && !selected) {
        return;
      }
      openDialog(root, pageId, kind);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-record]");
    if (deleteButton) {
      event.stopPropagation();
      const recordId = deleteButton.dataset.deleteRecord;
      handleDeleteRecord(pageId, recordId, shared, root);
      return;
    }

    const deleteSubButton = event.target.closest("[data-delete-subrecord]");
    if (deleteSubButton) {
      event.stopPropagation();
      const recordId = deleteSubButton.dataset.deleteSubrecord;
      handleDeleteSubrecord(pageId, recordId, shared, root, selected);
      return;
    }

    const clearButton = event.target.closest("[data-clear-workflow]");
    if (clearButton) {
      if (window.confirm("确定清空当前浏览器里的整套流程数据吗？")) {
        clearWorkflowStore();
        window.location.reload();
      }
      return;
    }

    const row = event.target.closest("tr[data-row-id]");
    if (row && !event.target.closest("button,a")) {
      APP_STATE.selectedId = row.dataset.rowId || "";
      renderAndBind(root, pageId);
    }
  });

  const dialogs = root.querySelectorAll("dialog[data-dialog]");
  dialogs.forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const frame = dialog.querySelector(".dialog-frame");
      if (!frame || frame.contains(event.target)) {
        return;
      }
      dialog.close();
    });
  });

  const forms = root.querySelectorAll("form[data-form-kind]");
  forms.forEach((form) => {
    bindFormIntelligence(form, pageId, shared, selected);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) {
        return;
      }
      if (form._photoController) {
        await form._photoController.waitUntilReady();
      }
      const kind = form.dataset.formKind || "primary";
      const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
      createRecordFromForm(pageId, kind, values, shared, selected);
      clearDraft(pageId);
      APP_STATE.query = "";
      APP_STATE.selectedId = resolveSelectedIdAfterCreate(pageId, kind, values);
      renderAndBind(root, pageId);
    });
  });

  if (pageId === "base-trace") {
    const dialog = root.querySelector('[data-dialog="primary"]');
    bindBaseTraceMap(root, dialog);
    bindPhotoUpload(root, dialog);
    bindBaseTracePreviewMaps(root);
  } else {
    // Check if other pages need photo upload
    const primaryTitle = getPhotoSectionTitle(pageId, "primary");
    if (primaryTitle) {
      const dialog = root.querySelector('[data-dialog="primary"]');
      bindPhotoUpload(root, dialog, "primary");
    }
    const secondaryTitle = getPhotoSectionTitle(pageId, "secondary");
    if (secondaryTitle) {
      const dialog = root.querySelector('[data-dialog="secondary"]');
      bindPhotoUpload(root, dialog, "secondary");
    }
  }

  const shouldAutoOpen = new URLSearchParams(window.location.search).get("action") === "create";
  if (shouldAutoOpen && !APP_STATE.autoOpenHandled) {
    APP_STATE.autoOpenHandled = true;
    window.history.replaceState({}, "", window.location.pathname);
    openDialog(root, pageId, APP_STATE.autoOpenKind || "primary");
  }
}

function openDialog(root, pageId, kind) {
  const dialog = root.querySelector(`[data-dialog="${kind}"]`);
  if (!dialog) {
    return;
  }
  dialog.showModal();
  const form = dialog.querySelector("form");
  if (form) {
    updateFormContext(form, pageId, buildSharedData(readWorkflowStore()), kind);
  }
  if (pageId === "base-trace") {
    window.requestAnimationFrame(() => activateBaseTraceMap(root));
  }
}

function bindFormIntelligence(form, pageId, shared, selected) {
  form.addEventListener("input", () => updateFormContext(form, pageId, buildSharedData(readWorkflowStore()), form.dataset.formKind || "primary"));
  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    autoFillLinkedFields(form, pageId, target.name, buildSharedData(readWorkflowStore()), selected);
    updateFormContext(form, pageId, buildSharedData(readWorkflowStore()), form.dataset.formKind || "primary");
  });

  updateFormContext(form, pageId, shared, form.dataset.formKind || "primary");
}

function autoFillLinkedFields(form, pageId, fieldName, shared, selected) {
  const get = (name) => form.querySelector(`[name="${name}"]`);
  if (pageId === "seed-trace" && fieldName === "baseId") {
    const base = shared.maps.baseById.get(getValue(get("baseId")));
    if (base) {
      fillIfEmpty(get("herb"), base.herb);
    }
    return;
  }

  if (pageId === "farming-trace" && fieldName === "seedId") {
    const seed = shared.maps.seedById.get(getValue(get("seedId")));
    if (seed) {
      fillIfEmpty(get("baseId"), seed.baseId);
      fillIfEmpty(get("name"), `${seed.herb}种植项目`);
    }
    return;
  }

  if (pageId === "harvest-trace" && fieldName === "plantId") {
    const plant = shared.maps.plantById.get(getValue(get("plantId")));
    if (plant) {
      fillIfEmpty(get("name"), `${plant.herb}采收`);
      fillIfEmpty(get("harvestMedicinal"), plant.herb);
    }
    return;
  }

  if (pageId === "processing-trace" && fieldName === "harvestId") {
    const harvest = shared.maps.harvestById.get(getValue(get("harvestId")));
    if (harvest) {
      fillIfEmpty(get("name"), `${harvest.herb}加工`);
      fillIfEmpty(get("processAddress"), harvest.baseName || "");
      fillIfEmpty(get("inputCount"), harvest.harvestWeight);
    }
    return;
  }

  if (pageId === "trace-code-management" && fieldName === "primaryProcessId") {
    const process = shared.maps.primaryProcessById.get(getValue(get("primaryProcessId")));
    if (process) {
      fillIfEmpty(get("name"), `${process.materialName || process.name}溯源码`);
    }
  }
}

function updateFormContext(form, pageId, shared, kind) {
  const context = form.querySelector("[data-form-context]");
  if (!context) {
    return;
  }
  const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
  context.innerHTML = renderDynamicFormContext(pageId, kind, values, shared);
}

function renderDynamicFormContext(pageId, kind, values, shared) {
  if (pageId === "seed-trace") {
    const base = shared.viewMaps.baseById.get(values.baseId);
    return base
      ? renderDialogContextCard("关联基地", [base.name, base.code, `${base.herb} · ${base.address}`])
      : renderDialogContextFallback();
  }

  if (pageId === "farming-trace" && kind === "primary") {
    const seed = shared.viewMaps.seedById.get(values.seedId);
    const base = shared.viewMaps.baseById.get(values.baseId || (seed && seed.baseId));
    return (seed || base)
      ? renderDialogContextCard("上游链路", [
        base ? `${base.name} · ${base.code}` : "未选择基地",
        seed ? `${seed.batchNo} · ${seed.supplierName}` : "未选择种源",
        "保存后可继续补充农事记录"
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "farming-trace" && kind === "secondary") {
    const plant = shared.viewMaps.plantById.get(values.plantId);
    return plant
      ? renderDialogContextCard("农事挂载对象", [
        plant.name,
        `${plant.baseName} · ${plant.plantBatch}`,
        `${plant.farmCount} 条现有记录`
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "harvest-trace") {
    const plant = shared.viewMaps.plantById.get(values.plantId);
    return plant
      ? renderDialogContextCard("采收来源", [
        plant.name,
        `${plant.baseName} · ${plant.seedBatch}`,
        `${plant.harvestCount} 条采收已关联`
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "processing-trace" && kind === "primary") {
    const harvest = shared.viewMaps.harvestById.get(values.harvestId);
    const material = shared.viewMaps.materialById.get(values.materialId);
    return (harvest || material)
      ? renderDialogContextCard("加工输入摘要", [
        harvest ? `${harvest.name} · ${harvest.harvestBatch}` : "未选择采收",
        material ? `${material.name} · ${material.materialNo}` : "未选择药材",
        "保存后可以继续拆分工艺步骤"
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "processing-trace" && kind === "secondary") {
    const process = shared.viewMaps.primaryProcessById.get(values.primaryProcessId);
    return process
      ? renderDialogContextCard("工艺挂载对象", [
        process.name,
        `${process.ppBatch} · ${process.materialName}`,
        `${process.stepCount} 个现有步骤`
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "trace-code-management") {
    const process = shared.viewMaps.primaryProcessById.get(values.primaryProcessId);
    const warehouse = shared.viewMaps.warehouseById.get(values.warehouseId);
    const previewUrl = values.traceCode ? buildTraceQueryUrl(values.traceCode) : "";
    return (process || warehouse)
      ? renderDialogContextCard("赋码预览", [
        process ? `${process.name} · ${process.ppBatch}` : "未选择加工过程",
        warehouse ? `${warehouse.name} · ${warehouse.conditions}` : "未选择仓库",
        previewUrl ? truncateText(previewUrl, 44) : "保存后生成查询页"
      ])
      : renderDialogContextFallback();
  }

  if (pageId === "warehouse-management") {
    return renderDialogContextCard("仓库主档提示", [
      "仓库主档先行建立",
      "后续赋码时可直接绑定仓库",
      "建议完整填写面积、容量和条件"
    ]);
  }

  if (pageId === "base-trace") {
    const coordinateText = values.longitude && values.latitude ? `${values.longitude}, ${values.latitude}` : "未设置坐标";
    return renderDialogContextCard("基地建档提示", [
      values.name || "等待填写基地名称",
      coordinateText,
      values.landCertStatus || "待补土地证明"
    ]);
  }

  if (pageId === "herb-management") {
    return renderDialogContextCard("药材档案提示", [
      values.name || "等待填写药材名称",
      values.specification || "等待填写规格",
      values.materialType || "等待选择类型"
    ]);
  }

  return renderDialogContextFallback();
}

function createRecordFromForm(pageId, kind, values, shared, selected) {
  updateWorkflowStore((store) => {
    if (pageId === "base-trace") {
      const base = {
        id: entityId("BASE", store.bases.length + 1),
        code: values.code || suggestCode("BASE", store.bases.length + 1),
        name: values.name,
        manager: values.manager,
        herb: values.herb,
        baseType: values.baseType,
        cooperationMode: values.cooperationMode,
        areaMu: toNumber(values.areaMu),
        address: values.address,
        detailAddress: values.detailAddress,
        longitude: toNumber(values.longitude),
        latitude: toNumber(values.latitude),
        altitude: toNumber(values.altitude),
        avgTemp: toNumber(values.avgTemp),
        soilPh: toNumber(values.soilPh),
        soilEc: toNumber(values.soilEc),
        landCertStatus: values.landCertStatus,
        envReportStatus: values.envReportStatus,
        intro: values.intro,
        photos: normalizeTracePhotoList(values.photos),
        createdAt: isoDate()
      };
      store.bases.unshift(base);
      addActivity(store, "建立基地档案", `${base.name} 已进入主档`, "基地资料、坐标和后续链路从这里起步");
      return;
    }

    if (pageId === "seed-trace") {
      const base = shared.maps.baseById.get(values.baseId);
      const record = {
        id: entityId("SEED", store.seeds.length + 1),
        baseId: values.baseId,
        batchNo: values.batchNo || suggestCode("SEED", store.seeds.length + 1),
        herb: values.herb || (base ? base.herb : ""),
        breedMaterial: values.breedMaterial,
        sourceType: values.sourceType,
        brand: values.brand,
        supplierName: values.supplierName,
        supplierPhone: values.supplierPhone,
        boughtDate: values.boughtDate || isoDate(),
        quantity: toNumber(values.quantity),
        certificateStatus: values.certificateStatus,
        note: values.note,
        createdAt: isoDate()
      };
      store.seeds.unshift(record);
      addActivity(store, "备案种源批次", `${record.batchNo} 已绑定基地`, `${record.supplierName} · ${record.herb}`);
      return;
    }

    if (pageId === "farming-trace" && kind === "primary") {
      const seed = shared.maps.seedById.get(values.seedId);
      const base = shared.maps.baseById.get(values.baseId);
      const record = {
        id: entityId("PLANT", store.plantProcesses.length + 1),
        seedId: values.seedId,
        baseId: values.baseId || (seed ? seed.baseId : ""),
        name: values.name,
        plantBatch: values.plantBatch || suggestCode("PLANT", store.plantProcesses.length + 1),
        herb: seed ? seed.herb : (base ? base.herb : ""),
        plantArea: toNumber(values.plantArea),
        plantMethod: values.plantMethod,
        plantType: values.plantType,
        startDate: values.startDate || isoDate(),
        previewMat: values.previewMat,
        worker: values.worker,
        estimatedOutput: toNumber(values.estimatedOutput),
        unit: values.unit || "kg",
        managementStandard: values.managementStandard,
        plantExperience: values.plantExperience,
        photos: normalizeTracePhotoList(values.photos),
        createdAt: isoDate()
      };
      store.plantProcesses.unshift(record);
      addActivity(store, "建立种植过程", `${record.name} 已接入种植主线`, `${record.plantBatch} · ${record.worker}`);
      return;
    }

    if (pageId === "farming-trace" && kind === "secondary") {
      const plant = shared.maps.plantById.get(values.plantId);
      const record = {
        id: entityId("FARM", store.farmRecords.length + 1),
        plantId: values.plantId,
        workName: values.workName,
        orderSort: toNumber(values.orderSort),
        operator: values.operator,
        startDate: values.startDate || isoDate(),
        endDate: values.endDate || values.startDate || isoDate(),
        operateDetail: values.operateDetail,
        note: values.note,
        createdAt: isoDate()
      };
      store.farmRecords.unshift(record);
      addActivity(store, "补充农事记录", `${plant ? plant.name : "种植过程"} 新增农事`, `${record.workName} · ${record.operator}`);
      return;
    }

    if (pageId === "harvest-trace") {
      const plant = shared.maps.plantById.get(values.plantId);
      const record = {
        id: entityId("HARVEST", store.harvests.length + 1),
        plantId: values.plantId,
        name: values.name,
        harvestType: values.harvestType,
        harvestBatch: values.harvestBatch || suggestCode("HV", store.harvests.length + 1),
        herb: values.harvestMedicinal || (plant ? plant.herb : ""),
        harvestPart: values.harvestPart,
        growYears: toNumber(values.growYears),
        harvestMethod: values.harvestMethod,
        startDate: values.startDate || isoDate(),
        endDate: values.endDate || values.startDate || isoDate(),
        harvestWeight: toNumber(values.harvestWeight),
        harvestManager: values.harvestManager,
        photos: normalizeTracePhotoList(values.photos),
        note: values.note,
        createdAt: isoDate()
      };
      store.harvests.unshift(record);
      addActivity(store, "建立采收批次", `${record.name} 已进入采收台账`, `${record.harvestBatch} · ${record.harvestManager}`);
      return;
    }

    if (pageId === "processing-trace" && kind === "primary") {
      const harvest = shared.maps.harvestById.get(values.harvestId);
      const material = shared.maps.materialById.get(values.materialId);
      const record = {
        id: entityId("PROCESS", store.primaryProcesses.length + 1),
        harvestId: values.harvestId,
        materialId: values.materialId,
        name: values.name,
        ppBatch: values.ppBatch || suggestCode("PP", store.primaryProcesses.length + 1),
        manager: values.manager,
        ppType: values.ppType,
        inputCount: toNumber(values.inputCount),
        outputCount: toNumber(values.outputCount),
        startDate: values.startDate || isoDate(),
        endDate: values.endDate || values.startDate || isoDate(),
        processAddress: values.processAddress,
        photos: normalizeTracePhotoList(values.photos),
        note: values.note,
        createdAt: isoDate(),
        materialName: material ? material.name : "",
        harvestName: harvest ? harvest.name : ""
      };
      store.primaryProcesses.unshift(record);
      addActivity(store, "建立加工过程", `${record.name} 已进入加工主线`, `${record.ppBatch} · ${record.manager}`);
      return;
    }

    if (pageId === "processing-trace" && kind === "secondary") {
      const process = shared.maps.primaryProcessById.get(values.primaryProcessId);
      const record = {
        id: entityId("STEP", store.processSteps.length + 1),
        primaryProcessId: values.primaryProcessId,
        orderSort: toNumber(values.orderSort),
        name: values.name,
        processType: values.processType,
        startDate: values.startDate || isoDate(),
        endDate: values.endDate || values.startDate || isoDate(),
        stepDetails: values.stepDetails,
        note: values.note,
        createdAt: isoDate()
      };
      store.processSteps.unshift(record);
      addActivity(store, "补充工艺步骤", `${process ? process.name : "加工过程"} 新增工艺`, `${record.name} · 第 ${record.orderSort} 步`);
      return;
    }

    if (pageId === "herb-management") {
      const record = {
        id: entityId("MAT", store.materials.length + 1),
        materialNo: values.materialNo || suggestCode("MAT", store.materials.length + 1),
        name: values.name,
        specification: values.specification,
        packageUnit: values.packageUnit,
        unit: values.unit,
        materialType: values.materialType,
        createdTime: values.createdTime || isoDate(),
        note: values.note
      };
      store.materials.unshift(record);
      addActivity(store, "建立药材档案", `${record.name} 已纳入物料档案`, `${record.materialNo} · ${record.materialType}`);
      return;
    }

    if (pageId === "trace-code-management") {
      const process = shared.maps.primaryProcessById.get(values.primaryProcessId);
      const warehouse = shared.maps.warehouseById.get(values.warehouseId);
      const traceCode = values.traceCode || suggestTraceCode(store.qrCodes.length + 1);
      const record = {
        id: entityId("QR", store.qrCodes.length + 1),
        primaryProcessId: values.primaryProcessId,
        warehouseId: values.warehouseId,
        name: values.name || (process ? `${process.name}溯源码` : "溯源码"),
        traceCode,
        createdAt: isoDate(),
        publicUrl: buildTraceQueryUrl(traceCode)
      };
      store.qrCodes.unshift(record);
      addActivity(store, "生成溯源码", `${record.name} 已可查询`, `${warehouse ? warehouse.name : "未指定仓库"} · ${traceCode}`);
      return;
    }

    if (pageId === "warehouse-management") {
      const record = {
        id: entityId("WARE", store.warehouses.length + 1),
        name: values.name,
        manager: values.manager,
        conditions: values.conditions,
        method: values.method,
        address: values.address,
        detailAddress: values.detailAddress,
        storeArea: toNumber(values.storeArea),
        storeSize: toNumber(values.storeSize),
        note: values.note,
        createdAt: isoDate()
      };
      store.warehouses.unshift(record);
      addActivity(store, "建立仓库主档", `${record.name} 已纳入仓储主档`, `${record.conditions} · ${record.method}`);
    }
  });
}

function resolveSelectedIdAfterCreate(pageId, kind, values) {
  if (pageId === "farming-trace" && kind === "secondary") {
    return values.plantId || "";
  }
  if (pageId === "processing-trace" && kind === "secondary") {
    return values.primaryProcessId || "";
  }
  return "";
}

function handleContinueWorkflow(button) {
  const pageId = button.dataset.pageId;
  if (!pageId) {
    return;
  }
  const dialogKind = button.dataset.dialogKind || "primary";
  const selectedId = button.dataset.selectedId || "";
  const rawDraft = button.dataset.draft || "{}";
  let draft = {};
  try {
    draft = JSON.parse(rawDraft);
  } catch (error) {
    draft = {};
  }
  writeDraft(pageId, draft);
  const params = new URLSearchParams({ action: "create", kind: dialogKind });
  if (selectedId) {
    params.set("selected", selectedId);
  }
  window.location.href = `${pageId}.html?${params.toString()}`;
}

function handleDeleteRecord(pageId, recordId, shared, root) {
  const result = canDeleteRecord(pageId, recordId, shared);
  if (!result.allowed) {
    window.alert(result.message);
    return;
  }
  if (!window.confirm("确定删除这条记录吗？")) {
    return;
  }

  updateWorkflowStore((store) => {
    if (pageId === "base-trace") {
      store.bases = store.bases.filter((item) => item.id !== recordId);
    }
    if (pageId === "seed-trace") {
      store.seeds = store.seeds.filter((item) => item.id !== recordId);
    }
    if (pageId === "farming-trace") {
      store.plantProcesses = store.plantProcesses.filter((item) => item.id !== recordId);
    }
    if (pageId === "harvest-trace") {
      store.harvests = store.harvests.filter((item) => item.id !== recordId);
    }
    if (pageId === "processing-trace") {
      store.primaryProcesses = store.primaryProcesses.filter((item) => item.id !== recordId);
    }
    if (pageId === "herb-management") {
      store.materials = store.materials.filter((item) => item.id !== recordId);
    }
    if (pageId === "trace-code-management") {
      store.qrCodes = store.qrCodes.filter((item) => item.id !== recordId);
    }
    if (pageId === "warehouse-management") {
      store.warehouses = store.warehouses.filter((item) => item.id !== recordId);
    }
    addActivity(store, "删除记录", `${pageLabel(pageId)} 已删除一条记录`, `记录编号 ${recordId}`);
  });

  APP_STATE.selectedId = "";
  renderAndBind(root, pageId);
}

function handleDeleteSubrecord(pageId, recordId, shared, root, selected) {
  if (!window.confirm("确定删除这条子记录吗？")) {
    return;
  }
  updateWorkflowStore((store) => {
    if (pageId === "farming-trace") {
      store.farmRecords = store.farmRecords.filter((item) => item.id !== recordId);
      addActivity(store, "删除农事记录", selected ? `${selected.name} 删除了一条农事` : "删除农事记录", `记录编号 ${recordId}`);
    }
    if (pageId === "processing-trace") {
      store.processSteps = store.processSteps.filter((item) => item.id !== recordId);
      addActivity(store, "删除工艺步骤", selected ? `${selected.name} 删除了一步工艺` : "删除工艺步骤", `记录编号 ${recordId}`);
    }
  });
  renderAndBind(root, pageId);
}

function canDeleteRecord(pageId, recordId, shared) {
  if (pageId === "base-trace") {
    const seedCount = (shared.relations.seedsByBaseId.get(recordId) || []).length;
    const plantCount = (shared.relations.plantsByBaseId.get(recordId) || []).length;
    if (seedCount || plantCount) {
      return { allowed: false, message: "当前基地已经接入种源或种植过程，不能直接删除。" };
    }
  }
  if (pageId === "seed-trace") {
    if ((shared.relations.plantsBySeedId.get(recordId) || []).length) {
      return { allowed: false, message: "当前种源已经进入种植过程，不能直接删除。" };
    }
  }
  if (pageId === "farming-trace") {
    if ((shared.relations.farmByPlantId.get(recordId) || []).length || (shared.relations.harvestsByPlantId.get(recordId) || []).length) {
      return { allowed: false, message: "当前种植过程下还有农事或采收记录，不能直接删除。" };
    }
  }
  if (pageId === "harvest-trace") {
    if ((shared.relations.processesByHarvestId.get(recordId) || []).length) {
      return { allowed: false, message: "当前采收批次已经进入加工流程，不能直接删除。" };
    }
  }
  if (pageId === "processing-trace") {
    if ((shared.relations.stepsByProcessId.get(recordId) || []).length || (shared.relations.qrByProcessId.get(recordId) || []).length) {
      return { allowed: false, message: "当前加工过程下还有工艺步骤或溯源码，不能直接删除。" };
    }
  }
  if (pageId === "herb-management") {
    if ((shared.relations.processesByMaterialId.get(recordId) || []).length) {
      return { allowed: false, message: "当前药材档案已经被加工过程引用，不能直接删除。" };
    }
  }
  if (pageId === "warehouse-management") {
    if ((shared.relations.qrByWarehouseId.get(recordId) || []).length) {
      return { allowed: false, message: "当前仓库已经绑定溯源码，不能直接删除。" };
    }
  }
  return { allowed: true };
}

function buildSharedData(store) {
  const normalized = {
    ...EMPTY_WORKFLOW_STORE,
    ...store
  };

  const maps = {
    baseById: indexBy(normalized.bases),
    seedById: indexBy(normalized.seeds),
    plantById: indexBy(normalized.plantProcesses),
    harvestById: indexBy(normalized.harvests),
    materialById: indexBy(normalized.materials),
    primaryProcessById: indexBy(normalized.primaryProcesses),
    warehouseById: indexBy(normalized.warehouses)
  };

  const relations = {
    seedsByBaseId: groupBy(normalized.seeds, "baseId"),
    plantsByBaseId: groupBy(normalized.plantProcesses, "baseId"),
    plantsBySeedId: groupBy(normalized.plantProcesses, "seedId"),
    farmByPlantId: groupBy(normalized.farmRecords, "plantId"),
    harvestsByPlantId: groupBy(normalized.harvests, "plantId"),
    processesByHarvestId: groupBy(normalized.primaryProcesses, "harvestId"),
    processesByMaterialId: groupBy(normalized.primaryProcesses, "materialId"),
    stepsByProcessId: groupBy(normalized.processSteps, "primaryProcessId"),
    qrByProcessId: groupBy(normalized.qrCodes, "primaryProcessId"),
    qrByWarehouseId: groupBy(normalized.qrCodes, "warehouseId")
  };

  const views = {
    bases: normalized.bases.map((item) => buildBaseView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    seeds: normalized.seeds.map((item) => buildSeedView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    plants: normalized.plantProcesses.map((item) => buildPlantView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    farmRecords: normalized.farmRecords.map((item) => buildFarmRecordView(item, maps)).sort((a, b) => a.orderSort - b.orderSort || sortByDateDesc("createdAt")(a, b)),
    harvests: normalized.harvests.map((item) => buildHarvestView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    materials: normalized.materials.map((item) => buildMaterialView(item, relations)).sort(sortByDateDesc("createdTime")),
    processes: normalized.primaryProcesses.map((item) => buildProcessView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    processSteps: normalized.processSteps.map((item) => buildProcessStepView(item)).sort((a, b) => a.orderSort - b.orderSort || sortByDateDesc("createdAt")(a, b)),
    qrCodes: normalized.qrCodes.map((item) => buildQrView(item, maps, relations)).sort(sortByDateDesc("createdAt")),
    warehouses: normalized.warehouses.map((item) => buildWarehouseView(item, relations)).sort(sortByDateDesc("createdAt"))
  };

  const viewMaps = {
    baseById: indexBy(views.bases),
    seedById: indexBy(views.seeds),
    plantById: indexBy(views.plants),
    harvestById: indexBy(views.harvests),
    materialById: indexBy(views.materials),
    primaryProcessById: indexBy(views.processes),
    warehouseById: indexBy(views.warehouses)
  };

  const summary = buildSummary(views, relations, maps, normalized.activities);

  return {
    store: normalized,
    maps,
    viewMaps,
    relations,
    views,
    summary
  };
}

function buildSummary(views, relations, maps, activities) {
  const stageCards = [
    { label: "基地", value: `${views.bases.length}` },
    { label: "种源", value: `${views.seeds.length}` },
    { label: "种植", value: `${views.plants.length}` },
    { label: "采收", value: `${views.harvests.length}` },
    { label: "加工", value: `${views.processes.length}` },
    { label: "赋码", value: `${views.qrCodes.length}` },
    { label: "仓库", value: `${views.warehouses.length}` }
  ];

  const pendingTasks = [];

  if (!views.bases.length) {
    pendingTasks.push({
      label: "开始建立基地档案",
      title: "先建立第一个基地档案",
      short: "从基地开始",
      detail: "没有基地主档，后续链路都无法挂接。",
      pageId: "base-trace",
      dialogKind: "primary",
      selectedId: "",
      draft: {}
    });
  }

  const baseWithoutSeed = views.bases.find((item) => item.seedCount === 0);
  if (baseWithoutSeed) {
    pendingTasks.push({
      label: "继续补基地种源",
      title: "还有基地未接入种源",
      short: "待建种源",
      detail: `${baseWithoutSeed.name} 还没有种源批次，建议先补“种源备案”。`,
      pageId: "seed-trace",
      dialogKind: "primary",
      selectedId: "",
      draft: { baseId: baseWithoutSeed.id, herb: baseWithoutSeed.herb }
    });
  }

  const seedWithoutPlant = views.seeds.find((item) => item.plantCount === 0);
  if (seedWithoutPlant) {
    pendingTasks.push({
      label: "继续建立种植过程",
      title: "还有种源未进入种植",
      short: "待建种植",
      detail: `${seedWithoutPlant.batchNo} 还没有对应的种植过程。`,
      pageId: "farming-trace",
      dialogKind: "primary",
      selectedId: "",
      draft: { seedId: seedWithoutPlant.id, baseId: seedWithoutPlant.baseId }
    });
  }

  const plantWithoutFarm = views.plants.find((item) => item.farmCount === 0);
  if (plantWithoutFarm) {
    pendingTasks.push({
      label: "继续补农事记录",
      title: "还有种植过程缺农事记录",
      short: "待补农事",
      detail: `${plantWithoutFarm.name} 还没有农事时间轴。`,
      pageId: "farming-trace",
      dialogKind: "secondary",
      selectedId: plantWithoutFarm.id,
      draft: { plantId: plantWithoutFarm.id }
    });
  }

  const plantWithoutHarvest = views.plants.find((item) => item.harvestCount === 0);
  if (plantWithoutHarvest) {
    pendingTasks.push({
      label: "继续建立采收批次",
      title: "还有种植过程未进入采收",
      short: "待建采收",
      detail: `${plantWithoutHarvest.name} 还没有采收批次。`,
      pageId: "harvest-trace",
      dialogKind: "primary",
      selectedId: "",
      draft: { plantId: plantWithoutHarvest.id }
    });
  }

  const harvestWithoutProcess = views.harvests.find((item) => item.processCount === 0);
  if (views.harvests.length > 0 && !views.materials.length) {
    pendingTasks.push({
      label: "先建立药材档案",
      title: "加工前还缺药材档案",
      short: "待建药材档",
      detail: `${harvestWithoutProcess ? harvestWithoutProcess.herb : "当前采收批次"} 还没有可绑定的药材档案。`,
      pageId: "herb-management",
      dialogKind: "primary",
      selectedId: "",
      draft: {
        name: harvestWithoutProcess ? harvestWithoutProcess.herb : "",
        specification: "统货",
        packageUnit: "25kg / 袋",
        unit: "kg",
        materialType: "原药材"
      }
    });
  }

  if (harvestWithoutProcess && views.materials.length > 0) {
    pendingTasks.push({
      label: "继续进入初加工",
      title: "还有采收批次未进入加工",
      short: "待进加工",
      detail: `${harvestWithoutProcess.harvestBatch} 还没有加工过程。`,
      pageId: "processing-trace",
      dialogKind: "primary",
      selectedId: "",
      draft: { harvestId: harvestWithoutProcess.id, materialId: views.materials[0].id }
    });
  }

  const processWithoutSteps = views.processes.find((item) => item.stepCount === 0);
  if (processWithoutSteps) {
    pendingTasks.push({
      label: "继续补工艺步骤",
      title: "还有加工过程缺工艺步骤",
      short: "待补工艺",
      detail: `${processWithoutSteps.name} 还没有工艺步骤时间轴。`,
      pageId: "processing-trace",
      dialogKind: "secondary",
      selectedId: processWithoutSteps.id,
      draft: { primaryProcessId: processWithoutSteps.id }
    });
  }

  if (!views.warehouses.length) {
    pendingTasks.push({
      label: "先建立仓库主档",
      title: "仓库主档还没有建立",
      short: "待建仓库",
      detail: "建议先补一个仓库主档，便于赋码时直接绑定仓储落点。",
      pageId: "warehouse-management",
      dialogKind: "primary",
      selectedId: "",
      draft: {}
    });
  }

  const processWithoutQr = views.processes.find((item) => item.qrCount === 0 && item.stepCount > 0);
  if (processWithoutQr && views.warehouses.length > 0) {
    pendingTasks.push({
      label: "继续生成溯源码",
      title: "还有加工过程未赋码",
      short: "待生成码",
      detail: `${processWithoutQr.name} 还没有对外查询码。`,
      pageId: "trace-code-management",
      dialogKind: "primary",
      selectedId: "",
      draft: {
        primaryProcessId: processWithoutQr.id,
        warehouseId: views.warehouses[0].id,
        name: `${processWithoutQr.name}溯源码`
      }
    });
  }

  const completionStages = [
    views.bases.length > 0,
    views.seeds.length > 0,
    views.plants.length > 0 && views.farmRecords.length > 0,
    views.harvests.length > 0,
    views.processes.length > 0 && views.processSteps.length > 0,
    views.qrCodes.length > 0,
    views.warehouses.length > 0
  ];
  const flowCompletion = Math.round((completionStages.filter(Boolean).length / completionStages.length) * 100);
  const latestDate = activities.length ? activities[0].date : "等待建立首条记录";

  return {
    stageCards,
    pendingTasks,
    latestDate,
    flowCompletion,
    activities: activities.slice(0, 8),
    nextAction: pendingTasks[0] || null
  };
}

function buildBaseView(item, maps, relations) {
  const photos = normalizeTracePhotoList(item.photos);
  const seedCount = (relations.seedsByBaseId.get(item.id) || []).length;
  const plantCount = (relations.plantsByBaseId.get(item.id) || []).length;
  const harvestCount = sumLengths((relations.plantsByBaseId.get(item.id) || []).map((plant) => relations.harvestsByPlantId.get(plant.id) || []));
  const readiness = completionScore([
    item.name,
    item.code,
    item.manager,
    item.herb,
    item.areaMu,
    item.address,
    item.longitude,
    item.latitude,
    item.landCertStatus === "已归档",
    item.envReportStatus === "已归档",
    photos.length > 0
  ]);
  return {
    ...item,
    photos,
    photoCount: photos.length,
    seedCount,
    plantCount,
    harvestCount,
    areaText: `${formatDecimal(item.areaMu)} 亩`,
    addressLine: compactAddress(item.address, item.detailAddress),
    coordinateText: formatCoordinateText(item.longitude, item.latitude),
    readiness,
    statusLabel: readiness >= 85 ? "主档完备" : "待补资料",
    statusTone: readiness >= 85 ? "good" : "warn",
    createdAt: item.createdAt || isoDate()
  };
}

function buildSeedView(item, maps, relations) {
  const base = maps.baseById.get(item.baseId);
  const plantCount = (relations.plantsBySeedId.get(item.id) || []).length;
  const readiness = completionScore([
    item.baseId,
    item.batchNo,
    item.herb,
    item.supplierName,
    item.quantity,
    item.boughtDate,
    item.certificateStatus === "已归档"
  ]);
  return {
    ...item,
    baseName: base ? base.name : "--",
    baseCode: base ? base.code : "--",
    baseAddress: base ? compactAddress(base.address, base.detailAddress) : "--",
    quantityText: `${formatDecimal(item.quantity)} kg`,
    plantCount,
    statusLabel: item.certificateStatus === "已归档" ? "可投种" : "待补资质",
    statusTone: item.certificateStatus === "已归档" ? "good" : "warn",
    readiness,
    createdAt: item.createdAt || isoDate()
  };
}

function buildPlantView(item, maps, relations) {
  const base = maps.baseById.get(item.baseId);
  const seed = maps.seedById.get(item.seedId);
  const farmItems = relations.farmByPlantId.get(item.id) || [];
  const harvestItems = relations.harvestsByPlantId.get(item.id) || [];
  return {
    ...item,
    baseName: base ? base.name : "--",
    baseCode: base ? base.code : "--",
    seedBatch: seed ? seed.batchNo : "--",
    seedBrand: seed ? seed.brand : "--",
    herb: item.herb || (seed ? seed.herb : (base ? base.herb : "--")),
    farmCount: farmItems.length,
    harvestCount: harvestItems.length,
    plantAreaText: `${formatDecimal(item.plantArea)} 亩`,
    estimatedOutputText: item.estimatedOutput ? `${formatDecimal(item.estimatedOutput)} ${item.unit || "kg"}` : "--",
    statusLabel: harvestItems.length ? "已进采收" : (farmItems.length ? "种植中" : "待补农事"),
    statusTone: harvestItems.length ? "good" : (farmItems.length ? "primary" : "warn"),
    createdAt: item.createdAt || isoDate()
  };
}

function buildFarmRecordView(item, maps) {
  const plant = maps.plantById.get(item.plantId);
  return {
    ...item,
    plantName: plant ? plant.name : "--",
    periodText: formatPeriod(item.startDate, item.endDate),
    createdAt: item.createdAt || isoDate()
  };
}

function buildHarvestView(item, maps, relations) {
  const plant = maps.plantById.get(item.plantId);
  const processCount = (relations.processesByHarvestId.get(item.id) || []).length;
  return {
    ...item,
    baseName: plant ? plant.baseName : "--",
    plantBatch: plant ? plant.plantBatch : "--",
    herb: item.herb || (plant ? plant.herb : "--"),
    processCount,
    statusLabel: processCount ? "已进加工" : "待入加工",
    statusTone: processCount ? "good" : "warn",
    createdAt: item.createdAt || isoDate()
  };
}

function buildMaterialView(item, relations) {
  const processCount = (relations.processesByMaterialId.get(item.id) || []).length;
  return {
    ...item,
    processCount,
    statusLabel: processCount ? "已被调用" : "待关联工艺",
    statusTone: processCount ? "good" : "pending"
  };
}

function buildProcessView(item, maps, relations) {
  const harvest = maps.harvestById.get(item.harvestId);
  const material = maps.materialById.get(item.materialId);
  const stepItems = relations.stepsByProcessId.get(item.id) || [];
  const qrItems = relations.qrByProcessId.get(item.id) || [];
  const yieldRate = item.inputCount > 0 ? Math.round((item.outputCount / item.inputCount) * 100) : 0;
  return {
    ...item,
    harvestName: harvest ? harvest.name : "--",
    harvestBatch: harvest ? harvest.harvestBatch : "--",
    harvestId: item.harvestId,
    materialName: material ? material.name : "--",
    materialNo: material ? material.materialNo : "--",
    stepCount: stepItems.length,
    qrCount: qrItems.length,
    yieldRate,
    statusLabel: qrItems.length ? "已赋码" : (stepItems.length ? "待赋码" : "待补工艺"),
    statusTone: qrItems.length ? "good" : (stepItems.length ? "primary" : "warn"),
    createdAt: item.createdAt || isoDate()
  };
}

function buildProcessStepView(item) {
  return {
    ...item,
    periodText: formatPeriod(item.startDate, item.endDate),
    createdAt: item.createdAt || isoDate()
  };
}

function buildQrView(item, maps) {
  const process = maps.primaryProcessById.get(item.primaryProcessId);
  const warehouse = maps.warehouseById.get(item.warehouseId);
  const harvest = process ? maps.harvestById.get(process.harvestId) : null;
  const material = process ? maps.materialById.get(process.materialId) : null;
  const plant = harvest ? maps.plantById.get(harvest.plantId) : null;
  const seed = plant ? maps.seedById.get(plant.seedId) : null;
  const base = plant ? maps.baseById.get(plant.baseId) : null;
  const publicUrl = item.publicUrl || buildTraceQueryUrl(item.traceCode);
  return {
    ...item,
    primaryProcessId: item.primaryProcessId,
    plantId: plant ? plant.id : "",
    materialName: material ? material.name : "--",
    materialNo: material ? material.materialNo : "--",
    processName: process ? process.name : "--",
    processBatch: process ? process.ppBatch : "--",
    inputCount: process ? process.inputCount : 0,
    outputCount: process ? process.outputCount : 0,
    harvestName: harvest ? harvest.name : "--",
    harvestBatch: harvest ? harvest.harvestBatch : "--",
    harvestWeight: harvest ? harvest.harvestWeight : 0,
    plantBatch: plant ? plant.plantBatch : "--",
    baseName: base ? base.name : "--",
    baseCode: base ? base.code : "--",
    baseAddress: base ? compactAddress(base.address, base.detailAddress) : "--",
    baseCoordinates: base ? readTraceMapCoordinates(base) : null,
    seedBatch: seed ? seed.batchNo : "--",
    seedBrand: seed ? seed.brand : "--",
    supplierName: seed ? seed.supplierName : "--",
    warehouseName: warehouse ? warehouse.name : "--",
    warehouseConditions: warehouse ? warehouse.conditions : "--",
    warehouseMethod: warehouse ? warehouse.method : "--",
    statusLabel: "可查询",
    statusTone: "good",
    publicUrl
  };
}

function buildWarehouseView(item, relations) {
  const qrs = relations.qrByWarehouseId.get(item.id) || [];
  const linkedProcesses = uniqueCount(qrs, "primaryProcessId");
  return {
    ...item,
    qrCount: qrs.length,
    linkedProcesses,
    addressLine: compactAddress(item.address, item.detailAddress),
    statusLabel: qrs.length ? "在用仓库" : "待绑定批次",
    statusTone: qrs.length ? "good" : "pending",
    createdAt: item.createdAt || isoDate()
  };
}

function renderBaseDetail(view, shared) {
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.code} · ${view.herb}`)}
    ${renderMetricGrid([
      { label: "基地面积", value: view.areaText },
      { label: "档案完整度", value: `${view.readiness}%` },
      { label: "关联种源", value: `${view.seedCount} 条` },
      { label: "关联种植", value: `${view.plantCount} 条` }
    ])}
    ${renderActionBar([
      continueAction("继续新增种源", "seed-trace", { baseId: view.id, herb: view.herb }),
      subtleTextAction("坐标", view.coordinateText || "未设置坐标")
    ])}
    ${renderInfoRack([
      infoCard("主档信息", [view.manager, view.baseType, view.cooperationMode]),
      infoCard("资料状态", [view.landCertStatus || "待补土地证明", view.envReportStatus || "待补环境检测", `${view.photoCount} 张基地照片`])
    ])}
    ${renderBaseMap(view)}
    ${renderPhotoGallery(view, "基地照片")}
  `;
}

function renderSeedDetail(view, shared) {
  return `
    ${renderDetailHero(view.batchNo, view.statusLabel, view.statusTone, `${view.herb} · ${view.baseName}`)}
    ${renderMetricGrid([
      { label: "到货数量", value: view.quantityText },
      { label: "品牌", value: view.brand || "--" },
      { label: "已进种植", value: `${view.plantCount} 条` },
      { label: "资质状态", value: view.certificateStatus || "待补充" }
    ])}
    ${renderActionBar([
      continueAction("继续建立种植过程", "farming-trace", { seedId: view.id, baseId: view.baseId }),
      subtleTextAction("查看基地", `${view.baseName} · ${view.baseCode}`)
    ])}
    ${renderInfoRack([
      infoCard("上游基地", [view.baseName, view.baseCode, view.baseAddress]),
      infoCard("供应商信息", [view.supplierName, view.supplierPhone || "--", `${view.sourceType} / ${view.breedMaterial}`])
    ])}
    ${renderNarrativeBlock("批次备注", view.note || "当前没有补充说明。")}
  `;
}

function renderPlantDetail(view, shared) {
  const primaryAction = view.farmCount === 0
    ? secondaryContinueAction("继续新增农事记录", "farming-trace", { plantId: view.id }, view.id)
    : continueAction("继续新增采收批次", "harvest-trace", { plantId: view.id });
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.plantBatch} · ${view.herb}`)}
    ${renderMetricGrid([
      { label: "种植面积", value: view.plantAreaText },
      { label: "农事记录", value: `${view.farmCount} 条` },
      { label: "采收批次", value: `${view.harvestCount} 条` },
      { label: "预估产量", value: view.estimatedOutputText }
    ])}
    ${renderActionBar([
      primaryAction,
      subtleTextAction("负责人", view.worker)
    ])}
    ${renderInfoRack([
      infoCard("来源链路", [view.baseName, view.seedBatch, view.seedBrand || "--"]),
      infoCard("种植管理", [view.plantMethod, view.managementStandard || "--", view.plantExperience || "--"])
    ])}
    ${renderNarrativeBlock("种植说明", view.previewMat ? `前茬作物：${view.previewMat}` : "当前没有补充前茬作物。")}
    ${renderPhotoGallery(view, "现场照片")}
  `;
}

function renderHarvestDetail(view, shared) {
  const defaultMaterial = shared.views.materials[0];
  const primaryAction = defaultMaterial
    ? continueAction("继续新增加工过程", "processing-trace", { harvestId: view.id, materialId: defaultMaterial.id })
    : continueAction("先建立药材档案", "herb-management", {
      name: view.herb,
      specification: "统货",
      packageUnit: "25kg / 袋",
      unit: "kg",
      materialType: "原药材"
    });
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.harvestBatch} · ${view.herb}`)}
    ${renderMetricGrid([
      { label: "采收重量", value: `${formatDecimal(view.harvestWeight)} kg` },
      { label: "采收部位", value: view.harvestPart },
      { label: "负责人", value: view.harvestManager },
      { label: "已进加工", value: `${view.processCount} 条` }
    ])}
    ${renderActionBar([
      primaryAction,
      subtleTextAction("来源种植", `${view.baseName} · ${view.plantBatch}`)
    ])}
    ${renderInfoRack([
      infoCard("采收信息", [view.harvestType, view.harvestMethod, formatPeriod(view.startDate, view.endDate)]),
      infoCard("来源主线", [view.baseName, view.plantBatch, view.herb])
    ])}
    ${renderNarrativeBlock("采收备注", view.note || "当前没有补充备注。")}
    ${renderPhotoGallery(view, "采收现场照片")}
  `;
}

function renderProcessDetail(view, shared) {
  const firstWarehouse = shared.views.warehouses[0];
  const primaryAction = view.stepCount === 0
    ? secondaryContinueAction("继续补工艺步骤", "processing-trace", { primaryProcessId: view.id }, view.id)
    : (firstWarehouse
      ? continueAction("继续生成溯源码", "trace-code-management", {
        primaryProcessId: view.id,
        warehouseId: firstWarehouse.id,
        name: `${view.materialName}溯源码`
      })
      : continueAction("先建立仓库主档", "warehouse-management", {}));
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.ppBatch} · ${view.materialName}`)}
    ${renderMetricGrid([
      { label: "投入", value: `${formatDecimal(view.inputCount)} kg` },
      { label: "产出", value: `${formatDecimal(view.outputCount)} kg` },
      { label: "得率", value: `${view.yieldRate}%` },
      { label: "工艺步骤", value: `${view.stepCount} 步` }
    ])}
    ${renderActionBar([
      primaryAction,
      subtleTextAction("来源采收", `${view.harvestName} · ${view.harvestBatch}`)
    ])}
    ${renderInfoRack([
      infoCard("药材信息", [view.materialName, view.materialNo, view.ppType]),
      infoCard("加工信息", [view.manager, formatPeriod(view.startDate, view.endDate), view.processAddress || "--"])
    ])}
    ${renderNarrativeBlock("工艺备注", view.note || "当前没有补充说明。")}
    ${renderPhotoGallery(view, "加工现场照片")}
  `;
}

function renderMaterialDetail(view, shared) {
  const harvestWithoutProcess = shared.views.harvests.find((item) => item.processCount === 0);
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.materialNo} · ${view.materialType}`)}
    ${renderMetricGrid([
      { label: "规格", value: view.specification },
      { label: "包装规格", value: view.packageUnit },
      { label: "单位", value: view.unit },
      { label: "加工调用", value: `${view.processCount} 次` }
    ])}
    ${renderActionBar(
      harvestWithoutProcess
        ? [continueAction("用这条药材进入加工", "processing-trace", { harvestId: harvestWithoutProcess.id, materialId: view.id }), subtleTextAction("待加工采收", harvestWithoutProcess.harvestBatch)]
        : [subtleTextAction("使用状态", view.processCount ? "当前已进入工艺" : "等待采收批次接入加工")]
    )}
    ${renderInfoRack([
      infoCard("物料标签", [view.materialType, view.createdTime, view.materialNo]),
      infoCard("使用状态", [view.statusLabel, view.processCount ? "已进入工艺" : "等待工艺引用", view.note || "无补充备注"])
    ])}
  `;
}

function renderQrDetail(view, shared) {
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.traceCode} · ${view.materialName}`)}
    ${renderMetricGrid([
      { label: "药材", value: view.materialName },
      { label: "仓库", value: view.warehouseName },
      { label: "采收批次", value: view.harvestBatch },
      { label: "加工批次", value: view.processBatch }
    ])}
    ${renderActionBar([
      { label: "打印溯源码", action: `window.printCode('${view.id}')`, tone: "primary", icon: "print" },
      externalLinkAction("查询页预览", view.publicUrl),
      subtleTextAction("查询地址", truncateText(view.publicUrl, 40))
    ])}
    ${renderInfoRack([
      infoCard("链路摘要", [view.baseName, view.seedBatch, view.plantBatch]),
      infoCard("落仓信息", [view.warehouseName, view.warehouseConditions, view.warehouseMethod])
    ])}
    ${renderNarrativeBlock("查询说明", "这条码已经绑定到完整链路，支持打印成贴纸或在线扫码预览。")}

    <div id="print-area-${view.id}" class="print-only">
      <div class="printable-qr-card">
        <h1>中药材溯源码</h1>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(view.publicUrl)}" alt="QR Code">
        <div class="printable-qr-info">
          <div class="printable-qr-row"><span>药材名称：</span><strong>${escapeHtml(view.materialName)}</strong></div>
          <div class="printable-qr-row"><span>溯源码号：</span><strong>${escapeHtml(view.traceCode)}</strong></div>
          <div class="printable-qr-row"><span>生产批次：</span><strong>${escapeHtml(view.ppBatch)}</strong></div>
          <div class="printable-qr-row"><span>生产日期：</span><strong>${escapeHtml(view.createdAt.split("T")[0])}</strong></div>
          <div class="printable-qr-row"><span>企业名称：</span><strong>中药材全国追踪平台</strong></div>
        </div>
      </div>
    </div>
  `;
}

window.printCode = function(qrId) {
  window.print();
};

function renderWarehouseDetail(view, shared) {
  const readyProcess = shared.views.processes.find((item) => item.stepCount > 0 && item.qrCount === 0);
  const primaryAction = readyProcess
    ? continueAction("继续生成仓储赋码", "trace-code-management", {
      primaryProcessId: readyProcess.id,
      warehouseId: view.id,
      name: `${readyProcess.materialName}溯源码`
    })
    : continueAction("继续生成仓储赋码", "trace-code-management", { warehouseId: view.id });
  return `
    ${renderDetailHero(view.name, view.statusLabel, view.statusTone, `${view.conditions} · ${view.method}`)}
    ${renderMetricGrid([
      { label: "仓库面积", value: `${formatDecimal(view.storeArea)} ㎡` },
      { label: "仓库容量", value: `${formatDecimal(view.storeSize)} m³` },
      { label: "已绑溯源码", value: `${view.qrCount} 个` },
      { label: "关联加工", value: `${view.linkedProcesses} 条` }
    ])}
    ${renderActionBar([
      primaryAction,
      subtleTextAction("负责人", view.manager)
    ])}
    ${renderInfoRack([
      infoCard("仓储条件", [view.conditions, view.method, view.manager]),
      infoCard("地址信息", [view.address, view.detailAddress, view.note || "无补充说明"])
    ])}
  `;
}

function renderFarmTimeline(items) {
  return `
    <div class="timeline-list">
      ${items.map((item) => `
        <article class="timeline-card">
          <div class="timeline-order">${item.orderSort}</div>
          <div class="timeline-copy">
            <strong>${escapeHtml(item.workName)}</strong>
            <span>${escapeHtml(item.periodText)} · ${escapeHtml(item.operator)}</span>
            <p>${escapeHtml(item.operateDetail || item.note || "已记录农事操作。")}</p>
          </div>
          <button class="chip danger" type="button" data-delete-subrecord="${escapeAttribute(item.id)}">删除</button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderProcessStepTimeline(items) {
  return `
    <div class="timeline-list">
      ${items.map((item) => `
        <article class="timeline-card">
          <div class="timeline-order">${item.orderSort}</div>
          <div class="timeline-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.processType)} · ${escapeHtml(item.periodText)}</span>
            <p>${escapeHtml(item.stepDetails || item.note || "已记录工艺步骤。")}</p>
          </div>
          <button class="chip danger" type="button" data-delete-subrecord="${escapeAttribute(item.id)}">删除</button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDetailHero(title, statusLabel, statusTone, subtitle) {
  return `
    <div class="detail-hero">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      ${statusPill(statusLabel, statusTone)}
    </div>
  `;
}

function renderMetricGrid(metrics) {
  return `
    <div class="metric-grid">
      ${metrics.map((metric) => `
        <article class="metric-card">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
        </article>
      `).join("")}
    </div>
  `;
}

function renderActionBar(actions) {
  return `
    <div class="detail-actions">
      ${actions.map((action) => renderAction(action)).join("")}
    </div>
  `;
}

function renderAction(action) {
  if (action.kind === "continue") {
    return `<button class="button ${action.variant || "primary"}" type="button" data-continue-workflow ${workflowTriggerAttrs(action)}>${escapeHtml(action.label)}</button>`;
  }
  if (action.kind === "external-link") {
    return `<a class="button secondary" href="${escapeAttribute(action.href)}">${escapeHtml(action.label)}</a>`;
  }
  return `<span class="detail-note">${escapeHtml(action.label)}：${escapeHtml(action.value || "--")}</span>`;
}

function renderInfoRack(cards) {
  return `
    <div class="info-rack">
      ${cards.map((card) => `
        <article class="info-card">
          <span>${escapeHtml(card.title)}</span>
          ${card.lines.map((line) => `<strong>${escapeHtml(line || "--")}</strong>`).join("")}
        </article>
      `).join("")}
    </div>
  `;
}

function renderNarrativeBlock(title, text) {
  return `
    <div class="narrative-block">
      <span>${escapeHtml(title)}</span>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function infoCard(title, lines) {
  return { title, lines };
}

function continueAction(label, pageId, draft) {
  return { kind: "continue", label, pageId, draft, dialogKind: "primary", selectedId: "", variant: "primary" };
}

function secondaryContinueAction(label, pageId, draft, selectedId) {
  return { kind: "continue", label, pageId, draft, dialogKind: "secondary", selectedId, variant: "secondary" };
}

function subtleTextAction(label, value) {
  return { kind: "note", label, value };
}

function subtleLinkAction(label, value) {
  return { kind: "note", label, value };
}

function externalLinkAction(label, href) {
  return { kind: "external-link", label, href };
}

function workflowTriggerAttrs(action) {
  return [
    `data-page-id="${escapeAttribute(action.pageId || "")}"`,
    `data-dialog-kind="${escapeAttribute(action.dialogKind || "primary")}"`,
    `data-selected-id="${escapeAttribute(action.selectedId || "")}"`,
    `data-draft='${escapeAttribute(JSON.stringify(action.draft || {}))}'`
  ].join(" ");
}

function statusPill(label, tone) {
  return `<span class="status-pill ${tone ? `is-${tone}` : ""}">${escapeHtml(label)}</span>`;
}

function titleCell(title, meta) {
  return `
    <div class="title-cell">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(meta)}</span>
    </div>
  `;
}

function stackedCell(top, bottom) {
  return `
    <div class="stacked-cell">
      <strong>${escapeHtml(top)}</strong>
      <span>${escapeHtml(bottom)}</span>
    </div>
  `;
}

function metricMini(value) {
  return `<span class="metric-mini">${escapeHtml(value)}</span>`;
}

function deleteActionButton(id) {
  return `<button class="chip danger" type="button" data-delete-record="${escapeAttribute(id)}">删除</button>`;
}

function publicPreviewLink(href) {
  return `<a class="chip neutral" href="${escapeAttribute(href)}">查询页</a>`;
}

function navCountFor(pageId, shared) {
  if (pageId === "home") {
    return 0;
  }
  const map = {
    "base-trace": shared.views.bases.length,
    "seed-trace": shared.views.seeds.length,
    "farming-trace": shared.views.plants.length,
    "harvest-trace": shared.views.harvests.length,
    "processing-trace": shared.views.processes.length,
    "herb-management": shared.views.materials.length,
    "trace-code-management": shared.views.qrCodes.length,
    "warehouse-management": shared.views.warehouses.length
  };
  return map[pageId] || 0;
}

function pageLabel(pageId) {
  const item = NAV_ITEMS.find((entry) => entry.id === pageId);
  return item ? item.title : pageId;
}

function renderNavIcon(id) {
  const icons = {
    home: `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="6" height="6" rx="1.5"></rect>
        <rect x="14" y="4" width="6" height="6" rx="1.5"></rect>
        <rect x="4" y="14" width="6" height="6" rx="1.5"></rect>
        <rect x="14" y="14" width="6" height="6" rx="1.5"></rect>
      </svg>
    `,
    "base-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 20V10"></path>
        <path d="M12 12C9.6 9.8 7.1 9.9 5.5 12C8 12.8 10 12.8 12 12Z"></path>
        <path d="M12 12C14.4 9.8 16.9 9.9 18.5 12C16 12.8 14 12.8 12 12Z"></path>
        <path d="M6 20H18"></path>
      </svg>
    `,
    "seed-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 19C15.3 19 18 16.2 18 12.8C18 9.6 15.9 6.9 12 5C8.1 6.9 6 9.6 6 12.8C6 16.2 8.7 19 12 19Z"></path>
        <path d="M12 9V16"></path>
      </svg>
    `,
    "farming-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 4H16L18 6V20H6V6L8 4Z"></path>
        <path d="M9 10H15"></path>
        <path d="M9 14H13"></path>
      </svg>
    `,
    "harvest-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 10L12 5L17 10"></path>
        <path d="M8 11H16L17.5 18H6.5L8 11Z"></path>
      </svg>
    `,
    "processing-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 7H18"></path>
        <path d="M9 7V17"></path>
        <path d="M15 7V17"></path>
        <path d="M6 17H18"></path>
      </svg>
    `,
    "herb-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 5.5H13.5C15.2 5.5 16.5 6.8 16.5 8.5V18.5H9C7.3 18.5 6 17.2 6 15.5V5.5Z"></path>
        <path d="M9 9H13.5"></path>
        <path d="M9 12.5H13.5"></path>
      </svg>
    `,
    "trace-code-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="5" height="5" rx="1"></rect>
        <rect x="15" y="4" width="5" height="5" rx="1"></rect>
        <rect x="4" y="15" width="5" height="5" rx="1"></rect>
        <path d="M15 15H17V17H20"></path>
        <path d="M17 20V17"></path>
      </svg>
    `,
    "warehouse-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 10L12 5L20 10"></path>
        <path d="M6 10V19H18V10"></path>
        <path d="M10 19V14H14V19"></path>
      </svg>
    `
  };
  return icons[id] || icons.home;
}

function fieldText(name, label, placeholder, required, value, extra = {}) {
  return { name, label, placeholder, required, value, type: "text", ...extra };
}

function fieldNumber(name, label, placeholder, required, value, extra = {}) {
  return { name, label, placeholder, required, value, type: "number", ...extra };
}

function fieldDate(name, label, required, value) {
  return { name, label, required, value, type: "date" };
}

function fieldTextarea(name, label, placeholder, required, value) {
  return { name, label, placeholder, required, value, type: "textarea", full: true };
}

function fieldSelect(name, label, options, required, value) {
  return {
    name,
    label,
    required,
    value,
    type: "select",
    options: normalizeSelectOptions(options)
  };
}

function normalizeSelectOptions(options) {
  return (options || []).map((option) => {
    if (typeof option === "string") {
      return { value: option, label: option };
    }
    return option;
  });
}

function selectBaseOptions(shared) {
  return shared.views.bases.map((item) => ({ value: item.id, label: item.name, meta: item.code }));
}

function selectSeedOptions(shared) {
  return shared.views.seeds.map((item) => ({ value: item.id, label: item.batchNo, meta: `${item.herb} · ${item.baseName}` }));
}

function selectPlantOptions(shared) {
  return shared.views.plants.map((item) => ({ value: item.id, label: item.name, meta: `${item.plantBatch} · ${item.baseName}` }));
}

function selectHarvestOptions(shared) {
  return shared.views.harvests.map((item) => ({ value: item.id, label: item.name, meta: `${item.harvestBatch} · ${item.baseName}` }));
}

function selectMaterialOptions(shared) {
  return shared.views.materials.map((item) => ({ value: item.id, label: item.name, meta: item.materialNo }));
}

function selectProcessOptions(shared) {
  return shared.views.processes.map((item) => ({ value: item.id, label: item.name, meta: `${item.ppBatch} · ${item.materialName}` }));
}

function selectWarehouseOptions(shared) {
  return shared.views.warehouses.map((item) => ({ value: item.id, label: item.name, meta: item.conditions }));
}

function nextSecondaryOrder(shared, parentId, type) {
  if (!parentId) {
    return "1";
  }
  if (type === "farm") {
    return String((shared.relations.farmByPlantId.get(parentId) || []).length + 1);
  }
  return String((shared.relations.stepsByProcessId.get(parentId) || []).length + 1);
}

function filterRecords(records, query, searchText) {
  if (!query) {
    return records;
  }
  const lowered = query.trim().toLowerCase();
  return records.filter((record) => searchText(record).toLowerCase().includes(lowered));
}

function pickSelectedRecord(filtered, allRecords, selectedId) {
  if (!filtered.length) {
    return null;
  }
  if (!selectedId) {
    return filtered[0];
  }
  return filtered.find((item) => item.id === selectedId) || filtered[0];
}

function readWorkflowStore() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return mergeStore(parsed);
  } catch (error) {
    return structuredClone(EMPTY_WORKFLOW_STORE);
  }
}

function mergeStore(parsed) {
  const merged = { ...structuredClone(EMPTY_WORKFLOW_STORE), ...(parsed || {}) };
  Object.keys(EMPTY_WORKFLOW_STORE).forEach((key) => {
    if (Array.isArray(EMPTY_WORKFLOW_STORE[key])) {
      merged[key] = Array.isArray(parsed && parsed[key]) ? parsed[key] : [];
    }
  });
  return merged;
}

function updateWorkflowStore(mutator) {
  const store = readWorkflowStore();
  mutator(store);
  writeWorkflowStore(store);
}

function writeWorkflowStore(store) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function clearWorkflowStore() {
  window.localStorage.removeItem(STORE_KEY);
  NAV_ITEMS.forEach((item) => clearDraft(item.id));
}

function writeDraft(pageId, draft) {
  window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${pageId}`, JSON.stringify(draft || {}));
}

function readDraft(pageId) {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${pageId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function clearDraft(pageId) {
  window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${pageId}`);
}

function addActivity(store, title, description, detail) {
  const activity = {
    id: entityId("ACT", store.activities.length + 1),
    title,
    description,
    detail,
    date: isoDate()
  };
  store.activities.unshift(activity);
  store.activities = store.activities.slice(0, 20);
}

function entityId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

function suggestCode(prefix, index) {
  return `${prefix}-${isoDate().replaceAll("-", "")}-${String(index).padStart(3, "0")}`;
}

function suggestTraceCode(index) {
  return `TRACE-${isoDate().replaceAll("-", "")}-${String(index).padStart(4, "0")}`;
}

function buildTraceQueryUrl(code) {
  try {
    const url = new URL(TRACE_QUERY_PAGE, window.location.href);
    url.searchParams.set("code", code);
    return url.toString();
  } catch (error) {
    return `${TRACE_QUERY_PAGE}?code=${encodeURIComponent(code)}`;
  }
}

function indexBy(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function groupBy(items, key) {
  return items.reduce((map, item) => {
    const mapKey = item[key];
    if (!map.has(mapKey)) {
      map.set(mapKey, []);
    }
    map.get(mapKey).push(item);
    return map;
  }, new Map());
}

function uniqueCount(items, key) {
  return new Set((items || []).map((item) => item && item[key]).filter(Boolean)).size;
}

function completionScore(values) {
  const valid = values.filter((item) => {
    if (typeof item === "number") {
      return Number.isFinite(item) && item > 0;
    }
    return Boolean(item);
  }).length;
  return Math.round((valid / values.length) * 100);
}

function sortByDateDesc(key) {
  return (left, right) => new Date(right[key] || 0).getTime() - new Date(left[key] || 0).getTime();
}

function sumLengths(groups) {
  return groups.reduce((sum, group) => sum + group.length, 0);
}

function sumNumbers(numbers) {
  return numbers.reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function formatDecimal(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: number % 1 === 0 ? 0 : 1 }).format(number);
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function isoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatPeriod(start, end) {
  if (!start && !end) {
    return "--";
  }
  if (start && end) {
    return `${start} 至 ${end}`;
  }
  return start || end || "--";
}

function compactAddress(address, detail) {
  return [address, detail].filter(Boolean).join(" · ") || "--";
}

function truncateText(text, maxLength) {
  const string = String(text || "");
  if (string.length <= maxLength) {
    return string;
  }
  return `${string.slice(0, maxLength)}...`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeValues(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]));
}

function getValue(element) {
  return element ? String(element.value || "").trim() : "";
}

function fillIfEmpty(element, value) {
  if (!element || element.value) {
    return;
  }
  element.value = value == null ? "" : String(value);
}

function formatActivityTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;

  return DATE_DISPLAY.format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function readTraceMapCoordinates(record) {
  const lng = parseOptionalCoordinate(record && record.longitude, 73, 135);
  const lat = parseOptionalCoordinate(record && record.latitude, 18, 54);
  if (lng === null || lat === null) {
    return null;
  }
  return { lng, lat };
}

function formatCoordinateText(longitude, latitude) {
  const coordinates = readTraceMapCoordinates({ longitude, latitude });
  if (!coordinates) {
    return "未设置坐标";
  }
  return `${coordinates.lng.toFixed(6)}, ${coordinates.lat.toFixed(6)}`;
}

function parseOptionalCoordinate(value, min, max) {
  if (value === "" || value == null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

function renderBaseMap(record) {
  const coordinates = readTraceMapCoordinates(record);
  return `
    <div class="subsection">
      <div class="trace-map-card">
        <div class="trace-map-head">
          <div>
            <h4>基地地图</h4>
            <p>${escapeHtml(record.addressLine || record.address || "--")}</p>
          </div>
          <span class="chip neutral">${escapeHtml(record.coordinateText || formatCoordinateText(record.longitude, record.latitude))}</span>
        </div>
        <div class="trace-map-preview" data-trace-map-preview data-name="${escapeAttribute(record.name || "")}" data-address="${escapeAttribute(record.address || "")}" data-lng="${escapeAttribute(coordinates ? coordinates.lng.toFixed(6) : "")}" data-lat="${escapeAttribute(coordinates ? coordinates.lat.toFixed(6) : "")}">
          <div class="trace-live-map-state">地图加载中...</div>
        </div>
      </div>
    </div>
  `;
}

function renderPhotoGallery(record, title = "现场照片") {
  const photos = normalizeTracePhotoList(record.photos);
  if (!photos.length) return "";
  return `
    <div class="subsection">
      <div class="subsection-head">
        <h4>${escapeHtml(title)}</h4>
        <span class="chip neutral">${photos.length} 张</span>
      </div>
      <div class="detail-photo-grid">
        ${photos.map((photo) => `
          <figure class="detail-photo-card">
            <img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.name)}">
            <figcaption>${escapeHtml(photo.name)}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}


function renderBaseMapEditor() {
  const config = getTraceMapConfig();
  const mapReady = Boolean(config.tk);
  const emptyMessage = mapReady ? "地图加载中..." : "未配置天地图 Key，当前仍可手动填写经纬度。";
  return `
    <section class="map-editor-card" data-base-map-editor>
      <div class="form-section-head">
        <h4>卫星定位</h4>
      </div>
      <div class="map-toolbar">
        <input class="map-search-input" type="search" placeholder="搜索地址或地名" data-map-search-input ${mapReady ? "" : "disabled"}>
        <button class="button secondary map-search-button" type="button" data-map-search ${mapReady ? "" : "disabled"}>搜索</button>
      </div>
      <div class="trace-live-map" data-trace-map-editor-canvas>
        <div class="trace-live-map-state" data-trace-map-editor-empty>${emptyMessage}</div>
      </div>
      <div class="map-editor-note">点击地图即可回填经纬度；保留我们自己的地图风格和展示方式。</div>
    </section>
  `;
}

function getTraceMapConfig() {
  const runtimeConfig = window.TRACE_MAP_CONFIG || {};
  return {
    ...TRACE_MAP_CONFIG_DEFAULTS,
    ...runtimeConfig
  };
}

async function loadTraceMapSdk() {
  const config = getTraceMapConfig();
  if (!config.tk) {
    return Promise.reject(new Error("missing map token"));
  }
  if (window.T && typeof window.T.Map === "function") {
    return Promise.resolve();
  }
  if (TRACE_MAP_RUNTIME.sdkPromise) {
    return TRACE_MAP_RUNTIME.sdkPromise;
  }

  TRACE_MAP_RUNTIME.sdkPromise = new Promise((resolve, reject) => {
    const waitForReady = () => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.T && typeof window.T.Map === "function") {
          window.clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > 12000) {
          window.clearInterval(timer);
          TRACE_MAP_RUNTIME.sdkPromise = null;
          reject(new Error("map sdk timeout"));
        }
      }, 60);
    };

    let script = document.getElementById(TRACE_MAP_SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = TRACE_MAP_SCRIPT_ID;
      script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(config.tk)}`;
      script.async = true;
      script.dataset.loaded = "false";
      document.head.appendChild(script);
    }
    if (script.dataset.loaded === "true") {
      waitForReady();
      return;
    }

    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      waitForReady();
    }, { once: true });
    script.addEventListener("error", () => {
      TRACE_MAP_RUNTIME.sdkPromise = null;
      reject(new Error("map sdk load failed"));
    }, { once: true });
  });

  return TRACE_MAP_RUNTIME.sdkPromise;
}

async function geocodeTraceAddress(keyword) {
  const config = getTraceMapConfig();
  const url = `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(JSON.stringify({ keyWord: keyword }))}&tk=${encodeURIComponent(config.tk)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data && data.location) {
    return {
      lng: Number(data.location.lon),
      lat: Number(data.location.lat)
    };
  }
  throw new Error("未找到对应地址");
}

async function reverseGeocodeTraceLocation(lng, lat) {
  const config = getTraceMapConfig();
  const payload = `{\'lon\':${lng},\'lat\':${lat},\'ver\':1}`;
  const url = `https://api.tianditu.gov.cn/geocoder?postStr=${encodeURIComponent(payload)}&type=geocode&tk=${encodeURIComponent(config.tk)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status === "0" || data.status === 0) {
    return data.result.formatted_address || "";
  }
  throw new Error("无法反查地址");
}

function bindBaseTraceMap(root, dialog) {
  const form = root.querySelector('form[data-form-kind="primary"]');
  if (!form) {
    return;
  }
  const section = form.querySelector("[data-base-map-editor]");
  const addressInput = form.querySelector("[data-map-address-input]");
  const longitudeInput = form.querySelector("[data-map-longitude-input]");
  const latitudeInput = form.querySelector("[data-map-latitude-input]");
  const searchInput = form.querySelector("[data-map-search-input]");
  const searchButtons = form.querySelectorAll("[data-map-search]");
  const openMapButton = form.querySelector("[data-open-map-search]");
  const mapCanvas = form.querySelector("[data-trace-map-editor-canvas]");
  const emptyState = form.querySelector("[data-trace-map-editor-empty]");
  const config = getTraceMapConfig();
  const hasKey = Boolean(config.tk);

  const state = {
    map: null,
    marker: null,
    loading: false
  };

  const getTypedCoordinates = () => {
    const lng = parseOptionalCoordinate(longitudeInput ? longitudeInput.value : "", 73, 135);
    const lat = parseOptionalCoordinate(latitudeInput ? latitudeInput.value : "", 18, 54);
    if (lng === null || lat === null) {
      return null;
    }
    return { lng, lat };
  };

  const placeMarker = async (lng, lat, zoom = config.detailZoom) => {
    if (!state.map) {
      return;
    }
    const point = new window.T.LngLat(lng, lat);
    if (state.marker) {
      state.map.removeOverLay(state.marker);
    }
    state.marker = new window.T.Marker(point);
    state.map.addOverLay(state.marker);
    state.map.centerAndZoom(point, zoom);
    if (longitudeInput) {
      longitudeInput.value = lng.toFixed(6);
    }
    if (latitudeInput) {
      latitudeInput.value = lat.toFixed(6);
    }
  };

  const ensureMap = async () => {
    if (!mapCanvas || !hasKey) {
      return null;
    }
    if (state.map) {
      if (typeof state.map.checkResize === "function") {
        state.map.checkResize();
      }
      return state.map;
    }
    if (state.loading) {
      return null;
    }
    state.loading = true;
    try {
      await loadTraceMapSdk();
      if (emptyState) {
        emptyState.hidden = true;
      }
      state.map = new window.T.Map(mapCanvas);
      const coordinates = getTypedCoordinates();
      const center = coordinates || {
        lng: config.defaultCenter[0],
        lat: config.defaultCenter[1]
      };
      state.map.centerAndZoom(new window.T.LngLat(center.lng, center.lat), coordinates ? config.detailZoom : config.defaultZoom);
      if (typeof state.map.enableScrollWheelZoom === "function") {
        state.map.enableScrollWheelZoom();
      }
      state.map.addEventListener("click", async (event) => {
        const clicked = event && (event.lnglat || event.lngLat);
        if (!clicked) {
          return;
        }
        const lng = Number(clicked.getLng ? clicked.getLng() : clicked.lng);
        const lat = Number(clicked.getLat ? clicked.getLat() : clicked.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return;
        }
        await placeMarker(lng, lat, config.searchZoom);
        try {
          const address = await reverseGeocodeTraceLocation(lng, lat);
          if (addressInput) {
            addressInput.value = address;
          }
          if (searchInput) {
            searchInput.value = address;
          }
        } catch (error) {
          // ignore reverse geocode failure
        }
      });

      if (coordinates) {
        await placeMarker(coordinates.lng, coordinates.lat);
      }
      return state.map;
    } finally {
      state.loading = false;
    }
  };

  const searchAddress = async () => {
    const keyword = (searchInput && searchInput.value.trim()) || (addressInput && addressInput.value.trim());
    if (!keyword || !hasKey) {
      return;
    }
    if (addressInput) {
      addressInput.value = keyword;
    }
    const map = await ensureMap();
    if (!map) {
      return;
    }
    try {
      const coordinates = await geocodeTraceAddress(keyword);
      await placeMarker(coordinates.lng, coordinates.lat, config.searchZoom);
    } catch (error) {
      window.alert("未找到对应地址，请尝试更完整的地区关键词。");
    }
  };

  if (addressInput && searchInput) {
    addressInput.addEventListener("input", () => {
      if (document.activeElement !== searchInput) {
        searchInput.value = addressInput.value;
      }
    });
    searchInput.addEventListener("input", () => {
      if (document.activeElement !== addressInput) {
        addressInput.value = searchInput.value;
      }
    });
  }

  searchButtons.forEach((button) => button.addEventListener("click", searchAddress));
  if (openMapButton) {
    openMapButton.addEventListener("click", async () => {
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      await searchAddress();
    });
  }

  [longitudeInput, latitudeInput].forEach((input) => {
    if (!input) {
      return;
    }
    input.addEventListener("change", async () => {
      const coordinates = getTypedCoordinates();
      const map = await ensureMap();
      if (coordinates && map) {
        await placeMarker(coordinates.lng, coordinates.lat);
      }
    });
  });

  form._baseTraceMapController = {
    activate: async () => {
      if (!hasKey) {
        return;
      }
      await ensureMap();
    }
  };

  if (!hasKey && emptyState) {
    emptyState.textContent = "未配置天地图 Key，当前仍可手动填写经纬度。";
  }

  if (dialog) {
    dialog.addEventListener("close", () => {
      if (section && document.body.classList.contains("has-photo-window")) {
        document.body.classList.remove("has-photo-window");
      }
    });
  }
}

function activateBaseTraceMap(root) {
  const form = root.querySelector('form[data-form-kind="primary"]');
  if (form && form._baseTraceMapController) {
    form._baseTraceMapController.activate();
  }
}

function bindPhotoUpload(root, dialog, kind = "primary") {
  const form = root.querySelector(`form[data-form-kind="${kind}"]`);
  if (!form) return;
  const storeInput = form.querySelector("[data-photo-store]");
  const openButton = form.querySelector("[data-open-photo-window]");
  const shell = form.querySelector("[data-photo-window]");
  const closeButtons = form.querySelectorAll("[data-close-photo-window]");
  const photoInput = form.querySelector("[data-photo-input]");
  const grid = form.querySelector("[data-photo-grid]");
  const dialogGrid = form.querySelector("[data-photo-dialog-grid]");
  const countPill = form.querySelector("[data-photo-count]");
  if (!storeInput || !shell || !grid || !dialogGrid) return;

  const maxPhotos = 12;

  const state = {
    photos: normalizeTracePhotoList(storeInput.value),
    pendingTask: Promise.resolve()
  };

  const syncStore = () => {
    storeInput.value = JSON.stringify(state.photos);
    if (countPill) countPill.textContent = `${state.photos.length} 张`;
  };

  const renderGrid = (container, removable) => {
    if (!state.photos.length) {
      container.innerHTML = '<div class="photo-empty">暂未添加照片</div>';
      return;
    }
    container.innerHTML = state.photos.map((photo) => `
      <figure class="photo-card ${removable ? "is-removable" : ""}">
        <img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.name)}">
        ${removable ? `<button class="photo-remove" type="button" data-remove-photo="${escapeAttribute(photo.id)}">✕</button>` : ""}
        <figcaption>${escapeHtml(photo.name)}</figcaption>
      </figure>
    `).join("");
  };

  const render = () => {
    syncStore();
    renderGrid(grid, false);
    renderGrid(dialogGrid, true);
  };

  const openWindow = () => {
    shell.hidden = false;
    document.body.classList.add("has-photo-window");
  };

  const closeWindow = () => {
    shell.hidden = true;
    document.body.classList.remove("has-photo-window");
  };

  const appendPhotos = async (files) => {
    const candidates = Array.from(files || []).filter((file) => String(file.type || "").startsWith("image/"));
    const room = Math.max(0, maxPhotos - state.photos.length);
    if (!candidates.length || !room) return;
    const nextPhotos = await Promise.all(candidates.slice(0, room).map(createTracePhotoRecord));
    state.photos = [...state.photos, ...nextPhotos];
    render();
  };

  if (openButton) openButton.addEventListener("click", openWindow);
  closeButtons.forEach((button) => button.addEventListener("click", closeWindow));
  shell.addEventListener("click", (event) => {
    if (event.target === shell || event.target.closest("[data-close-photo-window]")) closeWindow();
  });

  if (photoInput) {
    photoInput.addEventListener("change", (event) => {
      const files = event.target.files;
      state.pendingTask = appendPhotos(files).finally(() => {
        photoInput.value = "";
      });
    });
  }

  dialogGrid.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-photo]");
    if (!removeButton) return;
    const photoId = removeButton.dataset.removePhoto || "";
    state.photos = state.photos.filter((photo) => photo.id !== photoId);
    render();
  });

  if (dialog) {
    dialog.addEventListener("close", closeWindow);
  }

  form._photoController = {
    waitUntilReady: async () => {
      await state.pendingTask;
    }
  };

  render();
}

function bindBaseTracePreviewMaps(root) {
  const previews = root.querySelectorAll("[data-trace-map-preview]");
  previews.forEach((preview) => {
    mountBaseTracePreview(preview);
  });
}

async function mountBaseTracePreview(container) {
  const config = getTraceMapConfig();
  const coordinates = readTraceMapCoordinates({
    longitude: container.dataset.lng,
    latitude: container.dataset.lat
  });

  if (!config.tk) {
    container.innerHTML = '<div class="trace-live-map-state">未配置天地图 Key，当前仅展示坐标信息。</div>';
    container.classList.add("is-fallback");
    return;
  }

  try {
    await loadTraceMapSdk();
    container.innerHTML = "";
    const center = coordinates || { lng: config.defaultCenter[0], lat: config.defaultCenter[1] };
    const map = new window.T.Map(container);
    map.centerAndZoom(new window.T.LngLat(center.lng, center.lat), coordinates ? config.detailZoom : config.defaultZoom);
    if (coordinates) {
      map.addOverLay(new window.T.Marker(new window.T.LngLat(coordinates.lng, coordinates.lat)));
    }
    if (typeof map.disableScrollWheelZoom === "function") {
      map.disableScrollWheelZoom();
    }
    if (typeof map.disableDoubleClickZoom === "function") {
      map.disableDoubleClickZoom();
    }
  } catch (error) {
    container.innerHTML = '<div class="trace-live-map-state">地图加载失败，请检查天地图配置。</div>';
    container.classList.add("is-fallback");
  }
}

function normalizeTracePhotoList(value) {
  let parsed = value;
  if (typeof value === "string") {
    if (!value.trim()) {
      return [];
    }
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `photo-${index + 1}`,
        name: `基地照片 ${index + 1}`,
        url: item
      };
    }
    if (!item || !item.url) {
      return null;
    }
    return {
      id: item.id || `photo-${index + 1}`,
      name: item.name || `基地照片 ${index + 1}`,
      url: item.url
    };
  }).filter(Boolean);
}

async function createTracePhotoRecord(file) {
  const url = await compressTracePhoto(file);
  const name = String(file && file.name ? file.name : "基地照片").replace(/\.[a-z0-9]+$/i, "");
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || "基地照片",
    url
  };
}

async function compressTracePhoto(file) {
  const source = await readFileAsDataUrl(file);
  try {
    const image = await loadImageFromDataUrl(source);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const maxEdge = Math.max(width, height);
    if (!maxEdge || maxEdge <= BASE_TRACE_PHOTO_MAX_EDGE) {
      return source;
    }
    const scale = BASE_TRACE_PHOTO_MAX_EDGE / maxEdge;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", BASE_TRACE_PHOTO_QUALITY);
  } catch (error) {
    return source;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}
