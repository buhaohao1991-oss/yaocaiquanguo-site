const NAV_ITEMS = [
  { id: "home", href: "index.html", title: "首页", subtitle: "总览与待办" },
  { id: "base-trace", href: "base-trace.html", title: "基地溯源", subtitle: "种植基地主档" },
  { id: "seed-trace", href: "seed-trace.html", title: "种源备案", subtitle: "种苗与鉴定" },
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
const BASE_DETAIL_PAGE = "base-detail.html";
const SEED_DETAIL_PAGE = "seed-detail.html";
const TRACE_PUBLIC_SNAPSHOT_PARAM = "p";
const TRACE_MAP_PAGE_ID = "base-trace";
const TRACE_MAP_SCRIPT_ID = "trace-map-sdk";
const TRACE_QR_LIBRARY_URL = "assets/vendor/qrcode.min.js";
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
const TRACE_QR_RUNTIME = {
  libraryPromise: null
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
    tableTitle: "",
    searchPlaceholder: "搜索基地名称、负责人、药材或地区",
    getViews: (shared) => shared.views.bases,
    getStats: (shared, views) => [
      { label: "基地档案", value: String(views.length), tone: "primary" },
      { label: "已完备主档", value: String(views.filter((item) => item.readiness >= 85).length), tone: "good" },
      { label: "已关联种源", value: String(views.filter((item) => item.seedCount > 0).length), tone: "normal" }
    ],
    searchText: (view) => [view.name, view.code, view.manager, view.herb, view.addressLine].join(" "),
    columns: [
      { label: "基地名称", render: (view) => titleOnlyCell(view.name) },
      { label: "种植药材", render: (view) => view.herb },
      { label: "负责人", render: (view) => view.manager },
      { label: "面积", render: (view) => view.areaText },
      { label: "下游链路", render: (view) => metricMini(`${view.seedCount} 种源 / ${view.plantCount} 种植`) },
      { label: "操作", render: (view) => tableActionGroup([
        detailPageActionButton(buildBaseDetailUrl(view.id)),
        editActionButton(view.id),
        deleteActionButton(view.id)
      ]) }
    ],
    inlineDetail: false,
    renderDetail: (view, shared) => renderBaseDetail(view, shared)
  },
  "seed-trace": {
    kind: "entity",
    title: "种源备案",
    kicker: "SEED SOURCE",
    subtitle: "围绕种源批次、基地归属、来源方式和鉴定报告建立可回查的种苗档案。",
    actionLabel: "新增种源批次",
    tableTitle: "",
    searchPlaceholder: "搜索种源批次、基地、药材或来源方式",
    getViews: (shared) => shared.views.seeds,
    getStats: (shared, views) => [
      { label: "种源批次", value: String(views.length), tone: "primary" },
      { label: "已上传鉴定报告", value: String(views.filter((item) => item.certificateStatus === "已归档" && item.reportPhotoCount > 0).length), tone: "good" },
      { label: "进入种植", value: String(views.filter((item) => item.plantCount > 0).length), tone: "normal" }
    ],
    searchText: (view) => [view.batchNo, view.herb, view.baseName, view.sourceType, view.breedMaterial, view.brand].join(" "),
    columns: [
      { label: "种源批次", render: (view) => titleOnlyCell(view.batchNo) },
      { label: "关联基地", render: (view) => view.baseName },
      { label: "药材名称", render: (view) => view.herb || "--" },
      { label: "来源", render: (view) => `${view.sourceType} / ${view.breedMaterial}` },
      { label: "状态", render: (view) => statusPill(view.statusLabel, view.statusTone) },
      { label: "操作", render: (view) => tableActionGroup([
        detailPageActionButton(buildSeedDetailUrl(view.id)),
        editActionButton(view.id),
        deleteActionButton(view.id)
      ]) }
    ],
    inlineDetail: false,
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
    searchMode: "toolbar",
    searchPlaceholder: "搜索溯源名称、溯源码、药材或仓库",
    searchCompactPlaceholder: "按溯源码、药材或仓库检索",
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
    searchMode: "toolbar",
    searchPlaceholder: "搜索仓库名称、负责人、地区或条件",
    searchCompactPlaceholder: "按仓库、负责人或地区检索",
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
    document.title = "中药材溯源平台";
    root.innerHTML = renderHomePage(shared);
    bindHome(root, shared);
    return;
  }

  if (pageId === "base-detail") {
    const baseId = new URLSearchParams(window.location.search).get("id") || "";
    const view = shared.views.bases.find((item) => item.id === baseId) || null;
    document.title = view ? `中药材溯源平台 - ${view.name}` : "中药材溯源平台 - 基地详情";
    root.innerHTML = renderBaseDetailPage(shared, view);
    bindBaseDetailPage(root, shared, view);
    return;
  }

  if (pageId === "seed-detail") {
    const seedId = new URLSearchParams(window.location.search).get("id") || "";
    const view = shared.views.seeds.find((item) => item.id === seedId) || null;
    document.title = view ? `中药材溯源平台 - ${view.batchNo}` : "中药材溯源平台 - 种源详情";
    root.innerHTML = renderSeedDetailPage(shared, view);
    bindSeedDetailPage(root, shared, view);
    return;
  }

  const config = PAGE_CONFIGS[pageId];
  if (!config) {
    root.innerHTML = renderHomePage(shared);
    bindHome(root, shared);
    return;
  }

  document.title = `中药材溯源平台 - ${config.title}`;
  const views = config.getViews(shared);
  const filtered = filterRecords(views, APP_STATE.query, config.searchText);
  const selected = pickSelectedRecord(filtered, views, APP_STATE.selectedId);
  root.innerHTML = config.kind === "compound"
    ? renderCompoundPage(pageId, config, shared, views, filtered, selected)
    : renderEntityPage(pageId, config, shared, views, filtered, selected);
  bindModule(root, pageId, config, shared, selected);
}

function renderHomePage(shared) {
  const modules = NAV_ITEMS.filter((item) => item.id !== "home");

  return `
    <div class="app-shell">
      ${renderSidebar("home", shared)}
      <main class="main home-main">
        <section class="home-stage">
          ${renderHomeHero()}
        </section>

        <section class="module-card-grid home-module-grid">
          ${modules.map((item) => renderHomeModuleCard(item, shared)).join("")}
        </section>
      </main>
    </div>
  `;
}

function renderHomeHero() {
  return `
    <div class="home-stage-grid">
      <div class="home-stage-brand">
        <div class="home-stage-emblem brand-mark">
          ${renderBrandMarkSvg()}
        </div>
        <div class="home-stage-copy">
          <span class="home-stage-kicker">中药材溯源平台</span>
          <strong>溯源工作台</strong>
          <small>基地 / 农事 / 采收 / 工艺 / 赋码</small>
        </div>
      </div>
    </div>
  `;
}

