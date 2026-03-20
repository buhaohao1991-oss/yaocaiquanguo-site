const NAV_ITEMS = [
  { id: "home", href: "index.html", title: "首页", subtitle: "工作台总览" },
  { id: "base-trace", href: "base-trace.html", title: "基地溯源", subtitle: "基地档案与归集" },
  { id: "seed-trace", href: "seed-trace.html", title: "种子溯源", subtitle: "种苗来源与到货" },
  { id: "farming-trace", href: "farming-trace.html", title: "农事溯源", subtitle: "农事记录与巡田" },
  { id: "harvest-trace", href: "harvest-trace.html", title: "采收追溯", subtitle: "采收批次与验收" },
  { id: "processing-trace", href: "processing-trace.html", title: "初加工溯源", subtitle: "净选切制与质控" },
  { id: "herb-management", href: "herb-management.html", title: "药材管理", subtitle: "药材档案与标准" },
  { id: "trace-code-management", href: "trace-code-management.html", title: "溯源码管理", subtitle: "批次赋码与绑定" },
  { id: "warehouse-management", href: "warehouse-management.html", title: "仓库管理", subtitle: "库存与仓位巡检" }
];

const WORKFLOW_ITEMS = NAV_ITEMS.filter((item) => item.id !== "home");

const SIDE_FOOTER = {
  title: "空白流程测试版",
  body: "新增记录仅保存在当前浏览器，可继续完整跑通溯源流程。"
};

const DATA_PREFIX = "trace-admin-empty-v1";
const DEFAULT_DASHBOARD = {
  meta: {
    generated_at: "2026-03-20 10:00:00",
    latest_date: "空白流程版",
    source_count: 0,
    herb_count: 0,
    covered_markets: []
  },
  status: "空白流程测试版",
  origin: {
    total: 0,
    items: []
  }
};

const MANAGERS = ["赵青林", "陈素梅", "马向东", "唐雪松", "周仁海", "胡玉兰", "梁文静", "王泽成"];
const SUPPLIERS = ["岷州种苗中心", "陇西良种库", "西峡育苗站", "亳州种源协同站", "道地种苗联合社"];
const AGRI_TEAMS = ["基地管理员", "农事巡田队", "合作社理事会", "植保组", "质控巡查组"];
const INSPECTORS = ["王晓峰", "刘绍林", "何倩文", "高玉成", "周云鹤"];
const WORKSHOPS = ["净选车间 A", "烘润车间 B", "切制一车间", "分级包装中心", "阴凉晾晒区"];
const WAREHOUSES = ["岷县一号仓", "亳州周转仓", "安国饮片仓", "玉林南仓", "西北冷藏库"];
const STORAGE_ZONES = ["A-01-03", "A-02-05", "B-03-01", "C-01-09", "D-02-07"];
const PROCESS_NAMES = ["净选", "清洗", "烘润", "切制", "分级", "包装"];
const FARM_TASKS = ["整地起垄", "补苗巡查", "病虫监测", "追肥灌溉", "采前抽样", "田间记录补录"];
const TRACE_SCENES = ["包装标签", "入库贴码", "出库交接", "质检关联", "对外查询码"];
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

