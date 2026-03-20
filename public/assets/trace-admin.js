const NAV_ITEMS = [
  { id: "home", href: "index.html", icon: "首", title: "首页", subtitle: "工作台总览" },
  { id: "base-trace", href: "base-trace.html", icon: "基", title: "基地溯源", subtitle: "基地档案与归集" },
  { id: "seed-trace", href: "seed-trace.html", icon: "种", title: "种子溯源", subtitle: "种苗来源与到货" },
  { id: "farming-trace", href: "farming-trace.html", icon: "农", title: "农事溯源", subtitle: "农事记录与巡田" },
  { id: "harvest-trace", href: "harvest-trace.html", icon: "采", title: "采收追溯", subtitle: "采收批次与验收" },
  { id: "processing-trace", href: "processing-trace.html", icon: "初", title: "初加工溯源", subtitle: "净选切制与质控" },
  { id: "herb-management", href: "herb-management.html", icon: "药", title: "药材管理", subtitle: "药材档案与标准" },
  { id: "trace-code-management", href: "trace-code-management.html", icon: "码", title: "溯源码管理", subtitle: "批次赋码与绑定" },
  { id: "warehouse-management", href: "warehouse-management.html", icon: "仓", title: "仓库管理", subtitle: "库存与仓位巡检" }
];

const WORKFLOW_ITEMS = NAV_ITEMS.filter((item) => item.id !== "home");