function renderEntityPage(pageId, config, shared, allViews, filteredViews, selected) {
  const stats = config.getStats(shared, allViews);
  const tableTitle = config.tableTitle === undefined ? `${config.title}台账` : config.tableTitle;
  const hasHeadline = Boolean(tableTitle || config.searchMode === "toolbar");
  const selectedDetail = config.inlineDetail === false ? null : selected;
  return `
    <div class="app-shell">
      ${renderSidebar(pageId, shared)}
      <main class="main module-main">
        ${renderModuleHeader(pageId, config, stats)}

        <section class="panel table-panel">
          ${hasHeadline ? `
            <div class="panel-headline ${config.searchMode === "toolbar" ? "with-toolbar" : ""}">
              ${tableTitle ? `<h2>${escapeHtml(tableTitle)}</h2>` : `<div class="panel-headline-spacer" aria-hidden="true"></div>`}
              ${renderPanelSearch(config)}
            </div>
          ` : ""}
          <div class="panel-body">
            ${filteredViews.length
              ? renderTable(config.columns, filteredViews, selected, {
                expandedContent: selectedDetail ? config.renderDetail(selectedDetail, shared) : "",
                expandedLabel: `${config.title}详情`
              })
              : renderEmptyState(config.title, allViews.length)}
          </div>
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
      ${renderSidebar(pageId, shared)}
      <main class="main module-main">
        ${renderModuleHeader(pageId, config, stats)}

        <section class="panel table-panel">
          <div class="panel-headline">
            <h2>${pageId === "farming-trace" ? "种植过程主线" : "加工过程主线"}</h2>
          </div>
          <div class="panel-body">
            ${filteredViews.length
              ? renderTable(config.columns, filteredViews, selected, {
                expandedContent: selected ? config.renderDetail(selected, shared) : "",
                expandedLabel: `${config.title}详情`
              })
              : renderEmptyState(config.title, allViews.length)}
          </div>
        </section>

        <section class="panel">
          <div class="panel-headline">
            <h2>${pageId === "farming-trace" ? "农事记录" : "工艺步骤"}</h2>
            <div class="panel-tools">
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
                    <strong>${pageId === "farming-trace" ? "暂无农事记录" : "暂无工艺步骤"}</strong>
                  </div>
                `)
              : `
                <div class="empty-state compact">
                  <strong>请选择主线记录</strong>
                </div>
              `}
          </div>
        </section>

        ${renderPageDialogs(pageId, shared, selected)}
      </main>
    </div>
  `;
}

function renderModuleHeader(pageId, config, stats) {
  const navItem = NAV_ITEMS.find((item) => item.id === pageId);
  const hasStats = shouldShowStats(stats);
  return `
    <section class="page-hero module-header ${hasStats ? "has-stats" : "no-stats"}">
      <div class="page-copy">
        <span class="page-kicker">中药材溯源平台</span>
        <h1>${escapeHtml(config.title)}</h1>
        <p>${escapeHtml((navItem && navItem.subtitle) || config.title)}</p>
      </div>
      <div class="page-hero-side ${hasStats ? "" : "is-compact"}">
        <div class="page-hero-actions">
          <button class="button primary" type="button" data-open-dialog="primary">${escapeHtml(config.actionLabel)}</button>
        </div>
        ${hasStats ? `
          <div class="stat-grid">
            ${stats.map((stat) => renderStatCard(stat)).join("")}
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function renderBaseDetailPage(shared, view) {
  const actionButtons = view ? `
    <div class="page-hero-actions detail-page-actions">
      <a class="button ghost" href="base-trace.html">返回</a>
      <button class="button primary" type="button" data-edit-record="${escapeAttribute(view.id)}">编辑基地档案</button>
    </div>
  ` : `
    <div class="page-hero-actions detail-page-actions">
      <a class="button ghost" href="base-trace.html">返回</a>
    </div>
  `;

  return `
    <div class="app-shell">
      ${renderSidebar("base-trace", shared)}
      <main class="main module-main detail-page-main">
        <section class="page-hero module-header no-stats detail-page-header">
          <div class="page-copy">
            <span class="page-kicker">中药材溯源平台</span>
            <h1>${escapeHtml(view ? view.name : "未找到基地档案")}</h1>
            <p>${escapeHtml(view
              ? [view.code, view.herb, view.addressLine].filter(Boolean).join(" · ")
              : "当前基地记录不存在，可能已被删除。")}</p>
          </div>
          <div class="page-hero-side is-compact">
            ${actionButtons}
          </div>
        </section>

        ${view ? `
          <section class="panel detail-panel detail-page-panel">
            <div class="panel-body">
              ${renderBaseDetailBody(view, shared)}
            </div>
          </section>
          ${renderPageDialogs("base-detail", shared, view)}
        ` : `
          <section class="panel detail-page-panel">
            <div class="panel-body">
              ${renderEmptyState("基地档案", 0)}
            </div>
          </section>
        `}
      </main>
    </div>
  `;
}

function renderSeedDetailPage(shared, view) {
  const actionButtons = view ? `
    <div class="page-hero-actions detail-page-actions">
      <a class="button ghost" href="seed-trace.html">返回</a>
      <button class="button primary" type="button" data-edit-record="${escapeAttribute(view.id)}">编辑种源批次</button>
    </div>
  ` : `
    <div class="page-hero-actions detail-page-actions">
      <a class="button ghost" href="seed-trace.html">返回</a>
    </div>
  `;

  return `
    <div class="app-shell">
      ${renderSidebar("seed-trace", shared)}
      <main class="main module-main detail-page-main">
        <section class="page-hero module-header no-stats detail-page-header">
          <div class="page-copy">
            <span class="page-kicker">中药材溯源平台</span>
            <h1>${escapeHtml(view ? view.batchNo : "未找到种源批次")}</h1>
            <p>${escapeHtml(view
              ? [view.herb, view.baseName, `${view.sourceType} / ${view.breedMaterial}`].filter(Boolean).join(" · ")
              : "当前种源记录不存在，可能已被删除。")}</p>
          </div>
          <div class="page-hero-side is-compact">
            ${actionButtons}
          </div>
        </section>

        ${view ? `
          <section class="panel detail-panel detail-page-panel">
            <div class="panel-body">
              ${renderSeedDetailBody(view, shared)}
            </div>
          </section>
          ${renderPageDialogs("seed-detail", shared, view)}
        ` : `
          <section class="panel detail-page-panel">
            <div class="panel-body">
              ${renderEmptyState("种源批次", 0)}
            </div>
          </section>
        `}
      </main>
    </div>
  `;
}

function renderPanelSearch(config) {
  if (config.searchMode !== "toolbar") {
    return "";
  }

  return `
    <div class="panel-tools panel-tools-search">
      <label class="inline-search">
        <input
          type="search"
          value="${escapeAttribute(APP_STATE.query)}"
          placeholder="${escapeAttribute(config.searchCompactPlaceholder || config.searchPlaceholder || "输入关键词检索")}"
          data-search-input
        >
      </label>
    </div>
  `;
}

function renderTraceQueryPage(shared) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || "";
  const publicSnapshotToken = params.get(TRACE_PUBLIC_SNAPSHOT_PARAM) || "";
  const publicSnapshot = publicSnapshotToken ? decodePublicTraceSnapshot(publicSnapshotToken) : null;
  const target = code ? shared.views.qrCodes.find((item) => item.traceCode === code) : null;
  const traceData = publicSnapshot
    ? buildPublicTraceDetailFromSnapshot(publicSnapshot, code, publicSnapshotToken)
    : (target ? buildPublicTraceDetailFromView(target, shared) : null);
  const options = shared.views.qrCodes.slice(0, 12);

  return `
    <main class="trace-public">
      <section class="trace-public-shell">
        <header class="trace-public-header">
          <a class="public-back" href="trace-code-management.html">返回赋码台账</a>
          <span class="public-kicker">中药材溯源码查询页</span>
        </header>

        ${traceData ? renderTracePublicDetail(traceData) : `
          <section class="public-empty-card">
            <h1>${code ? "未找到溯源码" : "选择溯源码"}</h1>
            <p>${code ? "请返回赋码页处理。" : "从后台选择一条码查看。"}</p>
            ${options.length ? `
              <div class="public-code-grid">
                ${options.map((item) => `
                  <a class="public-code-card" href="${escapeAttribute(`${TRACE_QUERY_PAGE}?code=${encodeURIComponent(item.traceCode)}`)}">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${escapeHtml(item.traceCode)}</span>
                    <em>${escapeHtml(item.materialName)}</em>
                  </a>
                `).join("")}
              </div>
            ` : `
              <div class="empty-state compact">
                <strong>暂无溯源码</strong>
              </div>
            `}
          </section>
        `}
      </section>
    </main>
  `;
}

function renderTracePublicDetail(traceData) {
  const farmItems = Array.isArray(traceData.farmItems) ? traceData.farmItems : [];
  const stepItems = Array.isArray(traceData.stepItems) ? traceData.stepItems : [];
  return `
    <section class="public-hero">
      <div class="public-hero-copy">
        <span class="public-badge">${escapeHtml(traceData.traceCode)}</span>
        <h1>${escapeHtml(traceData.name)}</h1>
        <p>${escapeHtml(traceData.materialName)} · ${escapeHtml(traceData.baseName)} · ${escapeHtml(traceData.warehouseName)}</p>
        <div class="public-stage-strip">
          <span>${escapeHtml(traceData.baseName)}</span>
          <span>${escapeHtml(traceData.seedBatch || "--")}</span>
          <span>${escapeHtml(traceData.plantBatch || "--")}</span>
          <span>${escapeHtml(traceData.harvestBatch || "--")}</span>
          <span>${escapeHtml(traceData.processBatch || "--")}</span>
          <span>${escapeHtml(traceData.warehouseName || "--")}</span>
        </div>
      </div>
      <div class="public-meta-card">
        <strong>查询状态</strong>
        <span>当前链路已可回查</span>
        <div class="public-meta-grid">
          <article>
            <label>药材</label>
            <strong>${escapeHtml(traceData.materialName)}</strong>
          </article>
          <article>
            <label>仓库</label>
            <strong>${escapeHtml(traceData.warehouseName)}</strong>
          </article>
          <article>
            <label>采收批次</label>
            <strong>${escapeHtml(traceData.harvestBatch || "--")}</strong>
          </article>
          <article>
            <label>加工批次</label>
            <strong>${escapeHtml(traceData.processBatch || "--")}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="public-grid">
      <section class="public-panel">
        <div class="public-panel-head">
          <span>基地与种源</span>
          <h2>源头信息</h2>
        </div>
        <div class="public-info-grid">
          ${renderPublicInfoCard("基地档案", [
            traceData.baseName,
            traceData.baseCode,
            traceData.baseAddress
          ])}
          ${renderPublicInfoCard("种源备案", [
            traceData.seedBatch || "--",
            traceData.seedHerb || "--",
            traceData.seedSourceLabel || traceData.seedBrand || "--"
          ])}
        </div>
        ${traceData.baseCoordinates ? `
          <div class="trace-map-preview public-map" data-trace-map-preview data-name="${escapeAttribute(traceData.baseName || "")}" data-address="${escapeAttribute(traceData.baseAddress || "")}" data-lng="${escapeAttribute(traceData.baseCoordinates.lng.toFixed(6))}" data-lat="${escapeAttribute(traceData.baseCoordinates.lat.toFixed(6))}">
            <div class="trace-live-map-state">地图加载中...</div>
          </div>
        ` : ""}
      </section>

      <section class="public-panel">
        <div class="public-panel-head">
          <span>过程留痕</span>
          <h2>种植与农事</h2>
        </div>
        ${farmItems.length ? `
          <div class="public-timeline">
            ${farmItems.map((item) => `
              <article class="public-timeline-item">
                <strong>${escapeHtml(item.workName || "--")}</strong>
                <span>${escapeHtml(item.periodText || "--")}</span>
                <p>${escapeHtml(item.detailText || item.operateDetail || item.note || "已记录农事过程")}</p>
              </article>
            `).join("")}
          </div>
        ` : `
          <div class="public-empty">当前未补充农事记录</div>
        `}
      </section>

      <section class="public-panel">
        <div class="public-panel-head">
          <span>采收与加工</span>
          <h2>批次加工链</h2>
        </div>
        <div class="public-info-grid">
          ${renderPublicInfoCard("采收批次", [
            traceData.harvestName || "--",
            traceData.harvestBatch || "--",
            `${formatDecimal(traceData.harvestWeight || 0)} kg`
          ])}
          ${renderPublicInfoCard("加工过程", [
            traceData.processName || "--",
            traceData.processBatch || "--",
            `${formatDecimal(traceData.outputCount || 0)} kg`
          ])}
        </div>
        ${stepItems.length ? `
          <div class="public-timeline">
            ${stepItems.map((item) => `
              <article class="public-timeline-item">
                <strong>${escapeHtml(item.name || "--")}</strong>
                <span>${escapeHtml(item.periodText || "--")}</span>
                <p>${escapeHtml(item.detailText || item.stepDetails || item.note || "已记录工艺过程")}</p>
              </article>
            `).join("")}
          </div>
        ` : ""}
      </section>

      <section class="public-panel">
        <div class="public-panel-head">
          <span>仓储落点</span>
          <h2>当前仓储信息</h2>
        </div>
        <div class="public-info-grid">
          ${renderPublicInfoCard("仓库", [
            traceData.warehouseName || "--",
            traceData.warehouseConditions || "--",
            traceData.warehouseMethod || "--"
          ])}
          ${renderPublicInfoCard("查询地址", [
            truncateText(traceData.publicUrl, 52)
          ])}
        </div>
      </section>
    </section>
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

function renderBrandMarkSvg() {
  return `
    <svg viewBox="0 0 64 64" fill="none" class="brand-mark-svg">
      <circle cx="32" cy="32" r="24" fill="#F4F5EF" stroke="#D4D9CF" stroke-width="2"></circle>
      <path d="M32 18V46" stroke="#1D6A53" stroke-width="3.5" stroke-linecap="round"></path>
      <path d="M32 25C25.5 20 19.5 21.5 16 28C22.5 29.5 27 29 32 25Z" fill="#2F8E69"></path>
      <path d="M32 25C38.5 20 44.5 21.5 48 28C41.5 29.5 37 29 32 25Z" fill="#2F8E69"></path>
      <path d="M32 36C26.5 31.5 22 33 19.5 38.5C24.5 40 28 39.5 32 36Z" fill="#5FA884"></path>
      <path d="M32 36C37.5 31.5 42 33 44.5 38.5C39.5 40 36 39.5 32 36Z" fill="#5FA884"></path>
      <path d="M23 46H41" stroke="#97AA9B" stroke-width="2.5" stroke-linecap="round"></path>
    </svg>
  `;
}

function renderHomeModuleCard(item, shared) {
  const count = navCountFor(item.id, shared);
  return `
    <a class="module-card" data-module="${escapeAttribute(item.id)}" href="${escapeAttribute(item.href)}">
      <div class="module-card-head">
        <span class="module-icon">${renderNavIcon(item.id)}</span>
        ${count ? `<span class="module-card-count">${count}</span>` : ""}
      </div>
      <strong class="module-card-title">${escapeHtml(item.title)}</strong>
    </a>
  `;
}

function renderSidebar(activeId, shared) {
  return `
    <aside class="sidebar">
      <nav class="nav-group">
        ${NAV_ITEMS.map((item) => renderSidebarItem(item, activeId, shared)).join("")}
      </nav>
    </aside>
  `;
}

function renderSidebarItem(item, activeId, shared) {
  const count = navCountFor(item.id, shared);
  return `
    <a class="nav-item ${item.id === activeId ? "is-active" : ""}" data-module="${escapeAttribute(item.id)}" href="${escapeAttribute(item.href)}">
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

function renderTable(columns, rows, selected, options = {}) {
  const expandedColspan = Math.max(columns.length, 1);
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const isSelected = Boolean(selected && selected.id === row.id);
            return `
              <tr data-row-id="${escapeAttribute(row.id)}" class="${isSelected ? "is-selected" : ""}">
                ${columns.map((column) => `<td data-label="${escapeAttribute(column.label)}">${column.render(row)}</td>`).join("")}
              </tr>
              ${isSelected && options.expandedContent ? `
                <tr class="row-detail" data-detail-for="${escapeAttribute(row.id)}">
                  <td colspan="${expandedColspan}" class="row-detail-cell" aria-label="${escapeAttribute(options.expandedLabel || "详情")}">
                    <div class="row-detail-shell">
                      ${options.expandedContent}
                    </div>
                  </td>
                </tr>
              ` : ""}
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEmptyState(moduleTitle, totalCount) {
  return `
    <div class="empty-state">
      <strong>${totalCount ? `没有匹配的${escapeHtml(moduleTitle)}` : `暂无${escapeHtml(moduleTitle)}`}</strong>
    </div>
  `;
}

function renderPageDialogs(pageId, shared, selected) {
  if (pageId === "base-trace" || pageId === "base-detail") {
    const draft = readDraft("base-trace");
    return renderDialogShell("primary", draft.recordId ? "编辑基地档案" : "新建基地档案", renderBaseDialog(shared, draft), true);
  }

  if (pageId === "seed-trace" || pageId === "seed-detail") {
    const draft = readDraft("seed-trace");
    return renderDialogShell("primary", draft.recordId ? "编辑种源批次" : "新增种源批次", renderStandardDialogLayout("seed-trace", "primary", shared, draft, selected));
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
    <div class="dialog-map-layout is-base-dialog">
      <div class="dialog-form-column">
        <input type="hidden" name="recordId" value="${escapeAttribute(draft.recordId || "")}">
        ${renderFormSection("基本信息", [
          fieldText("name", "基地名称", "例如：甘肃岷县党参基地", true, draft.name),
          fieldText("code", "基地编号", "例如：BASE-202604-001", true, draft.code || suggestCode("BASE", shared.store.bases.length + 1)),
          fieldText("manager", "基地负责人", "例如：赵青林", true, draft.manager),
          fieldText("herb", "种植药材", "例如：党参", true, draft.herb),
          fieldNumber("areaMu", "面积（亩）", "例如：128", true, draft.areaMu),
          fieldText("address", "所属地区", "例如：甘肃省定西市岷县", true, draft.address, { mapSearch: true }),
          fieldText("detailAddress", "详细地址", "例如：岷阳镇西寨村五社", true, draft.detailAddress, { span: 2 }),
          fieldSelect("baseType", "基地类型", BASE_TYPES, true, draft.baseType, { span: 1 }),
          fieldSelect("cooperationMode", "合作模式", COOPERATION_MODES, true, draft.cooperationMode),
          fieldText("intro", "基地介绍", "一句话说明基地背景、管理标准或产区特点", false, draft.intro, { span: 2 })
        ], { className: "base-section base-basic-section", gridClass: "base-form-grid base-form-grid--3" })}
        ${renderFormSection("定位与环境", [
          fieldNumber("longitude", "经度", "例如：104.037624", false, draft.longitude, { mapLongitude: true }),
          fieldNumber("latitude", "纬度", "例如：34.438215", false, draft.latitude, { mapLatitude: true }),
          fieldNumber("altitude", "海拔（m）", "例如：2310", false, draft.altitude),
          fieldNumber("avgTemp", "年均温（℃）", "例如：13.5", false, draft.avgTemp),
          fieldNumber("soilPh", "土壤 pH", "例如：6.8", false, draft.soilPh),
          fieldNumber("soilEc", "土壤 EC", "例如：0.38", false, draft.soilEc)
        ], { className: "base-section base-env-section", gridClass: "base-form-grid base-form-grid--3" })}
        ${renderBaseMediaSection(draft)}
      </div>
      <aside class="dialog-map-column">
        ${renderBaseMapEditor()}
      </aside>
    </div>
  `;
}

function renderStandardDialogLayout(pageId, kind, shared, draft, selected) {
  const sections = getDialogSections(pageId, kind, shared, draft, selected);
  const hiddenFields = getHiddenDialogFields(pageId, kind, selected);
  const contextState = getFormContextState(pageId, kind, normalizeValues(draft || {}), shared, selected);
  const contextHtml = contextState.variant === "empty" ? "" : contextState.html;
  return `
    <div class="dialog-standard-layout ${contextState.variant === "empty" ? "is-context-empty" : ""}" data-dialog-layout>
      <div class="dialog-standard-main">
        <input type="hidden" name="recordId" value="${escapeAttribute(draft.recordId || "")}">
        ${hiddenFields}
        ${sections.map((section) => renderFormSection(section.title, section.fields)).join("")}
        ${renderDialogAttachmentSections(pageId, kind, draft)}
      </div>
      <aside class="dialog-context ${contextState.variant === "empty" ? "is-hidden" : ""}" data-form-context-shell>
        <div data-form-context>
          ${contextHtml}
        </div>
      </aside>
    </div>
  `;
}

function renderDialogAttachmentSections(pageId, kind, draft) {
  if (pageId === "seed-trace" && kind === "primary") {
    return renderTracePhotoUploadSection({
      title: "种源鉴定报告",
      fieldName: "reportPhotos",
      actionLabel: "增加报告图片",
      emptyText: "暂未添加种源鉴定报告图片",
      initialPhotos: draft.reportPhotos
    });
  }
  return "";
}

function renderFormSection(title, fields, options = {}) {
  const sectionClassName = ["form-section", options.className || ""].filter(Boolean).join(" ");
  const gridClassName = ["form-grid", options.gridClass || ""].filter(Boolean).join(" ");
  return `
    <section class="${sectionClassName}">
      <div class="form-section-head">
        <h4>${escapeHtml(title)}</h4>
      </div>
      <div class="${gridClassName}">
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
  if (field.className) {
    classes.push(field.className);
  }
  if (field.span) {
    classes.push(`span-${field.span}`);
  }
  const requiredText = field.required ? "required" : "";
  const dataAttrs = [];
  if (field.mapSearch) {
    dataAttrs.push('data-map-address-input');
  }
  if (field.mapLongitude) {
    dataAttrs.push('data-map-longitude-input');
    dataAttrs.push('inputmode="decimal"');
  }
  if (field.mapLatitude) {
    dataAttrs.push('data-map-latitude-input');
    dataAttrs.push('inputmode="decimal"');
  }

  if (field.type === "textarea") {
    return `
      <label class="${classes.join(" ")}">
        <span>${escapeHtml(field.label)}</span>
        <textarea name="${escapeAttribute(field.name)}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText}>${escapeHtml(field.value || "")}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    return `
      <label class="${classes.join(" ")}">
        <span>${escapeHtml(field.label)}</span>
        <select name="${escapeAttribute(field.name)}" ${requiredText}>
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
        <span>${escapeHtml(field.label)}</span>
        <div class="field-inline">
          <input name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type || "text")}" value="${escapeAttribute(field.value || "")}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText} ${dataAttrs.join(" ")}>
          <button class="button ghost button-inline" type="button" data-open-map-search>地图定位</button>
        </div>
      </label>
    `;
  }

  return `
    <label class="${classes.join(" ")}">
      <span>${escapeHtml(field.label)}</span>
      <input name="${escapeAttribute(field.name)}" type="${escapeAttribute(field.type || "text")}" value="${escapeAttribute(field.value || "")}" placeholder="${escapeAttribute(field.placeholder || "")}" ${requiredText} ${dataAttrs.join(" ")}>
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
    <div class="context-card is-empty">
      <h4>先选上游</h4>
      <p>选择后显示链路摘要</p>
    </div>
  `;
}

function bindHome(root, shared) {
  if (root._homeClickHandler) {
    root.removeEventListener("click", root._homeClickHandler);
  }

  root._homeClickHandler = (event) => {
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
  };

  root.addEventListener("click", root._homeClickHandler);
}

function bindTraceQuery(root, shared) {
  bindBaseTracePreviewMaps(root);
}

function bindModule(root, pageId, config, shared, selected) {
  if (root._baseDetailClickHandler) {
    root.removeEventListener("click", root._baseDetailClickHandler);
  }
  const searchInput = root.querySelector("[data-search-input]");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      APP_STATE.query = event.target.value.trim();
      renderAndBind(root, pageId);
    });
  }

  if (root._moduleClickHandler) {
    root.removeEventListener("click", root._moduleClickHandler);
  }

  root._moduleClickHandler = async (event) => {
    const copyButton = event.target.closest("[data-copy-public-url]");
    if (copyButton) {
      event.preventDefault();
      await copyTextWithFallback(copyButton.dataset.copyPublicUrl || "", "查询链接已复制");
      return;
    }

    const downloadButton = event.target.closest("[data-download-qr]");
    if (downloadButton) {
      event.preventDefault();
      const qrValue = downloadButton.dataset.downloadQr || "";
      const qrName = downloadButton.dataset.downloadName || "trace-code";
      await downloadTraceQrPng(qrValue, qrName);
      return;
    }

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
      if (pageId === "base-trace" && kind === "primary") {
        clearDraft(pageId);
        renderAndBind(root, pageId);
        openDialog(root, pageId, kind);
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

    const selectButton = config.inlineDetail === false ? null : event.target.closest("[data-select-record]");
    if (selectButton) {
      event.stopPropagation();
      const nextId = selectButton.dataset.selectRecord || "";
      APP_STATE.selectedId = APP_STATE.selectedId === nextId ? "" : nextId;
      renderAndBind(root, pageId);
      return;
    }

    const editButton = event.target.closest("[data-edit-record]");
    if (editButton) {
      event.stopPropagation();
      const recordId = editButton.dataset.editRecord || "";
      handleEditRecord(pageId, recordId, shared, root);
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

    const row = config.inlineDetail === false ? null : event.target.closest("tr[data-row-id]");
    if (row && !event.target.closest("button,a")) {
      const nextId = row.dataset.rowId || "";
      APP_STATE.selectedId = APP_STATE.selectedId === nextId ? "" : nextId;
      renderAndBind(root, pageId);
    }
  };

  root.addEventListener("click", root._moduleClickHandler);

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
      if (form._baseTracePhotoController) {
        await form._baseTracePhotoController.waitUntilReady();
      }
      if (!form.reportValidity()) {
        return;
      }
      const kind = form.dataset.formKind || "primary";
      const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
      const validation = validateDialogSubmission(pageId, kind, values);
      if (!validation.ok) {
        window.alert(validation.message);
        return;
      }
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
    bindBaseTracePhotos(root, dialog);
    bindBaseTracePreviewMaps(root);
  }

  if (pageId === "seed-trace") {
    const dialog = root.querySelector('[data-dialog="primary"]');
    bindBaseTracePhotos(root, dialog);
  }

  if (pageId === "trace-code-management") {
    mountTraceQrPreviews(root);
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
  const dialogPageId = pageId === "base-detail"
    ? "base-trace"
    : pageId === "seed-detail"
      ? "seed-trace"
      : pageId;
  if (form) {
    updateFormContext(form, dialogPageId, buildSharedData(readWorkflowStore()), kind);
  }
  if (pageId === "base-trace" || pageId === "base-detail") {
    window.requestAnimationFrame(() => activateBaseTraceMap(root));
  }
}

function validateDialogSubmission(pageId, kind, values) {
  if (pageId === "base-trace" && kind === "primary") {
    const landLeasePhotos = normalizeTracePhotoList(values.landLeasePhotos);
    const envMonitorPhotos = normalizeTracePhotoList(values.envMonitorPhotos);
    if (values.landCertStatus === "已归档" && !landLeasePhotos.length) {
      return {
        ok: false,
        message: "土地租赁证明已归档时，需要上传至少 1 张证明图片。"
      };
    }
    if (values.envReportStatus === "已归档" && !envMonitorPhotos.length) {
      return {
        ok: false,
        message: "环境监测已归档时，需要上传至少 1 张环境监测图片。"
      };
    }
  }

  return { ok: true };
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
  const contextShell = form.querySelector("[data-form-context-shell]");
  const layout = form.querySelector("[data-dialog-layout]");
  if (!context) {
    return;
  }
  const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
  const contextState = getFormContextState(pageId, kind, values, shared);
  context.innerHTML = contextState.variant === "empty" ? "" : contextState.html;
  if (contextShell) {
    contextShell.classList.toggle("is-hidden", contextState.variant === "empty");
  }
  if (layout) {
    layout.classList.toggle("is-context-empty", contextState.variant === "empty");
  }
}

function getFormContextState(pageId, kind, values, shared, selected) {
  if (pageId === "seed-trace") {
    const base = shared.viewMaps.baseById.get(values.baseId);
    return base
      ? { variant: "full", html: renderDialogContextCard("关联基地", [base.name, base.code, `${base.herb} · ${base.address}`]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "farming-trace" && kind === "primary") {
    const seed = shared.viewMaps.seedById.get(values.seedId);
    const base = shared.viewMaps.baseById.get(values.baseId || (seed && seed.baseId));
    return (seed || base)
      ? { variant: "full", html: renderDialogContextCard("上游链路", [
        base ? `${base.name} · ${base.code}` : "未选择基地",
        seed ? `${seed.batchNo} · ${seed.herb || seed.breedMaterial || "种源批次"}` : "未选择种源",
        "保存后可继续补充农事记录"
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "farming-trace" && kind === "secondary") {
    const plant = shared.viewMaps.plantById.get(values.plantId || (selected && selected.id));
    return plant
      ? { variant: "full", html: renderDialogContextCard("农事挂载对象", [
        plant.name,
        `${plant.baseName} · ${plant.plantBatch}`,
        `${plant.farmCount} 条现有记录`
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "harvest-trace") {
    const plant = shared.viewMaps.plantById.get(values.plantId);
    return plant
      ? { variant: "full", html: renderDialogContextCard("采收来源", [
        plant.name,
        `${plant.baseName} · ${plant.seedBatch}`,
        `${plant.harvestCount} 条采收已关联`
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "processing-trace" && kind === "primary") {
    const harvest = shared.viewMaps.harvestById.get(values.harvestId);
    const material = shared.viewMaps.materialById.get(values.materialId);
    return (harvest || material)
      ? { variant: "full", html: renderDialogContextCard("加工输入摘要", [
        harvest ? `${harvest.name} · ${harvest.harvestBatch}` : "未选择采收",
        material ? `${material.name} · ${material.materialNo}` : "未选择药材",
        "保存后可以继续拆分工艺步骤"
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "processing-trace" && kind === "secondary") {
    const process = shared.viewMaps.primaryProcessById.get(values.primaryProcessId || (selected && selected.id));
    return process
      ? { variant: "full", html: renderDialogContextCard("工艺挂载对象", [
        process.name,
        `${process.ppBatch} · ${process.materialName}`,
        `${process.stepCount} 个现有步骤`
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "trace-code-management") {
    const process = shared.viewMaps.primaryProcessById.get(values.primaryProcessId);
    const warehouse = shared.viewMaps.warehouseById.get(values.warehouseId);
    const previewUrl = values.traceCode ? buildTraceQueryUrl(values.traceCode) : "";
    return (process || warehouse)
      ? { variant: "full", html: renderDialogContextCard("赋码预览", [
        process ? `${process.name} · ${process.ppBatch}` : "未选择加工过程",
        warehouse ? `${warehouse.name} · ${warehouse.conditions}` : "未选择仓库",
        previewUrl ? truncateText(previewUrl, 44) : "保存后生成查询页"
      ]) }
      : { variant: "empty", html: renderDialogContextFallback() };
  }

  if (pageId === "warehouse-management") {
    return { variant: "full", html: renderDialogContextCard("仓库主档提示", [
      "仓库主档先行建立",
      "后续赋码时可直接绑定仓库",
      "建议完整填写面积、容量和条件"
    ]) };
  }

  if (pageId === "base-trace") {
    const coordinateText = values.longitude && values.latitude ? `${values.longitude}, ${values.latitude}` : "未设置坐标";
    return { variant: "full", html: renderDialogContextCard("基地建档提示", [
      values.name || "等待填写基地名称",
      coordinateText,
      values.landCertStatus || "待补土地租赁证明"
    ]) };
  }

  if (pageId === "herb-management") {
    return { variant: "full", html: renderDialogContextCard("药材档案提示", [
      values.name || "等待填写药材名称",
      values.specification || "等待填写规格",
      values.materialType || "等待选择类型"
    ]) };
  }

  return { variant: "empty", html: renderDialogContextFallback() };
}

function createRecordFromForm(pageId, kind, values, shared, selected) {
  updateWorkflowStore((store) => {
    if (pageId === "base-trace") {
      const existingIndex = values.recordId ? store.bases.findIndex((item) => item.id === values.recordId) : -1;
      const current = existingIndex >= 0 ? store.bases[existingIndex] : null;
      const base = {
        id: current ? current.id : entityId("BASE", store.bases.length + 1),
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
        landLeasePhotos: normalizeTracePhotoList(values.landLeasePhotos),
        envMonitorPhotos: normalizeTracePhotoList(values.envMonitorPhotos),
        intro: values.intro,
        photos: normalizeTracePhotoList(values.photos),
        createdAt: current ? current.createdAt : isoDate()
      };
      if (existingIndex >= 0) {
        store.bases.splice(existingIndex, 1, base);
        addActivity(store, "更新基地档案", `${base.name} 已更新`, "基础信息、资料和地理信息已同步调整");
      } else {
        store.bases.unshift(base);
        addActivity(store, "建立基地档案", `${base.name} 已进入主档`, "基地资料、坐标和后续链路从这里起步");
      }
      return;
    }

    if (pageId === "seed-trace") {
      const base = shared.maps.baseById.get(values.baseId);
      const reportPhotos = normalizeTracePhotoList(values.reportPhotos);
      const existingIndex = values.recordId ? store.seeds.findIndex((item) => item.id === values.recordId) : -1;
      const current = existingIndex >= 0 ? store.seeds[existingIndex] : null;
      const record = {
        id: current ? current.id : entityId("SEED", store.seeds.length + 1),
        baseId: values.baseId,
        batchNo: values.batchNo || suggestCode("SEED", store.seeds.length + 1),
        herb: values.herb || (base ? base.herb : ""),
        breedMaterial: values.breedMaterial,
        sourceType: values.sourceType,
        brand: values.brand,
        certificateStatus: reportPhotos.length ? "已归档" : "待补充",
        reportPhotos: normalizeTracePhotoList(values.reportPhotos),
        note: values.note,
        createdAt: current ? current.createdAt : isoDate()
      };
      if (existingIndex >= 0) {
        store.seeds.splice(existingIndex, 1, record);
        addActivity(store, "更新种源批次", `${record.batchNo} 已更新`, `${record.herb} · ${record.sourceType}`);
      } else {
        store.seeds.unshift(record);
        addActivity(store, "备案种源批次", `${record.batchNo} 已绑定基地`, `${record.herb} · ${record.sourceType}`);
      }
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
  if (pageId === "base-trace" && kind === "primary") {
    return values.recordId || "";
  }
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

function handleEditRecord(pageId, recordId, shared, root) {
  if (pageId === "base-trace" || pageId === "base-detail") {
    const record = shared.maps.baseById.get(recordId);
    if (!record) {
      return;
    }
    const draftPageId = pageId === "base-detail" ? "base-trace" : pageId;

    writeDraft(draftPageId, {
      recordId: record.id,
      code: record.code,
      name: record.name,
      manager: record.manager,
      herb: record.herb,
      baseType: record.baseType,
      cooperationMode: record.cooperationMode,
      areaMu: record.areaMu,
      address: record.address,
      detailAddress: record.detailAddress,
      longitude: record.longitude,
      latitude: record.latitude,
      altitude: record.altitude,
      avgTemp: record.avgTemp,
      soilPh: record.soilPh,
      soilEc: record.soilEc,
      landCertStatus: record.landCertStatus,
      envReportStatus: record.envReportStatus,
      landLeasePhotos: record.landLeasePhotos || [],
      envMonitorPhotos: record.envMonitorPhotos || [],
      intro: record.intro,
      photos: record.photos || []
    });

    APP_STATE.selectedId = "";
    renderAndBind(root, pageId);
    openDialog(root, pageId, "primary");
    return;
  }

  if (pageId === "seed-trace" || pageId === "seed-detail") {
    const record = shared.maps.seedById.get(recordId);
    if (!record) {
      return;
    }
    writeDraft("seed-trace", {
      recordId: record.id,
      baseId: record.baseId,
      batchNo: record.batchNo,
      herb: record.herb,
      breedMaterial: record.breedMaterial,
      sourceType: record.sourceType,
      brand: record.brand,
      reportPhotos: record.reportPhotos || [],
      note: record.note
    });

    APP_STATE.selectedId = "";
    renderAndBind(root, pageId);
    openDialog(root, pageId, "primary");
  }
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
    qrCodes: [],
    warehouses: normalized.warehouses.map((item) => buildWarehouseView(item, relations)).sort(sortByDateDesc("createdAt"))
  };

  views.qrCodes = normalized.qrCodes
    .map((item) => buildQrView(item, maps))
    .map((item) => finalizeQrView(item, views))
    .sort(sortByDateDesc("createdAt"));

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
  const landLeasePhotos = normalizeTracePhotoList(item.landLeasePhotos);
  const envMonitorPhotos = normalizeTracePhotoList(item.envMonitorPhotos);
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
    item.landCertStatus === "已归档" && landLeasePhotos.length > 0,
    item.envReportStatus === "已归档" && envMonitorPhotos.length > 0,
    photos.length > 0
  ]);
  return {
    ...item,
    photos,
    landLeasePhotos,
    envMonitorPhotos,
    photoCount: photos.length,
    landLeasePhotoCount: landLeasePhotos.length,
    envMonitorPhotoCount: envMonitorPhotos.length,
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
  const reportPhotos = normalizeTracePhotoList(item.reportPhotos);
  const readiness = completionScore([
    item.baseId,
    item.batchNo,
    item.herb,
    item.breedMaterial,
    item.sourceType,
    reportPhotos.length > 0
  ]);
  return {
    ...item,
    reportPhotos,
    reportPhotoCount: reportPhotos.length,
    baseName: base ? base.name : "--",
    baseCode: base ? base.code : "--",
    baseAddress: base ? compactAddress(base.address, base.detailAddress) : "--",
    quantityText: `${formatDecimal(item.quantity)} kg`,
    plantCount,
    statusLabel: reportPhotos.length ? "可投种" : "待补报告",
    statusTone: reportPhotos.length ? "good" : "warn",
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
    seedHerb: seed ? seed.herb : "--",
    seedSourceLabel: seed ? `${seed.sourceType || "--"} / ${seed.breedMaterial || "--"}` : "--",
    seedBrand: seed ? seed.brand : "--",
    warehouseName: warehouse ? warehouse.name : "--",
    warehouseConditions: warehouse ? warehouse.conditions : "--",
    warehouseMethod: warehouse ? warehouse.method : "--",
    statusLabel: "可查询",
    statusTone: "good"
  };
}

function finalizeQrView(view, views) {
  const publicSnapshot = buildPublicTraceSnapshot(view, views);
  const publicSnapshotToken = encodePublicTraceSnapshot(publicSnapshot);
  return {
    ...view,
    publicSnapshot,
    publicSnapshotToken,
    publicUrl: buildTraceQueryUrl(view.traceCode, publicSnapshotToken)
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
    ${renderBaseDetailBody(view, shared)}
  `;
}

function renderBaseDetailBody(view, shared) {
  return `
    ${renderMetricGrid([
      { label: "基地面积", value: view.areaText },
      { label: "主要药材", value: view.herb || "--" },
      { label: "基地负责人", value: view.manager || "--" },
      { label: "建档完整度", value: `${view.readiness}%` }
    ])}
    ${renderInfoRack([
      infoCard("主档信息", [
        `基地编号：${view.code || "--"}`,
        `基地类型：${view.baseType || "--"}`,
        `合作方式：${view.cooperationMode || "--"}`
      ]),
      infoCard("地理与环境", [
        `所属地区：${view.address || "未填写"}`,
        `详细地址：${view.detailAddress || "未填写"}`,
        `经纬度：${view.coordinateText || "未设置"}`,
        `海拔与气候：${[
          view.altitude ? `${formatDecimal(view.altitude)} m` : "",
          view.avgTemp ? `年均温 ${formatDecimal(view.avgTemp)} ℃` : ""
        ].filter(Boolean).join("，") || "暂未补充"}`
      ]),
      infoCard("资料状态", [
        `土地租赁证明：${view.landCertStatus || "待补充"}（${view.landLeasePhotoCount} 张）`,
        `环境监测资料：${view.envReportStatus || "待补充"}（${view.envMonitorPhotoCount} 张）`,
        `基地现场照片：${view.photoCount} 张`
      ])
    ])}
    ${renderBaseMap(view)}
    ${renderTracePhotoDetailBlock("土地租赁证明", view.landLeasePhotos, "还没有土地租赁证明图片", "可以在建档弹窗里补充合同或证明照片。")}
    ${renderTracePhotoDetailBlock("环境监测", view.envMonitorPhotos, "还没有环境监测图片", "可以在建档弹窗里补充环境监测相关图片。")}
    ${renderBasePhotos(view)}
  `;
}

function renderSeedDetail(view, shared) {
  return `
    ${renderDetailHero(view.batchNo, view.statusLabel, view.statusTone, `${view.herb} · ${view.baseName}`)}
    ${renderSeedDetailBody(view, shared)}
  `;
}

function renderSeedDetailBody(view, shared) {
  return `
    ${renderMetricGrid([
      { label: "关联基地", value: view.baseName || "--" },
      { label: "主要药材", value: view.herb || "--" },
      { label: "已进种植", value: `${view.plantCount} 条` },
      { label: "鉴定报告", value: view.reportPhotoCount ? "已上传" : "待补充" }
    ])}
    ${renderActionBar([
      continueAction("继续建立种植过程", "farming-trace", { seedId: view.id, baseId: view.baseId }),
      subtleTextAction("种源品牌", view.brand || "--")
    ])}
    ${renderInfoRack([
      infoCard("种源基础", [
        `种源批次：${view.batchNo || "--"}`,
        `繁殖材料：${view.breedMaterial || "--"}`,
        `来源方式：${view.sourceType || "--"}`
      ]),
      infoCard("关联基地", [
        `基地名称：${view.baseName || "--"}`,
        `基地编号：${view.baseCode || "--"}`,
        `所属地区：${view.baseAddress || "--"}`
      ]),
      infoCard("报告情况", [
        `种源鉴定报告：${view.reportPhotoCount ? "已上传" : "待补充"}`,
        `种源鉴定报告图片：${view.reportPhotoCount || 0} 张`
      ])
    ])}
    ${renderNarrativeBlock("批次备注", view.note)}
    ${renderTracePhotoDetailBlock("种源鉴定报告", view.reportPhotos, "还没有种源鉴定报告图片", "可以在种源备案弹窗里继续补充报告图片。")}
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
    ${renderNarrativeBlock("前茬作物", view.previewMat)}
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
    ${renderNarrativeBlock("采收备注", view.note)}
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
    ${renderNarrativeBlock("工艺备注", view.note)}
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
      externalLinkAction("查询页预览", view.publicUrl),
      subtleTextAction("查询地址", truncateText(view.publicUrl, 40))
    ])}
    ${renderQrShareCard(view)}
    ${renderInfoRack([
      infoCard("链路摘要", [view.baseName, view.seedBatch, view.plantBatch]),
      infoCard("落仓信息", [view.warehouseName, view.warehouseConditions, view.warehouseMethod])
    ])}
  `;
}

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

function renderQrShareCard(view) {
  return `
    <section class="qr-share-card">
      <div class="qr-share-head">
        <div>
          <span>扫码查询</span>
          <strong>真实二维码</strong>
        </div>
        <em>${escapeHtml(view.traceCode)}</em>
      </div>
      <div class="qr-share-layout">
        <div class="qr-preview-shell" data-qr-preview data-qr-value="${escapeAttribute(view.publicUrl)}">
          <div class="qr-preview-state">二维码生成中...</div>
        </div>
        <div class="qr-share-meta">
          <div class="qr-share-actions">
            <button class="button secondary button-inline" type="button" data-copy-public-url="${escapeAttribute(view.publicUrl)}">复制查询链接</button>
            <button class="button ghost button-inline" type="button" data-download-qr="${escapeAttribute(view.publicUrl)}" data-download-name="${escapeAttribute(`${view.traceCode || "trace-code"}`)}">下载二维码</button>
          </div>
        </div>
      </div>
    </section>
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
    return `<a class="button secondary" href="${escapeAttribute(action.href)}" target="_blank" rel="noreferrer">${escapeHtml(action.label)}</a>`;
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
  if (!String(text || "").trim()) {
    return "";
  }
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

function titleOnlyCell(title) {
  return `
    <div class="title-cell">
      <strong>${escapeHtml(title)}</strong>
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

function tableActionGroup(actions) {
  return `<div class="table-actions">${actions.join("")}</div>`;
}

function detailPageActionButton(href) {
  return `<a class="chip neutral" href="${escapeAttribute(href)}">详情</a>`;
}

function selectActionButton(id, active = false) {
  return `<button class="chip neutral ${active ? "is-active" : ""}" type="button" data-select-record="${escapeAttribute(id)}">${active ? "收起" : "详情"}</button>`;
}

function editActionButton(id) {
  return `<button class="chip edit" type="button" data-edit-record="${escapeAttribute(id)}">编辑</button>`;
}

function deleteActionButton(id) {
  return `<button class="chip danger" type="button" data-delete-record="${escapeAttribute(id)}">删除</button>`;
}

function publicPreviewLink(href) {
  return `<a class="chip neutral" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">查询页</a>`;
}

function buildBaseDetailUrl(id) {
  return `${BASE_DETAIL_PAGE}?id=${encodeURIComponent(id)}`;
}

function buildSeedDetailUrl(id) {
  return `${SEED_DETAIL_PAGE}?id=${encodeURIComponent(id)}`;
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
  let extra = {};
  if (arguments.length > 4) {
    extra = arguments[4] || {};
  }
  return { name, label, required, value, type: "date", ...extra };
}

function fieldTextarea(name, label, placeholder, required, value, extra = {}) {
  return { name, label, placeholder, required, value, type: "textarea", full: true, ...extra };
}

function fieldSelect(name, label, options, required, value, extra = {}) {
  return {
    name,
    label,
    required,
    value,
    type: "select",
    options: normalizeSelectOptions(options),
    ...extra
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
    return null;
  }
  return filtered.find((item) => item.id === selectedId) || null;
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

function bindBaseDetailPage(root, shared, view) {
  if (root._moduleClickHandler) {
    root.removeEventListener("click", root._moduleClickHandler);
  }
  if (root._baseDetailClickHandler) {
    root.removeEventListener("click", root._baseDetailClickHandler);
  }

  root._baseDetailClickHandler = (event) => {
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

    const editButton = event.target.closest("[data-edit-record]");
    if (editButton) {
      event.preventDefault();
      const recordId = editButton.dataset.editRecord || (view ? view.id : "");
      if (recordId) {
        handleEditRecord("base-detail", recordId, shared, root);
      }
    }
  };

  root.addEventListener("click", root._baseDetailClickHandler);

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
    bindFormIntelligence(form, "base-trace", shared, view);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form._baseTracePhotoController) {
        await form._baseTracePhotoController.waitUntilReady();
      }
      if (!form.reportValidity()) {
        return;
      }
      const kind = form.dataset.formKind || "primary";
      const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
      const validation = validateDialogSubmission("base-trace", kind, values);
      if (!validation.ok) {
        window.alert(validation.message);
        return;
      }
      createRecordFromForm("base-trace", kind, values, shared, view);
      clearDraft("base-trace");
      const targetId = values.recordId || (view ? view.id : "");
      window.history.replaceState({}, "", buildBaseDetailUrl(targetId));
      renderAndBind(root, "base-detail");
    });
  });

  const dialog = root.querySelector('[data-dialog="primary"]');
  bindBaseTraceMap(root, dialog);
  bindBaseTracePhotos(root, dialog);
  bindBaseTracePreviewMaps(root);
}