const MODULE_CONFIGS = {
  "base-trace": {
    title: "基地溯源",
    kicker: "BASE TRACE",
    subtitle: "先把基地主体、负责人、面积、坐标和附件归集完整，后续批次与资料都从这里出发。",
    actionLabel: "新增基地",
    searchPlaceholder: "搜索基地名称、负责人或产地",
    tableTitle: "基地档案台账",
    tableSubtitle: "把种植主体、地块信息和基地材料拆成一页一页可查的档案。",
    nextPageId: "seed-trace",
    fields: [
      { name: "name", label: "基地名称", placeholder: "例如：甘肃岷县道地基地" },
      { name: "manager", label: "负责人", placeholder: "例如：赵青林" },
      { name: "herb", label: "主栽药材", placeholder: "例如：党参" },
      { name: "area", label: "基地面积（亩）", type: "number", placeholder: "例如：128" },
      { name: "address", label: "基地地址", placeholder: "例如：甘肃省定西市岷县" },
      { name: "longitude", label: "经度", placeholder: "例如：104.037624", optional: true },
      { name: "latitude", label: "纬度", placeholder: "例如：34.438215", optional: true }
    ],
    getRecords: (shared) => shared.baseRecords,
    searchText: (record) => [record.name, record.manager, record.address, record.herb, record.code].join(" "),
    columns: [
      { label: "基地名称", render: (record) => titleCell(record.name, `${record.herb} · ${record.code}`) },
      { label: "负责人", render: (record) => record.manager },
      { label: "基地面积", render: (record) => record.area },
      { label: "地址", render: (record) => record.address },
      { label: "完整度", render: (record) => `${record.completion}%` },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "资料", "归档"]) }
    ],
    summaryCards: (records) => {
      const done = records.filter((record) => record.statusTone === "good").length;
      const avg = average(records.map((record) => record.completion));
      return [
        { label: "基地总数", value: String(records.length), note: "已建立独立基地档案页" },
        { label: "道地品种", value: String(uniqueCount(records, "herb")), note: "以药材维度汇总基地" },
        { label: "平均完整度", value: `${avg}%`, note: "用于进入下一环节" },
        { label: "已归档基地", value: String(done), note: "资料与坐标已补齐" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.baseRecords.length + readCustomRecords("base-trace").length + 1;
      const longitude = normalizeOptionalLongitude(values.longitude, index);
      const latitude = normalizeOptionalLatitude(values.latitude, index);
      const photos = normalizeTracePhotoList(values.photos);
      const photoCount = photos.length;
      const documents = [
        "基地信息表",
        "卫星定位图",
        photoCount ? `基地照片（${photoCount}张）` : "基地照片（待补充）"
      ];
      return {
        id: recordId("BASE", index),
        code: `JD202603${String(index).padStart(3, "0")}`,
        name: values.name,
        manager: values.manager,
        herb: values.herb,
        area: `${values.area || "0"} 亩`,
        address: values.address,
        longitude,
        latitude,
        coordinateText: formatCoordinateText(longitude, latitude),
        completion: 72,
        batchCount: 1,
        fileCount: 2 + photoCount,
        stage: "建档完成",
        statusLabel: "已建档",
        statusTone: "good",
        lastUpdate: todayText(),
        note: photoCount ? `已上传 ${photoCount} 张基地照片` : "待补充基地照片",
        photos,
        photoCount,
        documents,
        actions: [`${todayText()} 新建基地档案`, `${todayText()} 生成基地编号`, `${todayText()} 等待种苗关联`]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.address} · 负责人 ${record.manager} · 主栽 ${record.herb}`,
        badges: [record.code, record.herb, record.statusLabel],
        metrics: [
          { label: "基地面积", value: record.area },
          { label: "关联批次", value: `${record.batchCount} 个` },
          { label: "资料数量", value: `${record.fileCount} 份` },
          { label: "当前阶段", value: record.stage }
        ],
        progress: { label: "档案完整度", value: `${record.completion}%`, percent: record.completion },
        extra: `${renderBaseMap(record)}${renderBasePhotos(record)}`,
        sections: [
          { title: "归档材料", items: record.documents.map((item) => ({ title: item, desc: `${record.lastUpdate} 已归集` })) },
          { title: "最近动作", items: record.actions.map((item) => ({ title: item, desc: baseTraceActionNote(record) })) }
        ]
      })
  },
  "seed-trace": {
    title: "种子溯源",
    kicker: "SEED TRACE",
    subtitle: "围绕种苗来源、供应商、到货数量和抽检结论建档，避免后续批次出现断点。",
    actionLabel: "新增种苗批次",
    searchPlaceholder: "搜索种苗批号、药材或供应商",
    tableTitle: "种苗到货台账",
    tableSubtitle: "把供种主体、到货时间和发芽率记录在单独页面中。",
    nextPageId: "farming-trace",
    fields: [
      { name: "seedBatch", label: "种苗批号", placeholder: "例如：ZZ-DS-202603-01" },
      { name: "herb", label: "药材名称", placeholder: "例如：党参" },
      { name: "baseName", label: "关联基地", placeholder: "例如：甘肃岷县道地基地" },
      { name: "supplier", label: "供种单位", placeholder: "例如：岷州种苗中心" },
      { name: "quantity", label: "到货数量（kg）", type: "number", placeholder: "例如：320" },
      { name: "germination", label: "发芽率（%）", type: "number", placeholder: "例如：94" },
      { name: "note", label: "补充说明", as: "textarea", full: true, placeholder: "可记录证照、车次、抽检单等" }
    ],
    getRecords: (shared) => shared.seedRecords,
    searchText: (record) => [record.seedBatch, record.herb, record.baseName, record.supplier].join(" "),
    columns: [
      { label: "种苗批号", render: (record) => titleCell(record.seedBatch, `${record.herb} · ${record.baseName}`) },
      { label: "供种单位", render: (record) => record.supplier },
      { label: "到货数量", render: (record) => record.quantity },
      { label: "发芽率", render: (record) => record.germination },
      { label: "到货时间", render: (record) => record.receivedAt },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "抽检", "关联"]) }
    ],
    summaryCards: (records) => {
      const pending = records.filter((record) => record.statusTone === "warn").length;
      return [
        { label: "种苗批次", value: String(records.length), note: "独立记录供种来源" },
        { label: "供应商", value: String(uniqueCount(records, "supplier")), note: "追到供种主体" },
        { label: "平均发芽率", value: `${average(records.map((record) => stripPercent(record.germination)))}%`, note: "抽样统计结果" },
        { label: "待抽检", value: String(pending), note: "需要补检测报告" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.seedRecords.length + readCustomRecords("seed-trace").length + 1;
      return {
        id: recordId("SEED", index),
        seedBatch: values.seedBatch,
        herb: values.herb,
        baseName: values.baseName,
        supplier: values.supplier,
        quantity: `${values.quantity || "0"} kg`,
        germination: `${values.germination || "0"}%`,
        receivedAt: todayText(),
        certificate: "待上传",
        statusLabel: "待抽检",
        statusTone: "warn",
        note: values.note || "由平台新增种苗到货记录",
        checks: ["到货清点待确认", "发芽率抽检待补录", "供种资质待上传"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.baseName} · 供种单位 ${record.supplier} · 到货 ${record.quantity}`,
        badges: [record.herb, record.statusLabel, record.certificate],
        metrics: [
          { label: "到货数量", value: record.quantity },
          { label: "发芽率", value: record.germination },
          { label: "关联基地", value: record.baseName },
          { label: "到货时间", value: record.receivedAt }
        ],
        progress: { label: "种苗资料完备度", value: record.statusTone === "good" ? "90%" : "64%", percent: record.statusTone === "good" ? 90 : 64 },
        sections: [
          { title: "抽检节点", items: record.checks.map((item) => ({ title: item, desc: record.note })) },
          { title: "来源信息", items: [{ title: record.supplier, desc: `${record.receivedAt} 到货，证照 ${record.certificate}` }] }
        ]
      })
  },
  "farming-trace": {
    title: "农事溯源",
    kicker: "FARMING TRACE",
    subtitle: "农事巡田、施肥、用药、天气和现场图片要拆开归档，才能形成完整过程记录。",
    actionLabel: "新增农事记录",
    searchPlaceholder: "搜索基地、任务或农事负责人",
    tableTitle: "农事过程记录",
    tableSubtitle: "参考种植溯源平台的流程，把每次巡田和作业都记录在单独页面里。",
    nextPageId: "harvest-trace",
    fields: [
      { name: "task", label: "农事类型", placeholder: "例如：补苗巡查" },
      { name: "herb", label: "药材名称", placeholder: "例如：黄连" },
      { name: "baseName", label: "关联基地", placeholder: "例如：湖北利川黄连基地" },
      { name: "operator", label: "负责人", placeholder: "例如：基地管理员" },
      { name: "recordCount", label: "记录条数", type: "number", placeholder: "例如：3" },
      { name: "weather", label: "天气概况", placeholder: "例如：18℃ / 湿度 67%" },
      { name: "note", label: "现场说明", as: "textarea", full: true, placeholder: "可记录图片、作业内容、异常情况等" }
    ],
    getRecords: (shared) => shared.farmingRecords,
    searchText: (record) => [record.task, record.herb, record.baseName, record.operator].join(" "),
    columns: [
      { label: "农事类型", render: (record) => titleCell(record.task, `${record.herb} · ${record.baseName}`) },
      { label: "负责人", render: (record) => record.operator },
      { label: "记录数", render: (record) => record.recordCount },
      { label: "天气", render: (record) => record.weather },
      { label: "计划时间", render: (record) => record.plannedDate },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "图片", "补录"]) }
    ],
    summaryCards: (records) => {
      const completed = records.filter((record) => record.statusTone === "good").length;
      return [
        { label: "农事任务", value: String(records.length), note: "按基地拆分过程记录" },
        { label: "关联基地", value: String(uniqueCount(records, "baseName")), note: "形成田间操作链路" },
        { label: "巡田负责人", value: String(uniqueCount(records, "operator")), note: "责任人单独归集" },
        { label: "已完成任务", value: String(completed), note: "可进入采收前核查" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.farmingRecords.length + readCustomRecords("farming-trace").length + 1;
      return {
        id: recordId("FARM", index),
        task: values.task,
        herb: values.herb,
        baseName: values.baseName,
        operator: values.operator,
        recordCount: `${values.recordCount || "1"} 条`,
        weather: values.weather,
        plannedDate: todayText(),
        statusLabel: "待复核",
        statusTone: "pending",
        note: values.note || "新增农事巡田记录",
        steps: ["现场填报", "图片回传", "管理员复核"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.baseName} · ${record.operator} 负责 · ${record.weather}`,
        badges: [record.herb, record.statusLabel, record.plannedDate],
        metrics: [
          { label: "记录数量", value: record.recordCount },
          { label: "天气概况", value: record.weather },
          { label: "负责人", value: record.operator },
          { label: "计划时间", value: record.plannedDate }
        ],
        progress: { label: "农事过程归档度", value: record.statusTone === "good" ? "88%" : "70%", percent: record.statusTone === "good" ? 88 : 70 },
        sections: [
          { title: "作业步骤", items: record.steps.map((item) => ({ title: item, desc: record.note })) },
          { title: "补充说明", items: [{ title: record.task, desc: record.note || "暂无补充说明" }] }
        ]
      })
  },
  "harvest-trace": {
    title: "采收追溯",
    kicker: "HARVEST TRACE",
    subtitle: "采收批次、鲜货重量、验收人员和初检状态要独立成页，便于和前后环节对上号。",
    actionLabel: "新增采收批次",
    searchPlaceholder: "搜索采收批次、基地或药材",
    tableTitle: "采收批次台账",
    tableSubtitle: "按照批次查看采收重量、验收结论和入库流向。",
    nextPageId: "processing-trace",
    fields: [
      { name: "harvestBatch", label: "采收批次", placeholder: "例如：HV-DS-202603-01" },
      { name: "herb", label: "药材名称", placeholder: "例如：党参" },
      { name: "baseName", label: "关联基地", placeholder: "例如：甘肃岷县道地基地" },
      { name: "freshWeight", label: "鲜货重量（kg）", type: "number", placeholder: "例如：860" },
      { name: "dryYield", label: "折干率（%）", type: "number", placeholder: "例如：28" },
      { name: "inspector", label: "验收人员", placeholder: "例如：王晓峰" },
      { name: "note", label: "采收说明", as: "textarea", full: true, placeholder: "可记录采收时间、现场照片、抽检单等" }
    ],
    getRecords: (shared) => shared.harvestRecords,
    searchText: (record) => [record.harvestBatch, record.herb, record.baseName, record.inspector].join(" "),
    columns: [
      { label: "采收批次", render: (record) => titleCell(record.harvestBatch, `${record.herb} · ${record.baseName}`) },
      { label: "鲜货重量", render: (record) => record.freshWeight },
      { label: "折干率", render: (record) => record.dryYield },
      { label: "验收人员", render: (record) => record.inspector },
      { label: "采收时间", render: (record) => record.harvestDate },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "质检", "入库"]) }
    ],
    summaryCards: (records) => {
      const totalFresh = sumNumbers(records.map((record) => stripUnit(record.freshWeight)));
      return [
        { label: "采收批次", value: String(records.length), note: "已拆成独立批次页" },
        { label: "鲜货总量", value: `${formatNumber(totalFresh)} kg`, note: "用于对接初加工" },
        { label: "验收人员", value: String(uniqueCount(records, "inspector")), note: "明确批次责任" },
        { label: "待质检批次", value: String(records.filter((record) => record.statusTone !== "good").length), note: "需要继续流转确认" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.harvestRecords.length + readCustomRecords("harvest-trace").length + 1;
      return {
        id: recordId("HARV", index),
        harvestBatch: values.harvestBatch,
        herb: values.herb,
        baseName: values.baseName,
        freshWeight: `${values.freshWeight || "0"} kg`,
        dryYield: `${values.dryYield || "0"}%`,
        inspector: values.inspector,
        harvestDate: todayText(),
        statusLabel: "待质检",
        statusTone: "warn",
        note: values.note || "新增采收批次",
        steps: ["采收登记", "鲜货过磅", "验收签字"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.baseName} · 验收 ${record.inspector} · 鲜货 ${record.freshWeight}`,
        badges: [record.herb, record.statusLabel, record.harvestDate],
        metrics: [
          { label: "鲜货重量", value: record.freshWeight },
          { label: "折干率", value: record.dryYield },
          { label: "验收人员", value: record.inspector },
          { label: "当前状态", value: record.statusLabel }
        ],
        progress: { label: "采收归档度", value: record.statusTone === "good" ? "92%" : "66%", percent: record.statusTone === "good" ? 92 : 66 },
        sections: [
          { title: "采收节点", items: record.steps.map((item) => ({ title: item, desc: record.note })) },
          { title: "关联说明", items: [{ title: record.harvestBatch, desc: record.note || "暂无补充说明" }] }
        ]
      })
  },
  "processing-trace": {
    title: "初加工溯源",
    kicker: "PROCESS TRACE",
    subtitle: "把净选、清洗、烘润、切制、分级这些环节拆开归档，页面上能直接看到进料与出料关系。",
    actionLabel: "新增加工记录",
    searchPlaceholder: "搜索工序编号、药材或加工车间",
    tableTitle: "初加工工序台账",
    tableSubtitle: "参考溯源流程，把采收批次进入车间后的工序和质控结果分别展示。",
    nextPageId: "herb-management",
    fields: [
      { name: "processNo", label: "工序编号", placeholder: "例如：GC-202603-01" },
      { name: "herb", label: "药材名称", placeholder: "例如：黄连" },
      { name: "inputBatch", label: "进料批次", placeholder: "例如：HV-DS-202603-01" },
      { name: "workshop", label: "加工车间", placeholder: "例如：净选车间 A" },
      { name: "outputSpec", label: "成品规格", placeholder: "例如：切制统片" },
      { name: "qcResult", label: "质检结论", placeholder: "例如：理化合格" },
      { name: "note", label: "工序说明", as: "textarea", full: true, placeholder: "可记录工艺参数、工序照片、异常点等" }
    ],
    getRecords: (shared) => shared.processingRecords,
    searchText: (record) => [record.processNo, record.herb, record.inputBatch, record.workshop].join(" "),
    columns: [
      { label: "工序编号", render: (record) => titleCell(record.processNo, `${record.herb} · ${record.inputBatch}`) },
      { label: "加工车间", render: (record) => record.workshop },
      { label: "成品规格", render: (record) => record.outputSpec },
      { label: "质检结论", render: (record) => record.qcResult },
      { label: "归档时间", render: (record) => record.archivedAt },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "工艺", "报告"]) }
    ],
    summaryCards: (records) => {
      return [
        { label: "工序记录", value: String(records.length), note: "车间工序独立建页" },
        { label: "加工车间", value: String(uniqueCount(records, "workshop")), note: "便于责任追踪" },
        { label: "关联采收批次", value: String(uniqueCount(records, "inputBatch")), note: "进料出料一一对应" },
        { label: "已归档工序", value: String(records.filter((record) => record.statusTone === "good").length), note: "可进入药材与码管理" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.processingRecords.length + readCustomRecords("processing-trace").length + 1;
      return {
        id: recordId("PROC", index),
        processNo: values.processNo,
        herb: values.herb,
        inputBatch: values.inputBatch,
        workshop: values.workshop,
        outputSpec: values.outputSpec,
        qcResult: values.qcResult,
        archivedAt: todayText(),
        statusLabel: "已归档",
        statusTone: "good",
        note: values.note || "新增初加工工序记录",
        steps: ["进料核对", "工序执行", "质检归档"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.workshop} · 进料 ${record.inputBatch} · ${record.qcResult}`,
        badges: [record.herb, record.statusLabel, record.outputSpec],
        metrics: [
          { label: "加工车间", value: record.workshop },
          { label: "进料批次", value: record.inputBatch },
          { label: "成品规格", value: record.outputSpec },
          { label: "归档时间", value: record.archivedAt }
        ],
        progress: { label: "工序归档度", value: record.statusTone === "good" ? "94%" : "75%", percent: record.statusTone === "good" ? 94 : 75 },
        sections: [
          { title: "工序节点", items: record.steps.map((item) => ({ title: item, desc: record.note })) },
          { title: "质检结论", items: [{ title: record.qcResult, desc: record.note || "暂无补充说明" }] }
        ]
      })
  },
  "herb-management": {
    title: "药材管理",
    kicker: "HERB MANAGEMENT",
    subtitle: "把药材品种、规格标准、产区和近期批次拆成管理页，避免只能从批次角度找资料。",
    actionLabel: "新增药材档案",
    searchPlaceholder: "搜索药材名称、标准或产区",
    tableTitle: "药材档案中心",
    tableSubtitle: "从药材维度看产区、规格标准、近期价格和关联批次。",
    nextPageId: "trace-code-management",
    fields: [
      { name: "herb", label: "药材名称", placeholder: "例如：黄连" },
      { name: "standard", label: "规格标准", placeholder: "例如：鸡爪连统货" },
      { name: "originZone", label: "主产区", placeholder: "例如：湖北利川" },
      { name: "annualVolume", label: "年计划量（吨）", type: "number", placeholder: "例如：32" },
      { name: "grade", label: "等级", placeholder: "例如：道地" },
      { name: "lastPrice", label: "近期价格", placeholder: "例如：335 元/kg" },
      { name: "note", label: "品种说明", as: "textarea", full: true, placeholder: "可记录标准版本、风险点、产区特征等" }
    ],
    getRecords: (shared) => shared.herbRecords,
    searchText: (record) => [record.herb, record.standard, record.originZone, record.grade].join(" "),
    columns: [
      { label: "药材名称", render: (record) => titleCell(record.herb, `${record.standard} · ${record.grade}`) },
      { label: "主产区", render: (record) => record.originZone },
      { label: "年计划量", render: (record) => record.annualVolume },
      { label: "近期价格", render: (record) => record.lastPrice },
      { label: "最近批次", render: (record) => record.recentBatch },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "标准", "批次"]) }
    ],
    summaryCards: (records) => {
      return [
        { label: "药材档案", value: String(records.length), note: "按品种集中管理" },
        { label: "主产区", value: String(uniqueCount(records, "originZone")), note: "支持按产区回查" },
        { label: "道地品种", value: String(records.filter((record) => record.grade.includes("道地")).length), note: "可重点管控" },
        { label: "标准有效", value: String(records.filter((record) => record.statusTone === "good").length), note: "当前标准已关联" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.herbRecords.length + readCustomRecords("herb-management").length + 1;
      return {
        id: recordId("HERB", index),
        herb: values.herb,
        standard: values.standard,
        originZone: values.originZone,
        annualVolume: `${values.annualVolume || "0"} 吨`,
        grade: values.grade,
        lastPrice: values.lastPrice,
        recentBatch: `BATCH-NEW-${String(index).padStart(3, "0")}`,
        statusLabel: "标准已关联",
        statusTone: "good",
        note: values.note || "新增药材档案",
        highlights: ["标准版本已记录", "可回查最近批次", "支持后续赋码"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.originZone} · ${record.standard} · 近期价格 ${record.lastPrice}`,
        badges: [record.grade, record.statusLabel, record.recentBatch],
        metrics: [
          { label: "年计划量", value: record.annualVolume },
          { label: "主产区", value: record.originZone },
          { label: "最近批次", value: record.recentBatch },
          { label: "当前等级", value: record.grade }
        ],
        progress: { label: "药材档案完整度", value: record.statusTone === "good" ? "91%" : "73%", percent: record.statusTone === "good" ? 91 : 73 },
        sections: [
          { title: "管理重点", items: record.highlights.map((item) => ({ title: item, desc: record.note })) },
          { title: "品种说明", items: [{ title: record.herb, desc: record.note || "暂无补充说明" }] }
        ]
      })
  },
  "trace-code-management": {
    title: "药材溯源码管理",
    kicker: "TRACE CODE",
    subtitle: "把印码、激活、绑定批次和扫码场景独立出来，这样每个码段都能追到具体批次。",
    actionLabel: "新增码段",
    searchPlaceholder: "搜索码段、绑定批次或药材",
    tableTitle: "溯源码批次台账",
    tableSubtitle: "每个码段单独管理，直接看到印码数量、激活量和绑定对象。",
    nextPageId: "warehouse-management",
    fields: [
      { name: "codeRange", label: "码段范围", placeholder: "例如：TCM-202603-001~500" },
      { name: "herb", label: "药材名称", placeholder: "例如：黄连" },
      { name: "boundBatch", label: "绑定批次", placeholder: "例如：GC-202603-01" },
      { name: "printed", label: "印码数量", type: "number", placeholder: "例如：500" },
      { name: "activated", label: "已激活数量", type: "number", placeholder: "例如：320" },
      { name: "scene", label: "扫码场景", placeholder: "例如：包装标签" },
      { name: "note", label: "赋码说明", as: "textarea", full: true, placeholder: "可记录绑定规则、印码批次、扫码用途等" }
    ],
    getRecords: (shared) => shared.traceCodeRecords,
    searchText: (record) => [record.codeRange, record.herb, record.boundBatch, record.scene].join(" "),
    columns: [
      { label: "码段范围", render: (record) => titleCell(record.codeRange, `${record.herb} · ${record.boundBatch}`) },
      { label: "印码数量", render: (record) => record.printed },
      { label: "已激活", render: (record) => record.activated },
      { label: "使用率", render: (record) => record.activationRate },
      { label: "扫码场景", render: (record) => record.scene },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "绑定", "扫码"]) }
    ],
    summaryCards: (records) => {
      return [
        { label: "码段数量", value: String(records.length), note: "按批次分配独立码段" },
        { label: "绑定批次", value: String(uniqueCount(records, "boundBatch")), note: "追到具体工序或批次" },
        { label: "总激活量", value: formatNumber(sumNumbers(records.map((record) => stripUnit(record.activated)))), note: "已激活溯源码数量" },
        { label: "在用码段", value: String(records.filter((record) => record.statusTone === "good").length), note: "当前可以扫码回查" }
      ];
    },
    createRecord: (values, shared) => {
      const printed = Number(values.printed || 0);
      const activated = Number(values.activated || 0);
      const index = shared.traceCodeRecords.length + readCustomRecords("trace-code-management").length + 1;
      return {
        id: recordId("CODE", index),
        codeRange: values.codeRange,
        herb: values.herb,
        boundBatch: values.boundBatch,
        printed: `${printed} 枚`,
        activated: `${activated} 枚`,
        activationRate: `${printed > 0 ? Math.round((activated / printed) * 100) : 0}%`,
        scene: values.scene,
        statusLabel: activated > 0 ? "已绑定" : "待启用",
        statusTone: activated > 0 ? "good" : "pending",
        note: values.note || "新增赋码记录",
        checkpoints: ["码段生成", "批次绑定", "扫码验证"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.boundBatch} · ${record.scene} · 已激活 ${record.activated}`,
        badges: [record.herb, record.statusLabel, record.activationRate],
        metrics: [
          { label: "码段范围", value: record.codeRange },
          { label: "印码数量", value: record.printed },
          { label: "已激活", value: record.activated },
          { label: "绑定批次", value: record.boundBatch }
        ],
        progress: { label: "码段使用率", value: record.activationRate, percent: stripPercent(record.activationRate) },
        sections: [
          { title: "赋码流程", items: record.checkpoints.map((item) => ({ title: item, desc: record.note })) },
          { title: "扫码场景", items: [{ title: record.scene, desc: record.note || "暂无补充说明" }] }
        ]
      })
  },
  "warehouse-management": {
    title: "仓库管理",
    kicker: "WAREHOUSE",
    subtitle: "仓位、库存、温湿度和复检状态要独立成页，才能把前面的溯源链闭环到出入库。",
    actionLabel: "新增仓位记录",
    searchPlaceholder: "搜索仓库、库位或批次",
    tableTitle: "仓库库存台账",
    tableSubtitle: "把在库批次、环境指标和复检状态单独管理，形成最终闭环。",
    fields: [
      { name: "warehouse", label: "仓库名称", placeholder: "例如：岷县一号仓" },
      { name: "boundBatch", label: "关联批次", placeholder: "例如：GC-202603-01" },
      { name: "herb", label: "药材名称", placeholder: "例如：黄连" },
      { name: "stock", label: "库存重量（kg）", type: "number", placeholder: "例如：620" },
      { name: "temperature", label: "温度（℃）", type: "number", placeholder: "例如：18" },
      { name: "humidity", label: "湿度（%）", type: "number", placeholder: "例如：58" },
      { name: "note", label: "仓储说明", as: "textarea", full: true, placeholder: "可记录库位、出入库、复检时间等" }
    ],
    getRecords: (shared) => shared.warehouseRecords,
    searchText: (record) => [record.warehouse, record.boundBatch, record.herb, record.location].join(" "),
    columns: [
      { label: "仓库 / 库位", render: (record) => titleCell(record.warehouse, `${record.location} · ${record.herb}`) },
      { label: "关联批次", render: (record) => record.boundBatch },
      { label: "库存", render: (record) => record.stock },
      { label: "温湿度", render: (record) => `${record.temperature} / ${record.humidity}` },
      { label: "复检日期", render: (record) => record.recheckAt },
      { label: "状态", render: (record) => statusPill(record.statusLabel, record.statusTone) },
      { label: "操作", render: () => actionCell(["详情", "巡检", "出库"]) }
    ],
    summaryCards: (records) => {
      return [
        { label: "在库记录", value: String(records.length), note: "每条库存独立管理" },
        { label: "仓库数量", value: String(uniqueCount(records, "warehouse")), note: "支持多仓追踪" },
        { label: "总库存", value: `${formatNumber(sumNumbers(records.map((record) => stripUnit(record.stock))))} kg`, note: "当前在库药材重量" },
        { label: "待复检", value: String(records.filter((record) => record.statusTone === "warn").length), note: "需要继续巡检处理" }
      ];
    },
    createRecord: (values, shared) => {
      const index = shared.warehouseRecords.length + readCustomRecords("warehouse-management").length + 1;
      return {
        id: recordId("WARE", index),
        warehouse: values.warehouse,
        boundBatch: values.boundBatch,
        herb: values.herb,
        stock: `${values.stock || "0"} kg`,
        temperature: `${values.temperature || "0"}℃`,
        humidity: `${values.humidity || "0"}%`,
        location: STORAGE_ZONES[index % STORAGE_ZONES.length],
        recheckAt: todayText(),
        statusLabel: "在库",
        statusTone: "good",
        note: values.note || "新增仓位记录",
        checks: ["入库登记", "环境巡检", "复检提醒"]
      };
    },
    detail: (record) =>
      renderDetail(record, {
        summary: `${record.warehouse} · ${record.location} · 关联 ${record.boundBatch}`,
        badges: [record.herb, record.statusLabel, record.recheckAt],
        metrics: [
          { label: "库存重量", value: record.stock },
          { label: "温度", value: record.temperature },
          { label: "湿度", value: record.humidity },
          { label: "库位", value: record.location }
        ],
        progress: { label: "仓储监控完备度", value: record.statusTone === "good" ? "89%" : "68%", percent: record.statusTone === "good" ? 89 : 68 },
        sections: [
          { title: "巡检节点", items: record.checks.map((item) => ({ title: item, desc: record.note })) },
          { title: "仓储说明", items: [{ title: record.warehouse, desc: record.note || "暂无补充说明" }] }
        ]
      })
  }
};

const APP_STATE = {
  query: "",
  selectedId: ""
};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }

  const pageId = document.body.dataset.page || "home";
  const dashboard = await loadDashboard();
  const shared = buildSharedData(dashboard);
  renderPage(root, pageId, dashboard, shared);
}

async function loadDashboard() {
  try {
    const response = await fetch("data/dashboard.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`dashboard request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return DEFAULT_DASHBOARD;
  }
}