const SIDE_FOOTER = {
  title: "当前版本",
  body: "这是空白流程测试版。平台不再预置任何演示记录，你可以从基地开始自己完整跑一遍溯源流程。"
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
      { name: "note", label: "归档说明", as: "textarea", full: true, placeholder: "补充基地认证、地图坐标或照片归档情况" }
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
      return {
        id: recordId("BASE", index),
        code: `JD202603${String(index).padStart(3, "0")}`,
        name: values.name,
        manager: values.manager,
        herb: values.herb,
        area: `${values.area || "0"} 亩`,
        address: values.address,
        completion: 72,
        batchCount: 1,
        fileCount: 3,
        stage: "建档完成",
        statusLabel: "已建档",
        statusTone: "good",
        lastUpdate: todayText(),
        note: values.note || "由平台新增基地建档",
        documents: ["基地信息表", "地块定位图", "现场照片"],
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
        sections: [
          { title: "归档材料", items: record.documents.map((item) => ({ title: item, desc: `${record.lastUpdate} 已归集` })) },
          { title: "最近动作", items: record.actions.map((item) => ({ title: item, desc: record.note })) }
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
    root.innerHTML = renderHomePage(dashboard, shared, pageId);
    bindHome(root);
    return;
  }

  const config = MODULE_CONFIGS[pageId];
  if (!config) {
    document.title = "中药材溯源平台";
    root.innerHTML = renderHomePage(dashboard, shared, "home");
    bindHome(root);
    return;
  }

  document.title = `中药材溯源平台 - ${config.title}`;
  const allRecords = getPageRecords(pageId, shared);
  const filtered = filterRecords(allRecords, APP_STATE.query, config.searchText);
  const selected = pickSelectedRecord(filtered, allRecords, APP_STATE.selectedId);
  root.innerHTML = renderModulePage(config, dashboard, shared, pageId, allRecords, filtered, selected);
  bindModule(root, config, dashboard, shared, pageId);
}

function renderHomePage(dashboard, shared, activeId) {
  const summaryCards = [
    { label: "基地档案", value: String(getPageRecords("base-trace", shared).length), note: "每个基地单独页面" },
    { label: "在链批次", value: String(getPageRecords("harvest-trace", shared).length + getPageRecords("processing-trace", shared).length), note: "采收与初加工批次合计" },
    { label: "已绑定溯源码", value: formatNumber(sumNumbers(getPageRecords("trace-code-management", shared).map((record) => stripUnit(record.activated)))), note: "当前已激活的追溯码" },
    { label: "仓库记录", value: String(getPageRecords("warehouse-management", shared).length), note: "库存与库位独立归档" }
  ];

  const moduleCards = WORKFLOW_ITEMS.map((item) => {
    const count = getPageRecords(item.id, shared).length;
    return `
      <a class="module-card" href="${item.href}">
        <div class="module-card-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="module-card-count">${count} 条</span>
        </div>
        <p>${escapeHtml(item.subtitle)}，点击后进入独立页面查看台账、详情和新增表单。</p>
        <div class="module-card-foot">
          <span>${escapeHtml(moduleFootnote(item.id))}</span>
          <span>进入页面</span>
        </div>
      </a>
    `;
  }).join("");

  const activityItems = shared.activities.map((item) => `
    <div class="list-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.desc)}</span>
    </div>
  `).join("");

  const notices = [
    "现在开始，左侧每个模块都会进入新的页面，不再共享一个长页面。",
    "平台已清空所有预置记录，你录入的第一条数据就是流程起点。",
    "流程顺序按：基地 -> 种子 -> 农事 -> 采收 -> 初加工 -> 药材 -> 赋码 -> 仓储。",
    "新增内容会写进当前浏览器本地存储，刷新后依然存在，便于你继续测试。"
  ];

  return shellLayout({
    activeId,
    dashboard,
    title: "中药材溯源平台",
    kicker: "TRACE CONSOLE",
    subtitle: "首页只负责总览和入口，真正的建档、批次、资料、赋码、仓储都拆到各自页面里。",
    topActions: `
      <a class="button primary" href="base-trace.html">进入基地溯源</a>
      <a class="button secondary" href="trace-code-management.html">查看赋码台账</a>
    `,
    body: `
      <div class="page-stack">
        ${renderSummaryGrid(summaryCards)}
        ${renderWorkflowPanel("", "全链流程", "参考你给的溯源平台结构，把核心流程拆成可以逐页进入的后台模块。")}
        <div class="home-grid">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title">
                <h3>模块工作台</h3>
                <p>每个模块点击后都是新页面，页面里独立放台账、详情面板和新增动作。</p>
              </div>
            </div>
            <div class="panel-body">
              <div class="module-card-grid">
                ${moduleCards}
              </div>
            </div>
          </section>
          <aside class="detail-panel">
            <section class="panel">
              <div class="panel-header">
                <div class="panel-title">
                  <h3>最近动作</h3>
                  <p>模拟真实溯源项目里常见的建档、巡田、采收和赋码推进节奏。</p>
                </div>
              </div>
              <div class="panel-body">
                <div class="list-grid">
                  ${activityItems || `<div class="empty">当前还没有任何预置动作。你可以从“基地溯源”开始新增第一条记录，后面的流程页再逐步补齐。</div>`}
                </div>
              </div>
            </section>
            <section class="panel" style="margin-top: 18px;">
              <div class="panel-header">
                <div class="panel-title">
                  <h3>平台提醒</h3>
                  <p>这版重点是版面、流程和独立页面结构，不是单页展示。</p>
                </div>
              </div>
              <div class="panel-body">
                <div class="list-grid">
                  ${notices.map((item) => `<div class="list-item"><strong>设计原则</strong><span>${escapeHtml(item)}</span></div>`).join("")}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    `
  });
}

function renderModulePage(config, dashboard, shared, pageId, allRecords, filteredRecords, selectedRecord) {
  const summaryHtml = renderSummaryGrid(config.summaryCards(allRecords));
  const nextLink = config.nextPageId ? NAV_ITEMS.find((item) => item.id === config.nextPageId) : null;

  const metaPills = [
    `独立页面：${config.title}`,
    `总记录：${allRecords.length} 条`,
    `当前筛选：${filteredRecords.length} 条`
  ];

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
    : `<div class="empty">没有找到符合条件的记录。你可以换个关键词，或者直接新增一条新的${escapeHtml(config.title)}记录。</div>`;

  return shellLayout({
    activeId: pageId,
    dashboard,
    title: config.title,
    kicker: config.kicker,
    subtitle: config.subtitle,
    topActions: `
      <button class="button primary" type="button" data-open-dialog>${escapeHtml(config.actionLabel)}</button>
      ${nextLink ? `<a class="button secondary" href="${nextLink.href}">下一步：${escapeHtml(nextLink.title)}</a>` : `<a class="button secondary" href="index.html">返回首页</a>`}
    `,
    body: `
      <div class="page-stack">
        ${summaryHtml}
        ${renderWorkflowPanel(pageId, `${config.title}流程页`, "参考你给的后台流程风格，当前模块会在流程条里高亮，进入其他模块会打开新的页面。")}
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <h3>${escapeHtml(config.tableTitle)}</h3>
              <p>${escapeHtml(config.tableSubtitle)}</p>
            </div>
            <div class="panel-actions">
              <label class="searchbar">
                <span>搜索</span>
                <input type="search" value="${escapeAttribute(APP_STATE.query)}" placeholder="${escapeAttribute(config.searchPlaceholder)}" data-search-input>
              </label>
              <button class="button primary" type="button" data-open-dialog>${escapeHtml(config.actionLabel)}</button>
            </div>
          </div>
          <div class="panel-body">
            <div class="meta-row">
              ${metaPills.map((item) => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}
            </div>
            <div class="panel-layout">
              <div>
                ${tableContent}
              </div>
              <aside class="detail-panel">
                <section class="panel">
                  <div class="panel-header">
                    <div class="panel-title">
                      <h3>当前详情</h3>
                      <p>点击左侧台账任意记录，右侧详情会跟着切换。</p>
                    </div>
                  </div>
                  <div class="panel-body">
                    ${selectedRecord ? config.detail(selectedRecord) : `<div class="empty">当前没有可展示的记录，请先新增一条数据。</div>`}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
      ${renderDialog(config)}
    `
  });
}

function shellLayout({ activeId, dashboard, title, kicker, subtitle, topActions, body }) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">药</div>
          <div class="brand-copy">
            <h1>中药材溯源平台</h1>
            <p>基地、批次、资料、质检一体化管理</p>
          </div>
        </div>
        <div class="nav-caption">Trace Modules</div>
        <nav class="nav-group">
          ${NAV_ITEMS.map((item) => renderNavItem(item, activeId)).join("")}
        </nav>
        <div class="sidebar-foot">
          <strong>${escapeHtml(SIDE_FOOTER.title)}</strong>
          ${escapeHtml(SIDE_FOOTER.body)}
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="headline">
            <span class="headline-kicker">${escapeHtml(kicker)}</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <div class="topbar-side">
            <span class="top-chip"><span class="chip-pulse"></span>${escapeHtml(dashboard.meta.latest_date || todayText())}</span>
            <span class="top-chip">预置记录 ${escapeHtml(String(dashboard.meta.source_count || 0))} 条</span>
            ${topActions || ""}
          </div>
        </header>
        ${body}
        <p class="footer">当前是空白流程测试版。系统不再预置演示记录，你新增的内容只会保存在当前浏览器本地，便于自己完整测试流程。</p>
      </main>
    </div>
  `;
}

function renderWorkflowPanel(activeId, title, description) {
  return `
    <section class="workflow-panel">
      <div class="panel-header">
        <div class="panel-title">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>
      <div class="workflow-body">
        <div class="workflow-grid">
          ${WORKFLOW_ITEMS.map((item, index) => `
            <a class="workflow-step ${activeId === item.id ? "is-active" : ""}" href="${item.href}">
              <div class="workflow-index">${String(index + 1).padStart(2, "0")}</div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.subtitle)}</p>
            </a>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderSummaryGrid(cards) {
  return `
    <section class="summary-grid">
      ${cards.map((card) => `
        <div class="summary-card">
          <div class="label">${escapeHtml(card.label)}</div>
          <div class="value">${escapeHtml(card.value)}</div>
          <div class="note">${escapeHtml(card.note)}</div>
        </div>
      `).join("")}
    </section>
  `;
}

function renderNavItem(item, activeId) {
  return `
    <a class="nav-item ${item.id === activeId ? "is-active" : ""}" href="${item.href}">
      <span class="nav-icon">${escapeHtml(item.icon)}</span>
      <span class="nav-text">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.subtitle)}</span>
      </span>
    </a>
  `;
}

function renderTableRow(config, record, selectedRecord) {
  return `
    <tr data-record-id="${escapeAttribute(record.id)}" class="${selectedRecord && selectedRecord.id === record.id ? "is-active" : ""}">
      ${config.columns.map((column) => `<td data-label="${escapeAttribute(column.label)}">${column.render(record)}</td>`).join("")}
    </tr>
  `;
}

function renderDialog(config) {
  return `
    <dialog class="dialog" data-record-dialog>
      <div class="dialog-header">
        <div class="dialog-title">
          <h4>${escapeHtml(config.actionLabel)}</h4>
          <p>这条记录会保存到当前浏览器，刷新后仍可继续你自己的流程测试。</p>
        </div>
        <button class="dialog-close" type="button" data-close-dialog>关闭</button>
      </div>
      <form class="dialog-body" data-create-form>
        <div class="form-grid">
          ${config.fields.map((field) => renderField(field)).join("")}
        </div>
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

function renderField(field) {
  const type = field.type || "text";
  const fieldClass = field.full ? "field is-full" : "field";
  if (field.as === "textarea") {
    return `
      <div class="${fieldClass}">
        <label>${escapeHtml(field.label)}</label>
        <textarea name="${escapeAttribute(field.name)}" placeholder="${escapeAttribute(field.placeholder || "")}" required></textarea>
      </div>
    `;
  }

  if (field.options) {
    return `
      <div class="${fieldClass}">
        <label>${escapeHtml(field.label)}</label>
        <select name="${escapeAttribute(field.name)}" required>
          <option value="">请选择</option>
          ${field.options.map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`).join("")}
        </select>
      </div>
    `;
  }

  return `
    <div class="${fieldClass}">
      <label>${escapeHtml(field.label)}</label>
      <input name="${escapeAttribute(field.name)}" type="${escapeAttribute(type)}" placeholder="${escapeAttribute(field.placeholder || "")}" required>
    </div>
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

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
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
  if (selectedId) {
    return filtered.find((record) => record.id === selectedId) || allRecords.find((record) => record.id === selectedId) || filtered[0] || allRecords[0] || null;
  }
  return filtered[0] || allRecords[0] || null;
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

function renderDetail(record, { summary, badges, metrics, progress, sections }) {
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

function moduleFootnote(pageId) {
  const notes = {
    "base-trace": "基地是整条溯源链的起点",
    "seed-trace": "把供种来源和批号单独看清",
    "farming-trace": "农事记录要按次填报",
    "harvest-trace": "采收批次直接关系后续加工",
    "processing-trace": "加工工序要和采收批次对上",
    "herb-management": "从药材维度统筹档案标准",
    "trace-code-management": "码段必须能回查到具体批次",
    "warehouse-management": "仓库是溯源闭环的最后一页"
  };
  return notes[pageId] || "进入页面";
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