function bindSeedDetailPage(root, shared, view) {
  if (root._moduleClickHandler) {
    root.removeEventListener("click", root._moduleClickHandler);
  }
  if (root._seedDetailClickHandler) {
    root.removeEventListener("click", root._seedDetailClickHandler);
  }

  root._seedDetailClickHandler = (event) => {
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

    const editButton = event.target.closest("[data-edit-record]");
    if (editButton) {
      event.preventDefault();
      const recordId = editButton.dataset.editRecord || (view ? view.id : "");
      if (recordId) {
        handleEditRecord("seed-detail", recordId, shared, root);
      }
    }
  };

  root.addEventListener("click", root._seedDetailClickHandler);

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
    bindFormIntelligence(form, "seed-trace", shared, view);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form._baseTracePhotoController) {
        await form._baseTracePhotoController.waitUntilReady();
      }
      if (!form.reportValidity()) {
        return;
      }
      const values = normalizeValues(Object.fromEntries(new FormData(form).entries()));
      const validation = validateDialogSubmission("seed-trace", "primary", values);
      if (!validation.ok) {
        window.alert(validation.message);
        return;
      }
      createRecordFromForm("seed-trace", "primary", values, shared, view);
      clearDraft("seed-trace");
      const targetId = values.recordId || (view ? view.id : "");
      window.history.replaceState({}, "", buildSeedDetailUrl(targetId));
      renderAndBind(root, "seed-detail");
    });
  });

  const dialog = root.querySelector('[data-dialog="primary"]');
  bindBaseTracePhotos(root, dialog);
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