function renderPage(root, pageId, dashboard, shared) {
  if (pageId === "home") {
    document.title = "中药材溯源平台";
    root.innerHTML = renderHomePage(pageId);
    bindHome(root);
    return;
  }

  const config = MODULE_CONFIGS[pageId];
  if (!config) {
    document.title = "中药材溯源平台";
    root.innerHTML = renderHomePage("home");
    bindHome(root);
    return;
  }

  document.title = `中药材溯源平台 - ${config.title}`;
  const allRecords = getPageRecords(pageId, shared);
  const filtered = filterRecords(allRecords, APP_STATE.query, config.searchText);
  const selected = pickSelectedRecord(filtered, allRecords, APP_STATE.selectedId);
  root.innerHTML = renderModulePage(config, pageId, allRecords, filtered, selected);
  bindModule(root, config, dashboard, shared, pageId);
}

function renderHomePage(activeId) {
  return `
    <div class="app-shell">
      ${renderSidebar(activeId)}
      <main class="main home-main">
        <section class="home-hero">
          <div class="home-hero-copy">
            <span class="section-caption">中药材全流程追溯</span>
            <h2>中药材溯源平台</h2>
            <p>围绕基地、批次、质检与仓储，统一进入各模块独立台账。</p>
            <div class="home-actions">
              <a class="button primary" href="base-trace.html">开始基地建档</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;
}

function renderModulePage(config, pageId, allRecords, filteredRecords, selectedRecord) {
  const tableContent = filteredRecords.length
    ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((record) => renderTableRow(config, record, selectedRecord)).join("")}
          </tbody>
        </table>
      </div>
    `
    : `<div class="empty">${allRecords.length ? `没有找到符合条件的${escapeHtml(config.title)}记录。` : `当前还没有${escapeHtml(config.title)}记录，请先新增第一条数据。`}</div>`;

  return `
    <div class="app-shell">
      ${renderSidebar(pageId)}
      <main class="main module-main">
        <header class="page-header">
          <div class="page-header-main">
            <span class="section-caption">业务模块</span>
            <h2>${escapeHtml(config.title)}</h2>
            <p>${escapeHtml(config.subtitle)}</p>
          </div>
        </header>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <h3>${escapeHtml(config.tableTitle)}</h3>
              <p>${escapeHtml(config.tableSubtitle)}</p>
            </div>
            <div class="panel-actions">
              <button class="button primary" type="button" data-open-dialog>${escapeHtml(config.actionLabel)}</button>
            </div>
          </div>
          <div class="panel-body">
            ${allRecords.length
              ? `
              <div class="panel-layout">
                <div>
                  ${tableContent}
                </div>
                <aside class="detail-panel">
                  <section class="panel panel-subtle">
                    <div class="panel-header">
                      <div class="panel-title">
                        <h3>当前详情</h3>
                        <p>仅展示当前模块选中记录的关键信息。</p>
                      </div>
                    </div>
                    <div class="panel-body">
                      ${selectedRecord ? config.detail(selectedRecord) : `<div class="empty">当前没有可展示的记录，请先新增一条数据。</div>`}
                    </div>
                  </section>
                </aside>
              </div>
              `
              : tableContent}
          </div>
        </section>
        ${renderDialog(config, pageId)}
      </main>
    </div>
  `;
}