function buildTraceQueryUrl(code, snapshotToken = "") {
  try {
    const url = new URL(TRACE_QUERY_PAGE, window.location.href);
    url.searchParams.set("code", code);
    if (snapshotToken) {
      url.searchParams.set(TRACE_PUBLIC_SNAPSHOT_PARAM, snapshotToken);
    }
    return url.toString();
  } catch (error) {
    return snapshotToken
      ? `${TRACE_QUERY_PAGE}?code=${encodeURIComponent(code)}&${TRACE_PUBLIC_SNAPSHOT_PARAM}=${encodeURIComponent(snapshotToken)}`
      : `${TRACE_QUERY_PAGE}?code=${encodeURIComponent(code)}`;
  }
}

function buildPublicTraceSnapshot(view, views) {
  const farmItems = views.farmRecords
    .filter((item) => item.plantId === view.plantId)
    .slice(0, 8)
    .map((item) => [
      compactTraceText(item.workName, 20),
      compactTraceText(item.periodText, 28),
      compactTraceText(item.operateDetail || item.note || "已记录农事过程", 72)
    ]);
  const stepItems = views.processSteps
    .filter((item) => item.primaryProcessId === view.primaryProcessId)
    .slice(0, 8)
    .map((item) => [
      compactTraceText(item.name, 20),
      compactTraceText(item.periodText, 28),
      compactTraceText(item.stepDetails || item.note || "已记录工艺过程", 72)
    ]);

  return {
    v: 1,
    c: compactTraceText(view.traceCode, 40),
    n: compactTraceText(view.name, 48),
    m: compactTraceText(view.materialName, 32),
    mn: compactTraceText(view.materialNo, 24),
    b: [
      compactTraceText(view.baseName, 32),
      compactTraceText(view.baseCode, 24),
      compactTraceText(view.baseAddress, 84)
    ],
    g: view.baseCoordinates ? [
      Number(view.baseCoordinates.lng.toFixed(6)),
      Number(view.baseCoordinates.lat.toFixed(6))
    ] : [],
    s: [
      compactTraceText(view.seedBatch, 24),
      compactTraceText(view.seedHerb, 24),
      compactTraceText(view.seedSourceLabel || view.seedBrand, 32)
    ],
    p: compactTraceText(view.plantBatch, 24),
    h: [
      compactTraceText(view.harvestName, 32),
      compactTraceText(view.harvestBatch, 24),
      roundTraceNumber(view.harvestWeight || 0)
    ],
    pr: [
      compactTraceText(view.processName, 32),
      compactTraceText(view.processBatch, 24),
      roundTraceNumber(view.outputCount || 0)
    ],
    w: [
      compactTraceText(view.warehouseName, 32),
      compactTraceText(view.warehouseConditions, 24),
      compactTraceText(view.warehouseMethod, 24)
    ],
    f: farmItems,
    ps: stepItems
  };
}

function buildPublicTraceDetailFromView(view, shared) {
  return {
    traceCode: view.traceCode,
    name: view.name,
    materialName: view.materialName,
    materialNo: view.materialNo,
    baseName: view.baseName,
    baseCode: view.baseCode,
    baseAddress: view.baseAddress,
    baseCoordinates: view.baseCoordinates,
    seedBatch: view.seedBatch,
    seedHerb: view.seedHerb,
    seedSourceLabel: view.seedSourceLabel,
    seedBrand: view.seedBrand,
    plantBatch: view.plantBatch,
    harvestName: view.harvestName,
    harvestBatch: view.harvestBatch,
    harvestWeight: view.harvestWeight,
    processName: view.processName,
    processBatch: view.processBatch,
    outputCount: view.outputCount,
    warehouseName: view.warehouseName,
    warehouseConditions: view.warehouseConditions,
    warehouseMethod: view.warehouseMethod,
    publicUrl: view.publicUrl,
    farmItems: shared.views.farmRecords
      .filter((item) => item.plantId === view.plantId)
      .map((item) => ({
        workName: item.workName,
        periodText: item.periodText,
        detailText: item.operateDetail || item.note || "已记录农事过程"
      })),
    stepItems: shared.views.processSteps
      .filter((item) => item.primaryProcessId === view.primaryProcessId)
      .map((item) => ({
        name: item.name,
        periodText: item.periodText,
        detailText: item.stepDetails || item.note || "已记录工艺过程"
      }))
  };
}