function renderSidebar(activeId) {
  return `
    <aside class="sidebar">
      <div class="nav-caption">模块导航</div>
      <nav class="nav-group">
        ${NAV_ITEMS.map((item) => renderNavItem(item, activeId)).join("")}
      </nav>
      <div class="sidebar-foot">
        <span class="sidebar-foot-label">当前环境</span>
        <strong>${escapeHtml(SIDE_FOOTER.title)}</strong>
        <p>${escapeHtml(SIDE_FOOTER.body)}</p>
      </div>
    </aside>
  `;
}

function renderNavItem(item, activeId) {
  return `
    <a class="nav-item ${item.id === activeId ? "is-active" : ""}" href="${item.href}">
      <span class="nav-icon" aria-hidden="true">${renderNavIcon(item.id)}</span>
      <span class="nav-text">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.subtitle)}</span>
      </span>
    </a>
  `;
}

function renderNavIcon(id) {
  const icons = {
    home: `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    `,
    "base-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 20V10" />
        <path d="M12 12C9.6 9.8 7.1 9.9 5.5 12C8 12.8 10 12.8 12 12Z" />
        <path d="M12 12C14.4 9.8 16.9 9.9 18.5 12C16 12.8 14 12.8 12 12Z" />
        <path d="M6 20H18" />
      </svg>
    `,
    "seed-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 19C15.3 19 18 16.2 18 12.8C18 9.6 15.9 6.9 12 5C8.1 6.9 6 9.6 6 12.8C6 16.2 8.7 19 12 19Z" />
        <path d="M12 9V16" />
      </svg>
    `,
    "farming-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M8 4H16L18 6V20H6V6L8 4Z" />
        <path d="M9 10H15" />
        <path d="M9 14H13" />
      </svg>
    `,
    "harvest-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M7 10L12 5L17 10" />
        <path d="M8 11H16L17.5 18H6.5L8 11Z" />
      </svg>
    `,
    "processing-trace": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 7H18" />
        <path d="M9 7V17" />
        <path d="M15 7V17" />
        <path d="M6 17H18" />
      </svg>
    `,
    "herb-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 5.5H13.5C15.2 5.5 16.5 6.8 16.5 8.5V18.5H9C7.3 18.5 6 17.2 6 15.5V5.5Z" />
        <path d="M9 9H13.5" />
        <path d="M9 12.5H13.5" />
      </svg>
    `,
    "trace-code-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="5" height="5" rx="1" />
        <rect x="15" y="4" width="5" height="5" rx="1" />
        <rect x="4" y="15" width="5" height="5" rx="1" />
        <path d="M15 15H17V17H20" />
        <path d="M17 20V17" />
      </svg>
    `,
    "warehouse-management": `
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 10L12 5L20 10" />
        <path d="M6 10V19H18V10" />
        <path d="M10 19V14H14V19" />
      </svg>
    `
  };
  return icons[id] || icons.home;
}

function renderTableRow(config, record, selectedRecord) {
  return `
    <tr data-record-id="${escapeAttribute(record.id)}" class="${selectedRecord && selectedRecord.id === record.id ? "is-active" : ""}">
      ${config.columns.map((column) => `<td data-label="${escapeAttribute(column.label)}">${column.render(record)}</td>`).join("")}
    </tr>
  `;
}

function renderDialog(config, pageId) {
  const dialogClass = isTraceMapPage(pageId) ? "dialog dialog-map-enabled" : "dialog";
  const bodyContent = isTraceMapPage(pageId)
    ? renderTraceMapDialogBody(config, pageId)
    : `
        <div class="form-grid">
          ${config.fields.map((field) => renderField(field, pageId)).join("")}
        </div>
      `;
  return `
    <dialog class="${dialogClass}" data-record-dialog>
      <div class="dialog-header">
        <div class="dialog-title">
          <h4>${escapeHtml(config.actionLabel)}</h4>
        </div>
        <button class="dialog-close" type="button" data-close-dialog aria-label="关闭">✕</button>
      </div>
      <form class="dialog-body" data-create-form>
        ${bodyContent}
        <div class="form-foot">
          <span class="helper">保存后会自动出现在当前模块的独立页面台账里。</span>
          <div class="panel-actions">
            <button class="button ghost" type="button" data-close-dialog>取消</button>
            <button class="button primary" type="submit">保存记录</button>
          </div>
        </div>
      </form>
    </dialog>
  `;
}

function renderTraceMapDialogBody(config, pageId) {
  const mainFields = config.fields;
  return `
      <div class="dialog-map-layout">
        <div class="dialog-form-column">
          <section class="dialog-section">
            <div class="dialog-section-head">
              <h5>基础信息</h5>
            </div>
            <div class="form-grid form-grid-map">
              ${mainFields.map((field) => renderField(field, pageId)).join("")}
            </div>
          </section>
          ${renderBasePhotoSection()}
      </div>
      <aside class="dialog-map-column">
        ${renderBaseMapEditor()}
      </aside>
    </div>
  `;
}

function renderBasePhotoSection() {
  return `
    <section class="dialog-section dialog-section-photo">
      <div class="dialog-section-head dialog-section-head-actions">
        <h5>基地照片</h5>
        <div class="photo-section-actions">
          <span class="photo-count-pill" data-photo-count>0 张</span>
          <button class="button ghost button-inline" type="button" data-open-photo-window>增加照片</button>
        </div>
      </div>
      <input type="hidden" name="photos" value="[]" data-photo-store>
      <div class="photo-strip" data-photo-grid>
        <div class="photo-empty">暂未添加照片</div>
      </div>
      ${renderBasePhotoWindow()}
    </section>
  `;
}

function renderBasePhotoWindow() {
  return `
    <div class="photo-window-shell" data-photo-window hidden>
      <div class="photo-window-backdrop" data-close-photo-window></div>
      <div class="photo-window-panel" role="dialog" aria-modal="true" aria-label="基地照片">
        <div class="photo-window-header">
          <h5>基地照片</h5>
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
  `;
}

function renderField(field, pageId) {
  const type = field.type || "text";
  const fieldClass = field.full ? "field is-full" : "field";
  const required = field.optional ? "" : "required";
  const attributes = [];
  if (isTraceMapPage(pageId) && field.name === "address") {
    attributes.push('data-map-address-input');
  }
  if (isTraceMapPage(pageId) && field.name === "longitude") {
    attributes.push('data-map-longitude-input');
    attributes.push('inputmode="decimal"');
  }
  if (isTraceMapPage(pageId) && field.name === "latitude") {
    attributes.push('data-map-latitude-input');
    attributes.push('inputmode="decimal"');
  }
  const attributeText = attributes.length ? ` ${attributes.join(" ")}` : "";
  if (field.as === "textarea") {
    return `
      <div class="${fieldClass}">
        <label>${escapeHtml(field.label)}</label>
        <textarea name="${escapeAttribute(field.name)}" placeholder="${escapeAttribute(field.placeholder || "")}" ${required}></textarea>
      </div>
    `;
  }

  if (field.options) {
    return `
      <div class="${fieldClass}">
        <label>${escapeHtml(field.label)}</label>
        <select name="${escapeAttribute(field.name)}" ${required}>
          <option value="">请选择</option>
          ${field.options.map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`).join("")}
        </select>
      </div>
    `;
  }

  if (isTraceMapPage(pageId) && field.name === "address") {
    return `
      <div class="${fieldClass}">
        <label>${escapeHtml(field.label)}</label>
        <div class="field-inline">
          <input name="${escapeAttribute(field.name)}" type="${escapeAttribute(type)}" placeholder="${escapeAttribute(field.placeholder || "")}" ${required}${attributeText}>
          <button class="button ghost button-inline" type="button" data-open-map-search>地图定位</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="${fieldClass}">
      <label>${escapeHtml(field.label)}</label>
      <input name="${escapeAttribute(field.name)}" type="${escapeAttribute(type)}" placeholder="${escapeAttribute(field.placeholder || "")}" ${required}${attributeText}>
    </div>
  `;
}

function renderBaseMapEditor() {
  const config = getTraceMapConfig();
  const mapReady = Boolean(config.tk);
  const emptyMessage = mapReady ? "地图加载中..." : "未配置天地图 Key，当前仍可手动填写经纬度。";
  return `
    <section class="map-editor-card" data-base-map-editor>
      <div class="map-editor-head">
        <h5>卫星定位</h5>
      </div>
      <div class="map-toolbar">
        <input class="map-search-input" type="search" placeholder="搜索地址或地名" data-map-search-input ${mapReady ? "" : "disabled"}>
        <button class="button secondary map-search-button" type="button" data-map-search ${mapReady ? "" : "disabled"}>搜索</button>
      </div>
      <div class="trace-live-map" data-trace-map-editor-canvas>
        <div class="trace-live-map-state" data-trace-map-editor-empty>${emptyMessage}</div>
      </div>
    </section>
  `;
}

function bindHome(root) {
  const clearButtons = root.querySelectorAll("[data-clear-demo]");
  clearButtons.forEach((button) => {
    button.addEventListener("click", () => {
      clearCustomData();
      window.location.reload();
    });
  });
}

function bindModule(root, config, dashboard, shared, pageId) {
  const dialog = root.querySelector("[data-record-dialog]");
  const searchInput = root.querySelector("[data-search-input]");
  const openButtons = root.querySelectorAll("[data-open-dialog]");
  const closeButtons = root.querySelectorAll("[data-close-dialog]");
  const form = root.querySelector("[data-create-form]");
  const rows = root.querySelectorAll("[data-record-id]");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      APP_STATE.query = event.target.value;
      renderPage(root, pageId, dashboard, shared);
    });
  }

  rows.forEach((row) => {
    row.addEventListener("click", () => {
      APP_STATE.selectedId = row.dataset.recordId || "";
      renderPage(root, pageId, dashboard, shared);
    });
  });

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (dialog) {
        dialog.showModal();
        if (isTraceMapPage(pageId)) {
          window.requestAnimationFrame(() => {
            activateBaseTraceMap(root);
          });
        }
      }
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (dialog) {
        dialog.close();
      }
    });
  });

  if (isTraceMapPage(pageId)) {
    bindBaseTraceMap(root, dialog);
    bindBaseTracePhotos(root, dialog);
    bindBaseTracePreviewMaps(root);
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form._baseTracePhotoController) {
        await form._baseTracePhotoController.waitUntilReady();
      }
      const values = Object.fromEntries(new FormData(form).entries());
      const record = config.createRecord(normalizeValues(values), shared);
      const records = readCustomRecords(pageId);
      records.unshift(record);
      writeCustomRecords(pageId, records);
      APP_STATE.selectedId = record.id;
      APP_STATE.query = "";
      if (dialog) {
        dialog.close();
      }
      renderPage(root, pageId, dashboard, buildSharedData(dashboard));
    });
  }
}