function buildPublicTraceDetailFromSnapshot(snapshot, fallbackCode, snapshotToken) {
  const baseInfo = Array.isArray(snapshot && snapshot.b) ? snapshot.b : [];
  const seedInfo = Array.isArray(snapshot && snapshot.s) ? snapshot.s : [];
  const harvestInfo = Array.isArray(snapshot && snapshot.h) ? snapshot.h : [];
  const processInfo = Array.isArray(snapshot && snapshot.pr) ? snapshot.pr : [];
  const warehouseInfo = Array.isArray(snapshot && snapshot.w) ? snapshot.w : [];
  const baseCoordinates = Array.isArray(snapshot && snapshot.g) && snapshot.g.length === 2
    ? {
      lng: Number(snapshot.g[0]),
      lat: Number(snapshot.g[1])
    }
    : null;
  return {
    traceCode: snapshot && snapshot.c ? snapshot.c : (fallbackCode || "--"),
    name: snapshot && snapshot.n ? snapshot.n : "溯源码查询",
    materialName: snapshot && snapshot.m ? snapshot.m : "--",
    materialNo: snapshot && snapshot.mn ? snapshot.mn : "--",
    baseName: baseInfo[0] || "--",
    baseCode: baseInfo[1] || "--",
    baseAddress: baseInfo[2] || "--",
    baseCoordinates: Number.isFinite(baseCoordinates && baseCoordinates.lng) && Number.isFinite(baseCoordinates && baseCoordinates.lat) ? baseCoordinates : null,
    seedBatch: seedInfo[0] || "--",
    seedHerb: seedInfo[1] || "--",
    seedSourceLabel: seedInfo[2] || "--",
    seedBrand: "--",
    plantBatch: snapshot && snapshot.p ? snapshot.p : "--",
    harvestName: harvestInfo[0] || "--",
    harvestBatch: harvestInfo[1] || "--",
    harvestWeight: Number.isFinite(Number(harvestInfo[2])) ? Number(harvestInfo[2]) : 0,
    processName: processInfo[0] || "--",
    processBatch: processInfo[1] || "--",
    outputCount: Number.isFinite(Number(processInfo[2])) ? Number(processInfo[2]) : 0,
    warehouseName: warehouseInfo[0] || "--",
    warehouseConditions: warehouseInfo[1] || "--",
    warehouseMethod: warehouseInfo[2] || "--",
    publicUrl: buildTraceQueryUrl((snapshot && snapshot.c) || fallbackCode || "", snapshotToken || ""),
    farmItems: normalizePublicTimeline(snapshot && snapshot.f, "farm"),
    stepItems: normalizePublicTimeline(snapshot && snapshot.ps, "step")
  };
}