function getPageRecords(pageId, shared) {
  const config = MODULE_CONFIGS[pageId];
  if (!config) {
    return [];
  }
  return [...config.getRecords(shared), ...readCustomRecords(pageId)];
}

function pickSelectedRecord(filtered, allRecords, selectedId) {
  if (!filtered.length) {
    return null;
  }
  if (selectedId) {
    return filtered.find((record) => record.id === selectedId) || filtered[0] || null;
  }
  return filtered[0] || null;
}

function filterRecords(records, query, searchText) {
  if (!query) {
    return records;
  }
  const lowered = query.trim().toLowerCase();
  return records.filter((record) => searchText(record).toLowerCase().includes(lowered));
}

function buildSharedData(dashboard) {
  return {
    baseRecords: [],
    seedRecords: [],
    farmingRecords: [],
    harvestRecords: [],
    processingRecords: [],
    herbRecords: [],
    traceCodeRecords: [],
    warehouseRecords: [],
    activities: []
  };
}

function renderDetail(record, { summary, badges, metrics, progress, sections, extra = "" }) {
  return `
    <div class="detail-hero">
      <h4>${escapeHtml(detailTitle(record))}</h4>
      <p>${escapeHtml(summary)}</p>
      <div class="badge-row">
        ${badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}
      </div>
    </div>
    <div class="metric-grid">
      ${metrics.map((metric) => `
        <div class="metric-box">
          <div class="label">${escapeHtml(metric.label)}</div>
          <div class="value">${escapeHtml(metric.value)}</div>
        </div>
      `).join("")}
    </div>
    <div class="progress">
      <div class="progress-head">
        <span>${escapeHtml(progress.label)}</span>
        <strong>${escapeHtml(progress.value)}</strong>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${clamp(progress.percent, 0, 100)}%;"></div>
      </div>
    </div>
    ${extra}
    ${sections.map((section) => `
      <div class="subsection">
        <h5>${escapeHtml(section.title)}</h5>
        <div class="list-grid">
          ${section.items.map((item) => `
            <div class="list-item">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.desc)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")}
  `;
}

function detailTitle(record) {
  return record.name || record.seedBatch || record.task || record.harvestBatch || record.processNo || record.herb || record.codeRange || record.warehouse || "当前记录";
}

function renderBaseMap(record) {
  const coordinates = readTraceMapCoordinates(record);
  const coordinateText = coordinates ? formatCoordinateText(coordinates.lng, coordinates.lat) : "未补充坐标";
  const mapStatus = coordinates ? "已完成定位" : "待补充定位";
  return `
    <div class="subsection">
      <div class="trace-map-card">
        <div class="trace-map-head">
          <div>
            <h5>基地地图</h5>
            <p>${escapeHtml(record.address)}</p>
          </div>
          <span class="trace-map-code">${escapeHtml(record.code || "地图定位")}</span>
        </div>
        <div
          class="trace-map-preview"
          data-trace-map-preview
          data-name="${escapeAttribute(record.name || "")}"
          data-address="${escapeAttribute(record.address || "")}"
          data-lng="${escapeAttribute(coordinates ? coordinates.lng.toFixed(6) : "")}"
          data-lat="${escapeAttribute(coordinates ? coordinates.lat.toFixed(6) : "")}"
        >
          <div class="trace-live-map-state">地图加载中...</div>
        </div>
        <div class="trace-map-meta">
          <div class="trace-map-stat">
            <span>定位坐标</span>
            <strong>${escapeHtml(coordinateText)}</strong>
          </div>
          <div class="trace-map-stat">
            <span>地块范围</span>
            <strong>${escapeHtml(record.area)}</strong>
          </div>
          <div class="trace-map-stat">
            <span>地图状态</span>
            <strong>${escapeHtml(mapStatus)}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBasePhotos(record) {
  const photos = normalizeTracePhotoList(record && record.photos);
  return `
    <div class="subsection">
      <h5>基地照片</h5>
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
        <div class="empty empty-compact">暂未上传基地照片</div>
      `}
    </div>
  `;
}

function baseTraceActionNote(record) {
  const photos = normalizeTracePhotoList(record && record.photos);
  return photos.length ? `已归集 ${photos.length} 张基地照片` : "待补充基地照片";
}

function bindBaseTraceMap(root, dialog) {
  const form = root.querySelector("[data-create-form]");
  if (!form) {
    return;
  }

  const section = form.querySelector("[data-base-map-editor]");
  const addressInput = form.querySelector("[data-map-address-input]");
  const longitudeInput = form.querySelector("[data-map-longitude-input]");
  const latitudeInput = form.querySelector("[data-map-latitude-input]");
  const searchInput = form.querySelector("[data-map-search-input]");
  const searchButtons = root.querySelectorAll("[data-map-search]");
  const openMapButton = form.querySelector("[data-open-map-search]");
  const syncCoordinatesButton = form.querySelector("[data-map-sync-coordinates]");
  const mapCanvas = form.querySelector("[data-trace-map-editor-canvas]");
  const emptyState = form.querySelector("[data-trace-map-editor-empty]");
  const feedback = form.querySelector("[data-map-feedback]");
  const layerButtons = form.querySelectorAll("[data-map-layer]");
  const config = getTraceMapConfig();
  const hasKey = Boolean(config.tk);
  const state = {
    map: null,
    marker: null,
    layer: "satellite",
    loading: false
  };

  const setFeedback = (message, tone = "muted") => {
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.dataset.tone = tone;
  };

  const setEmptyState = (message) => {
    if (!emptyState) {
      return;
    }
    emptyState.textContent = message;
    emptyState.hidden = false;
  };

  const hideEmptyState = () => {
    if (!emptyState) {
      return;
    }
    emptyState.hidden = true;
  };

  const updateLayerButtons = () => {
    layerButtons.forEach((button) => {
      const isActive = (button.dataset.mapLayer || "normal") === state.layer;
      button.classList.toggle("is-active", isActive);
    });
  };

  const syncSearchFromAddress = () => {
    if (searchInput && document.activeElement !== searchInput) {
      searchInput.value = addressInput ? addressInput.value : "";
    }
  };

  const syncAddressFromSearch = () => {
    if (addressInput) {
      addressInput.value = searchInput ? searchInput.value : "";
    }
  };

  const getTypedCoordinates = () => {
    const lng = parseOptionalCoordinate(longitudeInput ? longitudeInput.value : "", 73, 135);
    const lat = parseOptionalCoordinate(latitudeInput ? latitudeInput.value : "", 18, 54);
    if (lng === null || lat === null) {
      return null;
    }
    return { lng, lat };
  };

  const updateLayer = () => {
    updateLayerButtons();
    if (!state.map) {
      return;
    }
    ensureTraceMapTypes();
    const layer = state.layer === "satellite"
      ? (window.TMAP_HYBRID_MAP || window.TMAP_SATELLITE_MAP || window.TMAP_NORMAL_MAP)
      : window.TMAP_NORMAL_MAP;
    if (layer) {
      state.map.setMapType(layer);
    }
  };

  const placeMarker = async (lng, lat, options = {}) => {
    if (!state.map) {
      return;
    }

    const zoom = options.zoom || config.searchZoom;
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

    if (options.reverseGeocode && hasKey) {
      try {
        const address = await reverseGeocodeTraceLocation(lng, lat);
        if (address && addressInput) {
          addressInput.value = address;
          syncSearchFromAddress();
        }
      } catch (error) {
        setFeedback("已回填经纬度，可继续手动补充基地地址。", "warn");
      }
    }
  };

  const ensureMap = async () => {
    if (!mapCanvas || !section) {
      return null;
    }

    if (!hasKey) {
      setFeedback("未配置天地图 Key，当前仍可手动填写经纬度。", "warn");
      setEmptyState("未配置天地图 Key，当前仍可手动填写经纬度。");
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
    setFeedback("地图加载中...", "muted");

    try {
      await loadTraceMapSdk();
      ensureTraceMapTypes();
      hideEmptyState();
      const initialCoordinates = getTypedCoordinates();
      const center = initialCoordinates || {
        lng: config.defaultCenter[0],
        lat: config.defaultCenter[1]
      };
      state.map = new window.T.Map(mapCanvas);
      state.map.centerAndZoom(new window.T.LngLat(center.lng, center.lat), initialCoordinates ? config.detailZoom : config.defaultZoom);
      if (typeof state.map.enableScrollWheelZoom === "function") {
        state.map.enableScrollWheelZoom();
      }
      updateLayer();

      if (initialCoordinates) {
        await placeMarker(initialCoordinates.lng, initialCoordinates.lat, { zoom: config.detailZoom });
      }

      state.map.addEventListener("click", async (event) => {
        const clickedPoint = event && (event.lnglat || event.lngLat);
        if (!clickedPoint) {
          return;
        }
        const lng = Number(clickedPoint.getLng ? clickedPoint.getLng() : clickedPoint.lng);
        const lat = Number(clickedPoint.getLat ? clickedPoint.getLat() : clickedPoint.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          return;
        }
        await placeMarker(lng, lat, { zoom: config.searchZoom, reverseGeocode: true });
        setFeedback("已根据地图点击更新坐标。", "success");
      });

      setFeedback("可搜索地址并点击地图回填经纬度。", "muted");
      return state.map;
    } catch (error) {
      setEmptyState("天地图加载失败，请检查 tk 或网络。");
      setFeedback("天地图加载失败，请检查 tk 或网络。", "danger");
      return null;
    } finally {
      state.loading = false;
    }
  };

  const searchAddress = async () => {
    const keyword = (searchInput && searchInput.value.trim()) || (addressInput && addressInput.value.trim()) || "";
    if (!keyword) {
      setFeedback("请先输入基地地址后再搜索定位。", "warn");
      if (addressInput) {
        addressInput.focus();
      }
      return;
    }

    if (addressInput) {
      addressInput.value = keyword;
    }
    if (searchInput) {
      searchInput.value = keyword;
    }

    const map = await ensureMap();
    if (!map) {
      return;
    }

    setFeedback("正在搜索地址...", "muted");

    try {
      const coordinates = await geocodeTraceAddress(keyword);
      await placeMarker(coordinates.lng, coordinates.lat, { zoom: config.searchZoom });
      setFeedback(`已定位到 ${keyword}。`, "success");
    } catch (error) {
      setFeedback(error.message || "未找到对应地址，请换更完整的行政区和地点信息。", "danger");
    }
  };

  const syncCoordinatesToMap = async () => {
    const coordinates = getTypedCoordinates();
    if (!coordinates) {
      setFeedback("请输入有效的经纬度后再定位。", "warn");
      return;
    }
    const map = await ensureMap();
    if (!map) {
      return;
    }
    await placeMarker(coordinates.lng, coordinates.lat, { zoom: config.detailZoom });
    setFeedback("已按当前经纬度完成定位。", "success");
  };

  if (addressInput) {
    addressInput.addEventListener("input", syncSearchFromAddress);
  }
  if (searchInput) {
    searchInput.addEventListener("input", syncAddressFromSearch);
  }
  if (openMapButton) {
    openMapButton.addEventListener("click", async () => {
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      await searchAddress();
    });
  }
  searchButtons.forEach((button) => {
    button.addEventListener("click", searchAddress);
  });
  if (syncCoordinatesButton) {
    syncCoordinatesButton.addEventListener("click", syncCoordinatesToMap);
  }
  [longitudeInput, latitudeInput].forEach((input) => {
    if (!input) {
      return;
    }
    input.addEventListener("change", syncCoordinatesToMap);
  });
  layerButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      state.layer = button.dataset.mapLayer || "normal";
      updateLayerButtons();
      const map = await ensureMap();
      if (map) {
        updateLayer();
      }
    });
  });

  form._baseTraceMapController = {
    activate: async () => {
      if (searchInput && !searchInput.value && addressInput) {
        searchInput.value = addressInput.value;
      }
      const map = await ensureMap();
      if (map && typeof map.checkResize === "function") {
        map.checkResize();
      }
    }
  };

  if (!hasKey) {
    setFeedback("未配置天地图 Key，当前仍可手动填写经纬度。", "warn");
    setEmptyState("未配置天地图 Key，当前仍可手动填写经纬度。");
  }

  if (dialog) {
    dialog.addEventListener("close", () => {
      setFeedback(hasKey ? "可搜索地址并点击地图回填经纬度。" : "请先在地图配置文件中补充 tk，或先手动填写经纬度。", hasKey ? "muted" : "warn");
    });
  }
}

function activateBaseTraceMap(root) {
  const form = root.querySelector("[data-create-form]");
  if (form && form._baseTraceMapController) {
    form._baseTraceMapController.activate();
  }
}

function bindBaseTracePhotos(root, dialog) {
  const form = root.querySelector("[data-create-form]");
  if (!form) {
    return;
  }

  const storeInput = form.querySelector("[data-photo-store]");
  const openButton = form.querySelector("[data-open-photo-window]");
  const windowShell = form.querySelector("[data-photo-window]");
  const closeButtons = form.querySelectorAll("[data-close-photo-window]");
  const photoInput = form.querySelector("[data-photo-input]");
  const photoGrid = form.querySelector("[data-photo-grid]");
  const dialogGrid = form.querySelector("[data-photo-dialog-grid]");
  const countPill = form.querySelector("[data-photo-count]");

  if (!storeInput || !windowShell || !photoGrid || !dialogGrid) {
    return;
  }

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

  const renderPhotoGrid = (container, removable) => {
    if (!container) {
      return;
    }
    if (!state.photos.length) {
      container.innerHTML = '<div class="photo-empty">暂未添加照片</div>';
      return;
    }
    container.innerHTML = state.photos.map((photo) => `
      <figure class="${removable ? "photo-card photo-card-manage" : "photo-card"}">
        <img src="${escapeAttribute(photo.url)}" alt="${escapeAttribute(photo.name)}">
        ${removable ? `<button class="photo-remove" type="button" data-remove-photo="${escapeAttribute(photo.id)}" aria-label="删除照片">✕</button>` : ""}
        <figcaption>${escapeHtml(photo.name)}</figcaption>
      </figure>
    `).join("");
  };

  const render = () => {
    syncStore();
    renderPhotoGrid(photoGrid, false);
    renderPhotoGrid(dialogGrid, true);
  };

  const openWindow = () => {
    windowShell.hidden = false;
    document.body.classList.add("has-photo-window");
  };

  const closeWindow = () => {
    windowShell.hidden = true;
    document.body.classList.remove("has-photo-window");
  };

  const appendPhotos = async (files) => {
    const imageFiles = Array.from(files || []).filter((file) => file && String(file.type || "").startsWith("image/"));
    if (!imageFiles.length) {
      return;
    }
    const room = Math.max(0, BASE_TRACE_MAX_PHOTOS - state.photos.length);
    if (!room) {
      return;
    }
    const nextPhotos = await Promise.all(imageFiles.slice(0, room).map(createTracePhotoRecord));
    state.photos = [...state.photos, ...nextPhotos];
    render();
  };

  if (openButton) {
    openButton.addEventListener("click", openWindow);
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeWindow);
  });

  windowShell.addEventListener("click", (event) => {
    if (event.target === windowShell || event.target.closest("[data-close-photo-window]")) {
      closeWindow();
    }
  });

  if (photoInput) {
    photoInput.addEventListener("change", (event) => {
      const files = event.target.files;
      state.pendingTask = appendPhotos(files).finally(() => {
        if (photoInput) {
          photoInput.value = "";
        }
      });
    });
  }

  dialogGrid.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-photo]");
    if (!removeButton) {
      return;
    }
    const targetId = removeButton.dataset.removePhoto || "";
    state.photos = state.photos.filter((photo) => photo.id !== targetId);
    render();
  });

  if (dialog) {
    dialog.addEventListener("close", closeWindow);
  }

  form._baseTracePhotoController = {
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
    container.classList.remove("is-fallback");
    const center = coordinates || {
      lng: config.defaultCenter[0],
      lat: config.defaultCenter[1]
    };
    const map = new window.T.Map(container);
    map.centerAndZoom(new window.T.LngLat(center.lng, center.lat), coordinates ? config.detailZoom : config.defaultZoom);
    const layer = window.TMAP_HYBRID_MAP || window.TMAP_SATELLITE_MAP || window.TMAP_NORMAL_MAP;
    if (layer) {
      map.setMapType(layer);
    }
    if (coordinates) {
      const marker = new window.T.Marker(new window.T.LngLat(coordinates.lng, coordinates.lat));
      map.addOverLay(marker);
    }
    if (typeof map.disableScrollWheelZoom === "function") {
      map.disableScrollWheelZoom();
    }
    if (typeof map.disableDoubleClickZoom === "function") {
      map.disableDoubleClickZoom();
    }
  } catch (error) {
    container.innerHTML = '<div class="trace-live-map-state">天地图加载失败，请检查 tk 或网络。</div>';
    container.classList.add("is-fallback");
  }
}