function normalizePublicTimeline(items, type) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => {
    const values = Array.isArray(item) ? item : [];
    return type === "farm"
      ? {
        workName: values[0] || "--",
        periodText: values[1] || "--",
        detailText: values[2] || "已记录农事过程"
      }
      : {
        name: values[0] || "--",
        periodText: values[1] || "--",
        detailText: values[2] || "已记录工艺过程"
      };
  });
}

function compactTraceText(value, limit) {
  const text = String(value || "--").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1))}…` : text;
}

function roundTraceNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.round(number * 10) / 10;
}

function encodePublicTraceSnapshot(snapshot) {
  try {
    const json = JSON.stringify(snapshot || {});
    const bytes = new TextEncoder().encode(json);
    return base64UrlEncode(bytes);
  } catch (error) {
    return "";
  }
}

function decodePublicTraceSnapshot(token) {
  try {
    const bytes = base64UrlDecode(token || "");
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - normalized.length % 4) : "";
  const binary = window.atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function mountTraceQrPreviews(root) {
  const previews = root.querySelectorAll("[data-qr-preview]");
  if (!previews.length) {
    return;
  }
  for (const preview of previews) {
    await renderTraceQrPreview(preview);
  }
}

async function renderTraceQrPreview(container) {
  const value = container.dataset.qrValue || "";
  if (!value) {
    container.innerHTML = '<div class="qr-preview-state">当前没有可生成的二维码</div>';
    return;
  }
  try {
    const svg = await buildTraceQrSvg(value, { cellSize: 5, margin: 2 });
    container.innerHTML = svg;
  } catch (error) {
    container.innerHTML = '<div class="qr-preview-state">二维码生成失败，请重试。</div>';
  }
}

async function loadTraceQrLibrary() {
  if (window.qrcode) {
    return window.qrcode;
  }
  if (TRACE_QR_RUNTIME.libraryPromise) {
    return TRACE_QR_RUNTIME.libraryPromise;
  }
  TRACE_QR_RUNTIME.libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(TRACE_QR_LIBRARY_URL, window.location.href).toString();
    script.defer = true;
    script.onload = () => {
      if (window.qrcode) {
        resolve(window.qrcode);
        return;
      }
      reject(new Error("QR library unavailable"));
    };
    script.onerror = () => reject(new Error("QR library failed to load"));
    document.head.append(script);
  });
  return TRACE_QR_RUNTIME.libraryPromise;
}

async function buildTraceQrSvg(value, options) {
  const library = await loadTraceQrLibrary();
  const qr = library(0, "L");
  qr.addData(value, "Byte");
  qr.make();
  const cellSize = options && options.cellSize ? options.cellSize : 5;
  const margin = options && options.margin !== undefined ? options.margin : 2;
  return qr.createSvgTag(cellSize, margin);
}

async function downloadTraceQrPng(value, fileName) {
  if (!value) {
    return;
  }
  try {
    const svg = await buildTraceQrSvg(value, { cellSize: 14, margin: 3 });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await loadImageFromDataUrl(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      triggerDownload(dataUrl, `${fileName || "trace-code"}.png`);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (error) {
    window.alert("二维码下载失败，请稍后重试。");
  }
}

function triggerDownload(href, fileName) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

async function copyTextWithFallback(text, successMessage) {
  if (!text) {
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    window.alert(successMessage || "已复制");
  } catch (error) {
    window.prompt("请手动复制下面的链接", text);
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

function renderBasePhotos(record) {
  const photos = normalizeTracePhotoList(record.photos);
  return renderTracePhotoDetailBlock("基地照片", photos, "还没有基地照片", "可以在建档弹窗里继续补充现场照片。");
}

function renderBasePhotoSection() {
  return renderTracePhotoUploadSection({
    title: "基地照片",
    fieldName: "photos",
    actionLabel: "增加照片",
    emptyText: "暂未添加照片"
  });
}

function renderBaseMediaSection(draft) {
  return `
    <section class="form-section base-media-section">
      <div class="form-section-head">
        <h4>基地图片资料</h4>
      </div>
      <div class="base-media-grid">
        ${renderCompactPhotoUploadCard({
          title: "土地租赁证明",
          fieldName: "landLeasePhotos",
          actionLabel: "上传证明",
          emptyText: "暂无证明图片",
          statusField: fieldSelect("landCertStatus", "资料状态", DOCUMENT_STATUS_OPTIONS, true, draft.landCertStatus || "待补充"),
          initialPhotos: draft.landLeasePhotos
        })}
        ${renderCompactPhotoUploadCard({
          title: "环境监测",
          fieldName: "envMonitorPhotos",
          actionLabel: "上传图片",
          emptyText: "暂无监测图片",
          statusField: fieldSelect("envReportStatus", "资料状态", DOCUMENT_STATUS_OPTIONS, true, draft.envReportStatus || "待补充"),
          initialPhotos: draft.envMonitorPhotos
        })}
        ${renderCompactPhotoUploadCard({
          title: "基地照片",
          fieldName: "photos",
          actionLabel: "上传照片",
          emptyText: "暂无基地照片",
          wide: true,
          initialPhotos: draft.photos
        })}
      </div>
    </section>
  `;
}

function renderCompactPhotoUploadCard({ title, fieldName, actionLabel, emptyText, statusField = null, wide = false, initialPhotos = [] }) {
  const serializedPhotos = escapeAttribute(JSON.stringify(normalizeTracePhotoList(initialPhotos)));
  return `
    <article class="base-media-card form-section-photo ${wide ? "is-wide" : ""}" data-photo-section>
      <div class="base-media-card-head">
        <div class="base-media-card-copy">
          <h5>${escapeHtml(title)}</h5>
          ${statusField ? `<div class="base-media-status">${renderField({ ...statusField, className: "field-compact" })}</div>` : ""}
        </div>
        <div class="photo-section-actions">
          <span class="chip neutral" data-photo-count>0 张</span>
          <button class="button ghost button-inline" type="button" data-open-photo-window>${escapeHtml(actionLabel)}</button>
        </div>
      </div>
      <input
        type="hidden"
        name="${escapeAttribute(fieldName)}"
        value="${serializedPhotos}"
        data-photo-store
        data-photo-title="${escapeAttribute(title)}"
        data-photo-empty="${escapeAttribute(emptyText)}"
      >
      <div class="photo-strip" data-photo-grid>
        <div class="photo-empty">${escapeHtml(emptyText)}</div>
      </div>
      ${renderBasePhotoWindow(title, emptyText)}
    </article>
  `;
}

function renderBaseDocumentPhotoSection(title, fieldName, actionLabel) {
  return renderTracePhotoUploadSection({
    title,
    fieldName,
    actionLabel,
    emptyText: `暂未添加${title}图片`
  });
}

function renderTracePhotoUploadSection({ title, fieldName, actionLabel, emptyText, initialPhotos = [] }) {
  const serializedPhotos = escapeAttribute(JSON.stringify(normalizeTracePhotoList(initialPhotos)));
  return `
    <section class="form-section form-section-photo" data-photo-section>
      <div class="form-section-head section-flex">
        <h4>${escapeHtml(title)}</h4>
        <div class="photo-section-actions">
          <span class="chip neutral" data-photo-count>0 张</span>
          <button class="button ghost button-inline" type="button" data-open-photo-window>${escapeHtml(actionLabel)}</button>
        </div>
      </div>
      <input
        type="hidden"
        name="${escapeAttribute(fieldName)}"
        value="${serializedPhotos}"
        data-photo-store
        data-photo-title="${escapeAttribute(title)}"
        data-photo-empty="${escapeAttribute(emptyText)}"
      >
      <div class="photo-strip" data-photo-grid>
        <div class="photo-empty">${escapeHtml(emptyText)}</div>
      </div>
      ${renderBasePhotoWindow(title, emptyText)}
    </section>
  `;
}

function renderBasePhotoWindow(title, emptyText) {
  return `
    <div class="photo-window-shell" data-photo-window hidden>
      <div class="photo-window-backdrop" data-close-photo-window></div>
      <div class="photo-window-panel" role="dialog" aria-modal="true" aria-label="${escapeAttribute(title)}">
        <div class="photo-window-header">
          <h5>${escapeHtml(title)}</h5>
          <button class="dialog-close" type="button" data-close-photo-window aria-label="关闭">✕</button>
        </div>
        <div class="photo-window-body">
          <label class="button secondary photo-picker-button">
            选择图片
            <input type="file" accept="image/*" multiple hidden data-photo-input>
          </label>
          <div class="photo-window-grid" data-photo-dialog-grid>
            <div class="photo-empty">${escapeHtml(emptyText)}</div>
          </div>
        </div>
        <div class="photo-window-foot">
          <button class="button primary" type="button" data-close-photo-window>完成</button>
        </div>
      </div>
    </div>
  `;
}

function renderTracePhotoDetailBlock(title, photos, emptyTitle, emptyCopy) {
  return `
    <div class="subsection">
      <div class="subsection-head">
        <h4>${escapeHtml(title)}</h4>
        <span class="chip neutral">${photos.length} 张</span>
      </div>
      ${photos.length ? `
        <div class="detail-photo-grid">
          ${photos.map((photo) => `
            <figure class="detail-photo-card">
              <img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.name)}">
              <figcaption>${escapeHtml(photo.name)}</figcaption>
            </figure>
          `).join("")}
        </div>
      ` : `
        <div class="empty-state compact">
          <strong>${escapeHtml(emptyTitle)}</strong>
          <span>${escapeHtml(emptyCopy)}</span>
        </div>
      `}
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
      <div class="map-editor-note">点击地图回填经纬度。</div>
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