function readCustomRecords(pageId) {
  try {
    const raw = window.localStorage.getItem(storageKey(pageId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeCustomRecords(pageId, records) {
  window.localStorage.setItem(storageKey(pageId), JSON.stringify(records));
}

function clearCustomData() {
  Object.keys(MODULE_CONFIGS).forEach((pageId) => {
    window.localStorage.removeItem(storageKey(pageId));
  });
}

function storageKey(pageId) {
  return `${DATA_PREFIX}:${pageId}`;
}

function recordId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function average(numbers) {
  if (!numbers.length) {
    return 0;
  }
  return Math.round(numbers.reduce((sum, number) => sum + number, 0) / numbers.length);
}

function sumNumbers(numbers) {
  return numbers.reduce((sum, number) => sum + (Number.isFinite(number) ? number : 0), 0);
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item[key])).size;
}

function stripUnit(value) {
  const match = String(value || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function stripPercent(value) {
  return stripUnit(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
}

function shiftDate(start, offset) {
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayText() {
  return "2026-03-20";
}

function normalizeValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value).trim()])
  );
}

function normalizeTracePhotoList(value) {
  let parsed = value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) {
      return [];
    }
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url) {
          return null;
        }
        return {
          id: `photo-${index + 1}`,
          name: `基地照片 ${index + 1}`,
          url
        };
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const url = String(item.url || item.dataUrl || "").trim();
      if (!url) {
        return null;
      }
      return {
        id: String(item.id || `photo-${index + 1}`),
        name: String(item.name || `基地照片 ${index + 1}`),
        url
      };
    })
    .filter(Boolean);
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
    const scale = maxEdge > BASE_TRACE_PHOTO_MAX_EDGE ? BASE_TRACE_PHOTO_MAX_EDGE / maxEdge : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return source;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", BASE_TRACE_PHOTO_QUALITY);
  } catch (error) {
    return source;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("photo-read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("photo-decode-failed"));
    image.src = source;
  });
}

function isTraceMapPage(pageId) {
  return pageId === TRACE_MAP_PAGE_ID;
}

function getTraceMapConfig() {
  const runtimeConfig = typeof window !== "undefined" && window.TRACE_MAP_CONFIG ? window.TRACE_MAP_CONFIG : {};
  const merged = { ...TRACE_MAP_CONFIG_DEFAULTS, ...runtimeConfig };
  return {
    ...merged,
    defaultCenter: normalizeTraceMapCenter(merged.defaultCenter)
  };
}

function normalizeTraceMapCenter(center) {
  if (Array.isArray(center) && center.length >= 2) {
    const lng = parseOptionalCoordinate(center[0], 73, 135);
    const lat = parseOptionalCoordinate(center[1], 18, 54);
    if (lng !== null && lat !== null) {
      return [lng, lat];
    }
  }
  return [...TRACE_MAP_CONFIG_DEFAULTS.defaultCenter];
}

async function loadTraceMapSdk() {
  if (window.T && window.T.Map && window.T.MapType && window.T.TileLayer) {
    return window.T;
  }

  if (TRACE_MAP_RUNTIME.sdkPromise) {
    return TRACE_MAP_RUNTIME.sdkPromise;
  }

  const config = getTraceMapConfig();
  if (!config.tk) {
    throw new Error("missing-trace-map-key");
  }

  TRACE_MAP_RUNTIME.sdkPromise = new Promise((resolve, reject) => {
    const finishWithGlobals = () => {
      if (window.T && window.T.Map && window.T.MapType && window.T.TileLayer) {
        resolve(window.T);
        return true;
      }
      return false;
    };

    if (finishWithGlobals()) {
      return;
    }

    const waitForGlobals = (startedAt) => {
      if (finishWithGlobals()) {
        return;
      }
      if (Date.now() - startedAt > 15000) {
        TRACE_MAP_RUNTIME.sdkPromise = null;
        reject(new Error("trace-map-timeout"));
        return;
      }
      window.setTimeout(() => {
        waitForGlobals(startedAt);
      }, 80);
    };

    const existing = document.getElementById(TRACE_MAP_SCRIPT_ID);
    if (existing) {
      waitForGlobals(Date.now());
      return;
    }

    const script = document.createElement("script");
    script.id = TRACE_MAP_SCRIPT_ID;
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${encodeURIComponent(config.tk)}`;
    script.async = true;
    script.onload = () => {
      waitForGlobals(Date.now());
    };
    script.onerror = () => {
      TRACE_MAP_RUNTIME.sdkPromise = null;
      reject(new Error("trace-map-load-failed"));
    };
    document.head.appendChild(script);
  });

  return TRACE_MAP_RUNTIME.sdkPromise;
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
    // Let the map fall back to the provider default base layer if custom map types are not ready yet.
  }
}

function createTraceTileLayer(getUrl) {
  const layer = new window.T.TileLayer("", {
    minZoom: 1,
    maxZoom: 18
  });
  layer.getTileUrl = getUrl;
  return layer;
}

function currentTraceProjectionCode() {
  return window.T && window.T.gq && window.T.gq.EW === 0 ? "EPSG:900913" : "EPSG:4326";
}

async function geocodeTraceAddress(keyword) {
  const config = getTraceMapConfig();
  const response = await fetch(
    `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(JSON.stringify({ keyWord: keyword }))}&tk=${encodeURIComponent(config.tk)}`
  );
  if (!response.ok) {
    throw new Error("地址搜索暂时不可用，请稍后重试。");
  }
  const data = await response.json();
  const lng = parseOptionalCoordinate(data && data.location ? data.location.lon : "", 73, 135);
  const lat = parseOptionalCoordinate(data && data.location ? data.location.lat : "", 18, 54);
  if (String(data && data.status) !== "0" || lng === null || lat === null) {
    throw new Error("未找到对应地址，请换更完整的行政区和地点信息。");
  }
  return { lng, lat };
}

async function reverseGeocodeTraceLocation(lng, lat) {
  const config = getTraceMapConfig();
  const postStr = JSON.stringify({ lon: Number(lng), lat: Number(lat), ver: 1 });
  const response = await fetch(
    `https://api.tianditu.gov.cn/geocoder?postStr=${encodeURIComponent(postStr)}&type=geocode&tk=${encodeURIComponent(config.tk)}`
  );
  if (!response.ok) {
    throw new Error("reverse-geocode-request-failed");
  }
  const data = await response.json();
  if (String(data && data.status) !== "0") {
    throw new Error("reverse-geocode-empty");
  }
  return data && data.result ? data.result.formatted_address || "" : "";
}

function normalizeLongitude(value, index) {
  return parseCoordinate(value, defaultLongitude(index), 73, 135).toFixed(6);
}

function normalizeLatitude(value, index) {
  return parseCoordinate(value, defaultLatitude(index), 18, 54).toFixed(6);
}

function normalizeOptionalLongitude(value, index) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  return parseCoordinate(raw, defaultLongitude(index), 73, 135).toFixed(6);
}

function normalizeOptionalLatitude(value, index) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  return parseCoordinate(raw, defaultLatitude(index), 18, 54).toFixed(6);
}

function parseOptionalCoordinate(value, min, max) {
  const raw = Number(String(value ?? "").trim());
  if (Number.isFinite(raw) && raw >= min && raw <= max) {
    return raw;
  }
  return null;
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
  const lng = parseOptionalCoordinate(longitude, 73, 135);
  const lat = parseOptionalCoordinate(latitude, 18, 54);
  if (lng === null || lat === null) {
    return "";
  }
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseCoordinate(value, fallback, min, max) {
  const raw = Number(String(value ?? "").trim());
  if (Number.isFinite(raw) && raw >= min && raw <= max) {
    return raw;
  }
  return fallback;
}

function defaultLongitude(index) {
  return 104.034 + (index % 7) * 0.0126;
}

function defaultLatitude(index) {
  return 34.436 + (index % 7) * 0.0098;
}

function titleCell(title, subtitle) {
  return `
    <span class="table-title">${escapeHtml(title)}</span>
    <span class="table-sub">${escapeHtml(subtitle)}</span>
  `;
}

function statusPill(label, tone) {
  return `<span class="status ${escapeAttribute(tone || "pending")}">${escapeHtml(label)}</span>`;
}

function actionCell(labels) {
  return `
    <div class="row-actions">
      ${labels.map((label, index) => `<span class="row-action ${index === 0 ? "primary" : "ghost"}">${escapeHtml(label)}</span>`).join("")}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