function currentTraceProjectionCode() {
  return window.T && window.T.gq && window.T.gq.EW === 0 ? "EPSG:900913" : "EPSG:4326";
}

function createTraceTileLayer(getUrl) {
  const layer = new window.T.TileLayer("", {
    minZoom: 1,
    maxZoom: 18
  });
  layer.getTileUrl = getUrl;
  return layer;
}

function ensureTraceMapTypes() {
  if (!(window.T && window.T.MapType && window.T.TileLayer && window.T.w)) {
    return;
  }

  try {
    if (!window.TMAP_NORMAL_MAP) {
      const vectorLayer = createTraceTileLayer((tile) => {
        return currentTraceProjectionCode() === "EPSG:900913"
          ? `${window.T.w.t()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`
          : `${window.T.w.r()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`;
      });
      const vectorLabelLayer = createTraceTileLayer((tile) => {
        return currentTraceProjectionCode() === "EPSG:900913"
          ? `${window.T.w.Y()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`
          : `${window.T.w.T()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`;
      });
      window.TMAP_NORMAL_MAP = new window.T.MapType([vectorLayer, vectorLabelLayer], "TMAP_NORMAL_MAP", { a: 1 });
    }

    if (!window.TMAP_SATELLITE_MAP) {
      const imageLayer = createTraceTileLayer((tile) => {
        return currentTraceProjectionCode() === "EPSG:900913"
          ? `${window.T.w.I()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`
          : `${window.T.w.U()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`;
      });
      window.TMAP_SATELLITE_MAP = new window.T.MapType([imageLayer], "TMAP_SATELLITE_MAP");
    }

    if (!window.TMAP_HYBRID_MAP) {
      const imageLayer = createTraceTileLayer((tile) => {
        return currentTraceProjectionCode() === "EPSG:900913"
          ? `${window.T.w.I()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`
          : `${window.T.w.U()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`;
      });
      const imageLabelLayer = createTraceTileLayer((tile) => {
        return currentTraceProjectionCode() === "EPSG:900913"
          ? `${window.T.w.i()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`
          : `${window.T.w.u()}TILECOL=${tile.x}&TILEROW=${tile.y}&TILEMATRIX=${tile.z}`;
      });
      window.TMAP_HYBRID_MAP = new window.T.MapType([imageLayer, imageLabelLayer], "TMAP_HYBRID_MAP");
    }
  } catch (error) {
    // Fallback to provider default map type when custom satellite layers are unavailable.
  }
}

function getPreferredTraceMapType() {
  ensureTraceMapTypes();
  return window.TMAP_HYBRID_MAP || window.TMAP_SATELLITE_MAP || window.TMAP_NORMAL_MAP || null;
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
      ensureTraceMapTypes();
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
      const preferredMapType = getPreferredTraceMapType();
      if (preferredMapType && typeof state.map.setMapType === "function") {
        state.map.setMapType(preferredMapType);
      }
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

function bindBaseTracePhotos(root, dialog) {
  const form = root.querySelector('form[data-form-kind="primary"]');
  if (!form) {
    return;
  }
  const sections = Array.from(form.querySelectorAll("[data-photo-section]"));
  if (!sections.length) {
    return;
  }

  const controllers = sections
    .map((section) => bindTracePhotoSection(section, dialog))
    .filter(Boolean);

  if (!controllers.length) {
    return;
  }

  form._baseTracePhotoController = {
    waitUntilReady: async () => {
      await Promise.all(controllers.map((controller) => controller.waitUntilReady()));
    }
  };
}

function bindTracePhotoSection(section, dialog) {
  const storeInput = section.querySelector("[data-photo-store]");
  const openButton = section.querySelector("[data-open-photo-window]");
  const shell = section.querySelector("[data-photo-window]");
  const closeButtons = section.querySelectorAll("[data-close-photo-window]");
  const photoInput = section.querySelector("[data-photo-input]");
  const grid = section.querySelector("[data-photo-grid]");
  const dialogGrid = section.querySelector("[data-photo-dialog-grid]");
  const countPill = section.querySelector("[data-photo-count]");
  if (!storeInput || !shell || !grid || !dialogGrid) {
    return null;
  }

  const emptyText = storeInput.dataset.photoEmpty || "暂未添加图片";
  const photoTitle = storeInput.dataset.photoTitle || "图片";
  const state = {
    photos: normalizeTracePhotoList(storeInput.value),
    pendingTask: Promise.resolve()
  };

  const syncStore = () => {
    storeInput.value = JSON.stringify(state.photos);
    if (countPill) {
      countPill.textContent = `${state.photos.length} 张`;
    }
  };

  const renderGrid = (container, removable) => {
    if (!state.photos.length) {
      container.innerHTML = `<div class="photo-empty">${escapeHtml(emptyText)}</div>`;
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
    const room = Math.max(0, BASE_TRACE_MAX_PHOTOS - state.photos.length);
    if (!candidates.length || !room) {
      return;
    }
    const nextPhotos = await Promise.all(candidates.slice(0, room).map((file) => createTracePhotoRecord(file, photoTitle)));
    state.photos = [...state.photos, ...nextPhotos];
    render();
  };

  if (openButton) {
    openButton.addEventListener("click", openWindow);
  }
  closeButtons.forEach((button) => button.addEventListener("click", closeWindow));
  shell.addEventListener("click", (event) => {
    if (event.target === shell || event.target.closest("[data-close-photo-window]")) {
      closeWindow();
    }
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
    if (!removeButton) {
      return;
    }
    const photoId = removeButton.dataset.removePhoto || "";
    state.photos = state.photos.filter((photo) => photo.id !== photoId);
    render();
  });

  if (dialog) {
    dialog.addEventListener("close", closeWindow);
  }

  render();

  return {
    waitUntilReady: async () => {
      await state.pendingTask;
    }
  };
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
    ensureTraceMapTypes();
    container.innerHTML = "";
    const center = coordinates || { lng: config.defaultCenter[0], lat: config.defaultCenter[1] };
    const map = new window.T.Map(container);
    map.centerAndZoom(new window.T.LngLat(center.lng, center.lat), coordinates ? config.detailZoom : config.defaultZoom);
    const preferredMapType = getPreferredTraceMapType();
    if (preferredMapType && typeof map.setMapType === "function") {
      map.setMapType(preferredMapType);
    }
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

async function createTracePhotoRecord(file, fallbackLabel = "图片") {
  const url = await compressTracePhoto(file);
  const name = String(file && file.name ? file.name : fallbackLabel).replace(/\.[a-z0-9]+$/i, "");
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || fallbackLabel,
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
