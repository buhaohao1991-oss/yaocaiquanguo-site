from __future__ import annotations

import json
import math
import statistics
import subprocess
import threading
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from html import escape
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import akshare as ak

from .config import Settings
from .errors import ExternalServiceError, ValidationError


CHINA_TZ = ZoneInfo("Asia/Shanghai")
OPENCLAW_LOCK = threading.Lock()
WORKSPACE_SCHEMA_VERSION = 3
UNIVERSE_SCHEMA_VERSION = 1
MARKET_SCHEMA_VERSION = 1
MARKET_INDEXES = [
    {"symbol": "sh000001", "name": "上证指数", "short": "沪指"},
    {"symbol": "sz399001", "name": "深证成指", "short": "深成指"},
    {"symbol": "sz399006", "name": "创业板指", "short": "创业板"},
    {"symbol": "sh000300", "name": "沪深300", "short": "沪深300"},
]
DEFAULT_WORKFLOW = [
    {"title": "先做全市场筛选", "body": "先读取全部 A 股代码与最新年报快照，生成长期候选池。"},
    {"title": "再做单股深挖", "body": "进入个股页后，补齐真实日线、资金流、财务、新闻和研报证据。"},
    {"title": "只保留长期因子", "body": "核心只看价格位置、经营质量、成长质量和估值性价比。"},
    {"title": "最后交给 OpenClaw", "body": "本地 agent 负责整理结论，但底层判断始终回到真实数据。"},
]


def normalize_symbol(symbol: str) -> str:
    normalized = "".join(ch for ch in str(symbol) if ch.isdigit())
    if len(normalized) != 6:
        raise ValidationError("股票代码必须是 6 位数字。")
    return normalized


def market_for_symbol(symbol: str) -> str:
    return "sh" if symbol.startswith(("5", "6", "9")) else "sz"


def ticker_for_symbol(symbol: str) -> str:
    return f"{symbol}.{'SH' if market_for_symbol(symbol) == 'sh' else 'SZ'}"


def now_local() -> datetime:
    return datetime.now(CHINA_TZ)


def now_text() -> str:
    return now_local().strftime("%H:%M")


def ensure_output_dirs(settings: Settings) -> None:
    settings.cache_dir.mkdir(parents=True, exist_ok=True)
    settings.report_dir.mkdir(parents=True, exist_ok=True)


def cache_path(settings: Settings, symbol: str) -> Path:
    return settings.cache_dir / f"workspace-{symbol}.json"


def universe_cache_path(settings: Settings) -> Path:
    return settings.cache_dir / "universe.json"


def market_cache_path(settings: Settings) -> Path:
    return settings.cache_dir / "market-overview.json"


def load_workspace_cache(settings: Settings, symbol: str, allow_stale: bool = False) -> dict[str, Any] | None:
    path = cache_path(settings, symbol)
    if not path.exists():
        return None
    age = now_local().timestamp() - path.stat().st_mtime
    if not allow_stale and age > settings.cache_ttl_seconds:
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if payload.get("_schema_version") != WORKSPACE_SCHEMA_VERSION:
        return None
    return payload


def save_workspace_cache(settings: Settings, symbol: str, payload: dict[str, Any]) -> None:
    path = cache_path(settings, symbol)
    cached = {"_schema_version": WORKSPACE_SCHEMA_VERSION, **payload}
    path.write_text(json.dumps(cached, ensure_ascii=False, indent=2), encoding="utf-8")


def load_universe_cache(settings: Settings, allow_stale: bool = False) -> dict[str, Any] | None:
    path = universe_cache_path(settings)
    if not path.exists():
        return None
    age = now_local().timestamp() - path.stat().st_mtime
    if not allow_stale and age > max(settings.cache_ttl_seconds, 3600):
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if payload.get("_schema_version") != UNIVERSE_SCHEMA_VERSION:
        return None
    return payload


def save_universe_cache(settings: Settings, payload: dict[str, Any]) -> None:
    path = universe_cache_path(settings)
    cached = {"_schema_version": UNIVERSE_SCHEMA_VERSION, **payload}
    path.write_text(json.dumps(cached, ensure_ascii=False, indent=2), encoding="utf-8")


def load_market_cache(settings: Settings, allow_stale: bool = False) -> dict[str, Any] | None:
    path = market_cache_path(settings)
    if not path.exists():
        return None
    age = now_local().timestamp() - path.stat().st_mtime
    if not allow_stale and age > min(settings.cache_ttl_seconds, 900):
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if payload.get("_schema_version") != MARKET_SCHEMA_VERSION:
        return None
    return payload


def save_market_cache(settings: Settings, payload: dict[str, Any]) -> None:
    path = market_cache_path(settings)
    cached = {"_schema_version": MARKET_SCHEMA_VERSION, **payload}
    path.write_text(json.dumps(cached, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_float(value: Any) -> float | None:
    if value in (None, "", "nan", "NaN"):
        return None
    try:
        cleaned = str(value).strip().replace(",", "")
        if cleaned.endswith("%"):
            cleaned = cleaned[:-1]
        number = float(cleaned)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))


def format_signed(value: float, digits: int = 2) -> str:
    return f"{value:+.{digits}f}".rstrip("0").rstrip(".")


def value_label(value: float, low: float, high: float, labels: tuple[str, str, str]) -> str:
    if value >= high:
        return labels[2]
    if value >= low:
        return labels[1]
    return labels[0]


def rolling_average(values: list[float], window: int) -> float:
    if not values:
        return 0.0
    window_values = values[-window:] if len(values) >= window else values
    return sum(window_values) / len(window_values)


def sample_series(values: list[float], size: int = 18) -> list[float]:
    if len(values) <= size:
        return [round(value, 2) for value in values]
    step = (len(values) - 1) / (size - 1)
    sampled = []
    for index in range(size):
        source_index = round(index * step)
        sampled.append(round(values[source_index], 2))
    return sampled


def parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo:
            return value.astimezone(CHINA_TZ)
        return value.replace(tzinfo=CHINA_TZ)
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=CHINA_TZ)
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=CHINA_TZ)
        except ValueError:
            continue
    return now_local()


def data_frame_to_records(frame) -> list[dict[str, Any]]:
    return frame.to_dict(orient="records") if frame is not None else []


def fetch_info_map(symbol: str) -> dict[str, Any]:
    try:
        info_frame = ak.stock_individual_info_em(symbol=symbol)
    except Exception as exc:
        raise ExternalServiceError(f"个股信息获取失败: {exc}") from exc
    return {str(row["item"]): row["value"] for row in data_frame_to_records(info_frame)}


def fetch_hist(symbol: str):
    start_date = (now_local() - timedelta(days=400)).strftime("%Y%m%d")
    end_date = now_local().strftime("%Y%m%d")
    try:
        hist_frame = ak.stock_zh_a_hist(
            symbol=symbol,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust="qfq",
        )
    except Exception as exc:
        raise ExternalServiceError(f"日线行情获取失败: {exc}") from exc

    if hist_frame is None or hist_frame.empty:
        raise ExternalServiceError("未获取到有效日线行情。")
    hist_frame = hist_frame.sort_values("日期").reset_index(drop=True)
    return hist_frame


def fetch_fund_flow(symbol: str):
    try:
        flow_frame = ak.stock_individual_fund_flow(stock=symbol, market=market_for_symbol(symbol))
    except Exception as exc:
        raise ExternalServiceError(f"资金流获取失败: {exc}") from exc
    if flow_frame is None or flow_frame.empty:
        raise ExternalServiceError("未获取到资金流数据。")
    return flow_frame.sort_values("日期").reset_index(drop=True)


def fetch_financials(symbol: str):
    try:
        frame = ak.stock_financial_analysis_indicator_em(symbol=ticker_for_symbol(symbol), indicator="按报告期")
    except Exception as exc:
        raise ExternalServiceError(f"财务指标获取失败: {exc}") from exc
    if frame is None or frame.empty:
        raise ExternalServiceError("未获取到财务指标。")
    frame = frame.sort_values("REPORT_DATE", ascending=False).reset_index(drop=True)
    return frame


def fetch_news(symbol: str):
    try:
        frame = ak.stock_news_em(symbol=symbol)
    except Exception as exc:
        raise ExternalServiceError(f"个股新闻获取失败: {exc}") from exc
    if frame is None or frame.empty:
        return []
    records = data_frame_to_records(frame)
    records.sort(key=lambda item: parse_datetime(item.get("发布时间")), reverse=True)
    return records[:12]


def fetch_reports(symbol: str):
    try:
        frame = ak.stock_research_report_em(symbol=symbol)
    except Exception as exc:
        raise ExternalServiceError(f"个股研报获取失败: {exc}") from exc
    if frame is None or frame.empty:
        return []
    records = data_frame_to_records(frame)
    records.sort(key=lambda item: parse_datetime(item.get("日期")), reverse=True)
    return records[:12]


def extract_consensus_pe(reports: list[dict[str, Any]]) -> float | None:
    for report in reports:
        for key in ("2026-盈利预测-市盈率", "2025-盈利预测-市盈率", "2027-盈利预测-市盈率"):
            pe = safe_float(report.get(key))
            if pe:
                return pe
    return None


def build_range_payload(hist_records: list[dict[str, Any]], flow_records: list[dict[str, Any]], label: str) -> dict[str, Any]:
    days = {"1M": 22, "3M": 66, "6M": 132}[label]
    sliced_hist = hist_records[-days:] if len(hist_records) >= days else hist_records[:]
    sliced_flow = flow_records[-days:] if len(flow_records) >= days else flow_records[:]
    closes = [safe_float(item["收盘"]) or 0.0 for item in sliced_hist]
    volumes = [safe_float(item["成交量"]) or 0.0 for item in sliced_hist]
    turnovers = [safe_float(item["换手率"]) or 0.0 for item in sliced_hist]
    returns = []
    for index in range(1, len(closes)):
        prev = closes[index - 1]
        current = closes[index]
        if prev:
            returns.append((current - prev) / prev)
    performance = ((closes[-1] - closes[0]) / closes[0] * 100) if len(closes) >= 2 and closes[0] else 0.0
    volatility = statistics.pstdev(returns) * math.sqrt(252) * 100 if len(returns) >= 2 else 0.0
    avg_turnover = sum(turnovers) / len(turnovers) if turnovers else 0.0
    latest_five_flow = [safe_float(item.get("主力净流入-净额")) or 0.0 for item in sliced_flow[-5:]]
    flow_sum = sum(latest_five_flow) / 1e8
    return {
        "axisStart": sliced_hist[0]["日期"].strftime("%-m 月 %-d 日") if sliced_hist else "--",
        "axisEnd": sliced_hist[-1]["日期"].strftime("%-m 月 %-d 日") if sliced_hist else "--",
        "performance": round(performance, 2),
        "volatility": round(volatility, 2),
        "flowTone": value_label(flow_sum, -0.2, 0.3, ("资金承压", "温和回流", "明显增配")),
        "price": sample_series(closes),
        "volume": sample_series(volumes, size=min(18, len(closes) or 1)),
        "metrics": [
            {"label": "区间高点", "value": f"{max(closes):.2f}" if closes else "--"},
            {"label": "区间低点", "value": f"{min(closes):.2f}" if closes else "--"},
            {"label": "平均换手", "value": f"{avg_turnover:.2f}%"},
            {"label": "近五日主力", "value": f"{flow_sum:+.2f} 亿"},
        ],
    }


def build_heatmap(flow_records: list[dict[str, Any]]) -> list[float]:
    values = [safe_float(item.get("主力净流入-净占比")) or 0.0 for item in flow_records[-12:]]
    if not values:
        return [0.2] * 12
    max_abs = max(abs(value) for value in values) or 1.0
    return [round(0.5 + (value / max_abs) * 0.4, 2) for value in values]


def fetch_market_index_hist(symbol: str):
    try:
        frame = ak.stock_zh_index_daily_em(symbol=symbol)
    except Exception as exc:
        raise ExternalServiceError(f"指数行情获取失败: {exc}") from exc
    if frame is None or frame.empty:
        raise ExternalServiceError(f"未获取到 {symbol} 的指数行情。")
    return frame.sort_values("date").reset_index(drop=True)


def fetch_market_activity() -> dict[str, Any]:
    try:
        frame = ak.stock_market_activity_legu()
    except Exception as exc:
        raise ExternalServiceError(f"市场活跃度获取失败: {exc}") from exc
    activity = {str(row.get("item")): row.get("value") for row in data_frame_to_records(frame)}
    if not activity:
        raise ExternalServiceError("未获取到市场活跃度数据。")
    return activity


def build_index_card(config: dict[str, str], frame) -> dict[str, Any]:
    records = data_frame_to_records(frame)
    latest = records[-1]
    previous = records[-2] if len(records) >= 2 else latest
    closes = [safe_float(item.get("close")) or 0.0 for item in records]
    close = safe_float(latest.get("close")) or 0.0
    prev_close = safe_float(previous.get("close")) or close
    change = close - prev_close
    change_pct = (change / prev_close * 100) if prev_close else 0.0
    month_base = closes[-21] if len(closes) >= 21 else closes[0]
    quarter_base = closes[-61] if len(closes) >= 61 else closes[0]
    month_change_pct = ((close - month_base) / month_base * 100) if month_base else 0.0
    quarter_change_pct = ((close - quarter_base) / quarter_base * 100) if quarter_base else 0.0
    ma20 = rolling_average(closes, 20)
    ma60 = rolling_average(closes, 60)
    if close >= ma20 and ma20 >= ma60:
        trend = "强于均线"
    elif close >= ma20:
        trend = "短线回暖"
    elif close >= ma60:
        trend = "震荡整理"
    else:
        trend = "偏弱运行"

    return {
        "symbol": config["symbol"],
        "name": config["name"],
        "short": config["short"],
        "date": str(latest.get("date")),
        "close": round(close, 2),
        "change": round(change, 2),
        "changePct": round(change_pct, 2),
        "monthChangePct": round(month_change_pct, 2),
        "quarterChangePct": round(quarter_change_pct, 2),
        "trend": trend,
    }


def build_market_overview(settings: Settings, force_refresh: bool = False) -> dict[str, Any]:
    ensure_output_dirs(settings)
    if not force_refresh:
        cached = load_market_cache(settings)
        if cached:
            return cached
    stale_cached = load_market_cache(settings, allow_stale=True)

    try:
        cards = [build_index_card(config, fetch_market_index_hist(config["symbol"])) for config in MARKET_INDEXES]
        activity = fetch_market_activity()
    except ExternalServiceError:
        if stale_cached:
            return stale_cached
        raise
    up = safe_float(activity.get("上涨")) or 0.0
    down = safe_float(activity.get("下跌")) or 0.0
    flat = safe_float(activity.get("平盘")) or 0.0
    limit_up = safe_float(activity.get("真实涨停")) or safe_float(activity.get("涨停")) or 0.0
    limit_down = safe_float(activity.get("真实跌停")) or safe_float(activity.get("跌停")) or 0.0
    active_ratio = safe_float(activity.get("活跃度")) or 0.0
    total_active = max(up + down, 1.0)
    breadth_ratio = up / total_active
    avg_index_change = statistics.mean(card["changePct"] for card in cards)
    growth_vs_value = next(card for card in cards if card["symbol"] == "sz399006")["monthChangePct"] - next(card for card in cards if card["symbol"] == "sh000300")["monthChangePct"]

    temperature_score = 50.0
    temperature_score += (breadth_ratio - 0.5) * 38
    temperature_score += clamp(avg_index_change * 6.0, -12, 12)
    temperature_score += clamp((limit_up - limit_down) * 0.35, -8, 10)
    temperature_score += clamp((active_ratio - 50) * 0.45, -10, 10)
    temperature_score = clamp(temperature_score, 18, 92)

    if temperature_score >= 74:
        label = "偏热"
        summary = "指数与赚钱效应同步抬升，市场温度处在偏热区间，适合顺着主线研究但不追高。"
    elif temperature_score >= 60:
        label = "回暖"
        summary = "指数整体稳住、上涨家数略占优，市场回到可以持续筛选长期候选池的区间。"
    elif temperature_score >= 45:
        label = "中性"
        summary = "指数分化、赚钱效应一般，市场更适合结构化研究，而不是扩大仓位。"
    else:
        label = "偏冷"
        summary = "指数承压、下跌家数偏多，市场温度偏冷，优先防守和观察。"

    if growth_vs_value >= 2:
        style_note = "风格更偏成长，创业板明显强于沪深300。"
    elif growth_vs_value <= -2:
        style_note = "风格更偏大盘核心资产，沪深300相对更强。"
    else:
        style_note = "成长与大盘风格差异不大，市场仍是均衡轮动。"

    payload = {
        "updated_at": now_local().strftime("%Y-%m-%d %H:%M:%S"),
        "temperature": {
            "score": round(temperature_score),
            "label": label,
            "summary": summary,
            "notes": [
                f"上涨 {int(up)} 家，下跌 {int(down)} 家，平盘 {int(flat)} 家。",
                f"真实涨停 {int(limit_up)} 家，真实跌停 {int(limit_down)} 家，市场活跃度 {active_ratio:.2f}%。",
                style_note,
            ],
        },
        "indices": cards,
        "breadth": [
            {"label": "上涨家数", "value": f"{int(up)}", "note": f"下跌 {int(down)} / 平盘 {int(flat)}"},
            {"label": "真实涨停", "value": f"{int(limit_up)}", "note": f"真实跌停 {int(limit_down)}"},
            {"label": "市场活跃度", "value": f"{active_ratio:.2f}%", "note": str(activity.get("统计日期") or "实时口径")},
        ],
    }
    save_market_cache(settings, payload)
    return payload


def latest_report_date_candidates() -> list[str]:
    year = now_local().year - 1
    return [f"{year}1231", f"{year - 1}1231"]


def fetch_a_share_code_names() -> list[dict[str, str]]:
    try:
        frame = ak.stock_info_a_code_name()
    except Exception as exc:
        raise ExternalServiceError(f"A股代码清单获取失败: {exc}") from exc

    names = []
    for row in data_frame_to_records(frame):
        try:
            code = normalize_symbol(row.get("code"))
        except ValidationError:
            continue
        name = str(row.get("name") or "").replace(" ", "")
        names.append({"code": code, "name": name})
    return names


def fetch_long_term_report_frame():
    last_error: Exception | None = None
    for report_date in latest_report_date_candidates():
        try:
            frame = ak.stock_yjbb_em(date=report_date)
            if frame is not None and not frame.empty:
                return frame, report_date
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        raise ExternalServiceError(f"长期候选池数据获取失败: {last_error}") from last_error
    raise ExternalServiceError("长期候选池数据为空。")


def score_long_term_candidate(record: dict[str, Any]) -> tuple[float, dict[str, float]]:
    roe = safe_float(record.get("净资产收益率")) or 0.0
    revenue_yoy = safe_float(record.get("营业总收入-同比增长")) or 0.0
    profit_yoy = safe_float(record.get("净利润-同比增长")) or 0.0
    cashflow_ps = safe_float(record.get("每股经营现金流量")) or 0.0
    gross_margin = safe_float(record.get("销售毛利率")) or 0.0
    eps = safe_float(record.get("每股收益")) or 0.0

    quality = 50.0
    quality += clamp((roe - 8) * 1.5, -18, 24)
    quality += clamp((gross_margin - 20) * 0.25, -10, 12)
    quality += clamp(cashflow_ps * 10, -10, 16)
    quality += clamp(eps * 6, -10, 10)
    quality = clamp(quality, 20, 96)

    growth = 50.0
    growth += clamp(revenue_yoy * 0.22, -14, 16)
    growth += clamp(profit_yoy * 0.18, -18, 20)
    growth = clamp(growth, 15, 96)

    durability = 50.0
    durability += clamp((roe - 10) * 1.2, -12, 16)
    durability += clamp(cashflow_ps * 8, -8, 12)
    durability += clamp((gross_margin - 18) * 0.18, -6, 10)
    durability = clamp(durability, 20, 95)

    long_term_score = round(quality * 0.4 + growth * 0.35 + durability * 0.25, 1)
    return long_term_score, {
        "quality": round(quality, 1),
        "growth": round(growth, 1),
        "durability": round(durability, 1),
    }


def include_in_long_term_pool(code: str, sector: str, long_term_score: float, roe: float, revenue_yoy: float, profit_yoy: float, cashflow_ps: float) -> bool:
    # 搜索层仍支持全部 A 股，但默认候选池优先保留更适合长期研究的沪深标的。
    if not code.startswith(("0", "3", "6")):
        return False
    if not sector or sector == "未分类":
        return False
    if long_term_score < 65:
        return False
    if roe < 8:
        return False
    if revenue_yoy < 0 or profit_yoy < 0:
        return False
    if cashflow_ps <= 0:
        return False
    return True


def build_universe_dataset(settings: Settings, force_refresh: bool = False) -> dict[str, Any]:
    ensure_output_dirs(settings)
    if not force_refresh:
        cached = load_universe_cache(settings)
        if cached:
            return cached
    stale_cached = load_universe_cache(settings, allow_stale=True)

    try:
        names = fetch_a_share_code_names()
        report_frame, report_date = fetch_long_term_report_frame()
    except ExternalServiceError:
        if stale_cached:
            return stale_cached
        raise
    report_records = data_frame_to_records(report_frame)
    name_lookup = {item["code"]: item["name"] for item in names}

    candidates = []
    for record in report_records:
        try:
            code = normalize_symbol(record.get("股票代码"))
        except ValidationError:
            continue
        name = str(record.get("股票简称") or name_lookup.get(code) or "").replace(" ", "")
        sector = str(record.get("所处行业") or "未分类")
        long_term_score, factor_scores = score_long_term_candidate(record)
        roe = safe_float(record.get("净资产收益率")) or 0.0
        revenue_yoy = safe_float(record.get("营业总收入-同比增长")) or 0.0
        profit_yoy = safe_float(record.get("净利润-同比增长")) or 0.0
        cashflow_ps = safe_float(record.get("每股经营现金流量")) or 0.0
        gross_margin = safe_float(record.get("销售毛利率")) or 0.0
        candidate = {
            "code": code,
            "name": name,
            "sector": sector,
            "long_term_score": long_term_score,
            "roe": round(roe, 2),
            "revenue_yoy": round(revenue_yoy, 2),
            "profit_yoy": round(profit_yoy, 2),
            "cashflow_ps": round(cashflow_ps, 2),
            "gross_margin": round(gross_margin, 2),
            "factor_scores": factor_scores,
            "note": f"ROE {roe:.2f}% · 利润同比 {profit_yoy:+.2f}% · 经营现金流/股 {cashflow_ps:.2f}",
        }
        if include_in_long_term_pool(code, sector, long_term_score, roe, revenue_yoy, profit_yoy, cashflow_ps):
            candidates.append(candidate)

    candidates.sort(key=lambda item: (item["long_term_score"], item["roe"], item["profit_yoy"]), reverse=True)
    payload = {
        "_schema_version": UNIVERSE_SCHEMA_VERSION,
        "generated_at": now_local().strftime("%Y-%m-%d %H:%M:%S"),
        "report_date": report_date,
        "market_count": len(names),
        "candidate_count": len(candidates),
        "top_items": candidates[:120],
        "candidates": candidates,
        "names": names,
        "meta": {
            "site_kind": "面向全部A股的长期投资研究站",
            "pillars": [
                {"title": "先筛选后分析", "body": "先用年报与财务质量缩小范围，再做单股深挖。"},
                {"title": "重质量与增长", "body": "长期模型优先看 ROE、增长、毛利率和经营现金流。"},
                {"title": "估值不单独决定买点", "body": "估值要和成长质量一起判断，而不是只追求便宜。"},
                {"title": "AI只是研究助手", "body": "OpenClaw 负责整理观点，真实数据仍是底层依据。"},
            ],
        },
    }
    save_universe_cache(settings, payload)
    return payload


def query_universe(settings: Settings, query: str = "", limit: int = 60, force_refresh: bool = False) -> dict[str, Any]:
    dataset = build_universe_dataset(settings, force_refresh=force_refresh)
    limit = max(1, min(limit, 120))
    query = query.strip()
    candidate_lookup = {item["code"]: item for item in dataset["candidates"]}

    if not query:
        items = dataset["top_items"][:limit]
    else:
        normalized_code = "".join(ch for ch in query if ch.isdigit())
        query_text = query.replace(" ", "").lower()
        matched_codes: list[str] = []
        for item in dataset["names"]:
            if normalized_code and item["code"].startswith(normalized_code):
                matched_codes.append(item["code"])
            elif query_text and query_text in item["name"].lower():
                matched_codes.append(item["code"])
            if len(matched_codes) >= limit:
                break

        items = []
        for code in matched_codes:
            if code in candidate_lookup:
                items.append(candidate_lookup[code])
            else:
                name = next((entry["name"] for entry in dataset["names"] if entry["code"] == code), code)
                items.append(
                    {
                        "code": code,
                        "name": name,
                        "sector": "待分析",
                        "long_term_score": None,
                        "roe": None,
                        "revenue_yoy": None,
                        "profit_yoy": None,
                        "cashflow_ps": None,
                        "gross_margin": None,
                        "factor_scores": {},
                        "note": "该股票支持直接分析，但暂未进入已披露年报候选池。",
                    }
                )
        def item_rank(item: dict[str, Any]) -> tuple[int, int, float]:
            item_name = str(item.get("name") or "").lower()
            exact_match = int(bool(query_text) and item_name == query_text)
            starts_match = int(bool(query_text) and item_name.startswith(query_text))
            score = safe_float(item.get("long_term_score")) or -1.0
            return (exact_match, starts_match, score)

        items = sorted(items, key=item_rank, reverse=True)[:limit]

    return {
        "items": items,
        "meta": dataset["meta"] | {
            "generated_at": dataset["generated_at"],
            "report_date": dataset["report_date"],
            "market_count": dataset["market_count"],
            "candidate_count": dataset["candidate_count"],
            "query": query,
            "limit": limit,
        },
    }


def build_scores(hist_records: list[dict[str, Any]], financial_records: list[dict[str, Any]], flow_records: list[dict[str, Any]], reports: list[dict[str, Any]], news: list[dict[str, Any]]) -> dict[str, float]:
    closes = [safe_float(item["收盘"]) or 0.0 for item in hist_records]
    latest_close = closes[-1]
    ma60 = rolling_average(closes, 60)
    ma120 = rolling_average(closes, 120)
    return_120 = ((latest_close - closes[-121]) / closes[-121] * 100) if len(closes) > 121 and closes[-121] else 0.0
    short_returns = []
    for index in range(max(1, len(closes) - 60), len(closes)):
        prev = closes[index - 1]
        current = closes[index]
        if prev:
            short_returns.append((current - prev) / prev)
    vol_60 = statistics.pstdev(short_returns) * math.sqrt(252) * 100 if len(short_returns) >= 2 else 0.0
    technical = 50.0
    technical += 10 if latest_close >= ma60 else -8
    technical += 8 if latest_close >= ma120 else -6
    technical += clamp(return_120 * 0.18, -10, 14)
    technical -= clamp(max(vol_60 - 45, 0) * 0.22, 0, 10)
    technical = clamp(technical, 25, 92)

    latest_financial = financial_records[0]
    roe = safe_float(latest_financial.get("ROEJQ")) or 0.0
    debt_ratio = safe_float(latest_financial.get("ZCFZL")) or 50.0
    revenue_yoy = safe_float(latest_financial.get("TOTALOPERATEREVETZ")) or 0.0
    profit_yoy = safe_float(latest_financial.get("PARENTNETPROFITTZ")) or 0.0
    gross_margin = safe_float(latest_financial.get("XSMLL")) or 20.0

    fundamental = 56.0
    fundamental += clamp((roe - 8) * 1.45, -12, 20)
    fundamental += clamp((gross_margin - 20) * 0.22, -6, 10)
    fundamental += clamp((35 - debt_ratio) * 0.36, -12, 12)
    cashflow_ratio = safe_float(latest_financial.get("JYXJLYYSR")) or 0.0
    fundamental += clamp(cashflow_ratio * 8, -8, 10)
    fundamental = clamp(fundamental, 25, 96)

    growth = 50.0
    growth += clamp(revenue_yoy * 0.24, -14, 14)
    growth += clamp(profit_yoy * 0.18, -18, 20)
    growth += clamp((safe_float(latest_financial.get("ROICTZ")) or 0.0) * 0.12, -6, 10)
    growth = clamp(growth, 20, 96)

    consensus_pe = extract_consensus_pe(reports)
    valuation = 58.0 if consensus_pe is None else clamp(88 - max(consensus_pe - 10, 0) * 1.75, 35, 88)
    if profit_yoy > 20 and consensus_pe is not None:
        valuation = clamp(valuation + 4, 35, 92)

    composite = round(technical * 0.15 + fundamental * 0.4 + growth * 0.3 + valuation * 0.15, 1)
    return {
        "technical": round(technical, 1),
        "fundamental": round(fundamental, 1),
        "sentiment": round(growth, 1),
        "valuation": round(valuation, 1),
        "composite": composite,
    }


def determine_stance(scores: dict[str, float]) -> str:
    composite = scores["composite"]
    fundamental = scores["fundamental"]
    if composite >= 80 and fundamental >= 78:
        return "进攻偏多"
    if composite >= 72:
        return "中性偏多"
    if composite >= 63:
        return "中性"
    return "谨慎观察"


def operation_advice(scores: dict[str, float]) -> str:
    composite = scores["composite"]
    fundamental = scores["fundamental"]
    if composite >= 80 and fundamental >= 78:
        return "进入候选池"
    if composite >= 72:
        return "长期跟踪"
    if composite >= 63:
        return "等待确认"
    return "控制风险"


def build_timeline(news: list[dict[str, Any]], reports: list[dict[str, Any]]) -> list[dict[str, str]]:
    items: list[tuple[datetime, str, str]] = []
    for record in news[:3]:
        dt = parse_datetime(record.get("发布时间"))
        items.append((dt, str(record.get("新闻标题") or "个股新闻"), str(record.get("新闻内容") or "")[:60]))
    for record in reports[:3]:
        dt = parse_datetime(record.get("日期"))
        body = f"{record.get('机构') or '研究机构'} · {record.get('东财评级') or '评级待定'}"
        items.append((dt, str(record.get("报告名称") or "个股研报"), body))
    items.sort(key=lambda item: item[0], reverse=True)

    if not items:
        dt = now_local()
        return [{"month": f"{dt.month:02d}", "day": f"{dt.day:02d}", "title": "暂无事件", "body": "当前未拉取到可用新闻或研报。"}]

    result = []
    for dt, title, body in items[:4]:
        result.append(
            {
                "month": f"{dt.month:02d}",
                "day": f"{dt.day:02d}",
                "title": title,
                "body": body.strip() or "无补充说明",
            }
        )
    return result


def format_data_date(value: Any, with_time: bool = False) -> str | None:
    if value in (None, "", "nan", "NaN"):
        return None
    dt = parse_datetime(value)
    return dt.strftime("%Y-%m-%d %H:%M") if with_time else dt.strftime("%Y-%m-%d")


def build_heuristic_workspace(symbol: str, info_map: dict[str, Any], hist_frame, flow_frame, financial_frame, news: list[dict[str, Any]], reports: list[dict[str, Any]]) -> dict[str, Any]:
    hist_records = data_frame_to_records(hist_frame)
    flow_records = data_frame_to_records(flow_frame)
    financial_records = data_frame_to_records(financial_frame)

    latest = hist_records[-1]
    previous = hist_records[-2] if len(hist_records) >= 2 else hist_records[-1]
    latest_close = safe_float(latest.get("收盘")) or 0.0
    previous_close = safe_float(previous.get("收盘")) or latest_close
    change = latest_close - previous_close
    change_pct = ((change / previous_close) * 100) if previous_close else 0.0

    scores = build_scores(hist_records, financial_records, flow_records, reports, news)
    latest_financial = financial_records[0]
    consensus_pe = extract_consensus_pe(reports)
    debt_ratio = safe_float(latest_financial.get("ZCFZL")) or 0.0
    roe = safe_float(latest_financial.get("ROEJQ")) or 0.0
    profit_yoy = safe_float(latest_financial.get("PARENTNETPROFITTZ")) or 0.0
    revenue_yoy = safe_float(latest_financial.get("TOTALOPERATEREVETZ")) or 0.0
    gross_margin = safe_float(latest_financial.get("XSMLL")) or 0.0
    flow_ratio = statistics.mean([safe_float(item.get("主力净流入-净占比")) or 0.0 for item in flow_records[-5:]])
    flow_net = sum([safe_float(item.get("主力净流入-净额")) or 0.0 for item in flow_records[-5:]]) / 1e8

    stance = determine_stance(scores)
    role = "长期核心" if scores["fundamental"] >= 82 and scores["sentiment"] >= 72 else "候选池观察" if scores["composite"] >= 68 else "继续跟踪"
    sector = str(info_map.get("行业") or "A 股")
    name = str(info_map.get("股票简称") or symbol)
    turnover = safe_float(latest.get("换手率")) or 0.0
    market_cap = safe_float(info_map.get("总市值")) or 0.0
    observation_window = "长期跟踪" if scores["fundamental"] >= 78 else "继续跟踪" if scores["composite"] >= 68 else "暂缓"
    expected_gap = value_label(abs(scores["sentiment"] - scores["fundamental"]), 8, 16, ("低", "中等", "较高"))
    crowding = min(90.0, clamp(turnover * 14, 8, 90))

    summary = (
        f"{name} 当前更适合放在长期主义框架里观察：经营质量 {scores['fundamental']:.1f}、成长质量 {scores['sentiment']:.1f}、"
        f"估值性价比 {scores['valuation']:.1f}。"
    )
    current = (
        f"从真实数据看，{name} 的综合得分为 {scores['composite']:.1f}。"
        f"最新 ROE 为 {roe:.2f}%，营收同比 {revenue_yoy:+.2f}%，归母净利同比 {profit_yoy:+.2f}%，资产负债率 {debt_ratio:.2f}%。"
        "这类股票更应该先判断经营质量和成长持续性，再决定是否进入长期候选池。"
    )
    technical = [
        f"最新收盘 {latest_close:.2f} 元，近 3 个月区间表现 {build_range_payload(hist_records, flow_records, '3M')['performance']:+.2f}%。",
        f"长期位置评分 {scores['technical']:.1f}，用于判断估值与价格是否处在高波动区，而不是短线择时。",
        f"最新换手率 {turnover:.2f}% ，近五日主力净流 {flow_net:+.2f} 亿，只作为辅助信号，不作为长期核心依据。",
    ]
    fundamental = [
        f"最新报告期 ROE {roe:.2f}%，毛利率 {gross_margin:.2f}%，资产负债率 {debt_ratio:.2f}%，经营质量评分 {scores['fundamental']:.1f}。",
        f"营收同比 {revenue_yoy:+.2f}%，归母净利同比 {profit_yoy:+.2f}%，成长质量评分 {scores['sentiment']:.1f}。",
        f"市场一致预期 PE {consensus_pe:.1f} 倍。"
        if consensus_pe
        else "当前未取到稳定的一致预期 PE，估值更多参考行业位置与盈利持续性。",
    ]
    catalysts = [
        "下一份定期报告能否继续兑现 ROE 和利润增长。",
        "经营现金流是否继续匹配利润，而不是只靠会计利润抬升。",
        "行业景气与公司竞争地位是否仍在改善。",
        "一致预期估值若回落到更舒服区间，长期性价比会提升。",
    ]
    risks = [
        f"若利润增速 {profit_yoy:+.2f}% 只是阶段性高点，长期判断需要下修。",
        f"资产负债率 {debt_ratio:.2f}% 与经营现金流若出现恶化，会削弱长期持有逻辑。",
        "行业竞争格局变化，可能压缩毛利率和资本回报。",
        "估值重新抬升过快时，长期回报率会被提前透支。",
    ]

    signals = [
        {"label": "经营质量", "value": value_label(scores["fundamental"], 60, 80, ("一般", "稳健", "优秀")), "note": f"ROE {roe:.2f}% / 毛利率 {gross_margin:.2f}%", "tone": "good" if scores["fundamental"] >= 78 else "warn"},
        {"label": "成长质量", "value": value_label(scores["sentiment"], 55, 72, ("偏弱", "中性", "良好")), "note": f"营收 {revenue_yoy:+.2f}% / 净利 {profit_yoy:+.2f}%", "tone": "good" if scores["sentiment"] >= 72 else "warn"},
        {"label": "估值性价比", "value": value_label(scores["valuation"], 55, 72, ("一般", "中性", "友好")), "note": consensus_pe and f"一致预期PE {consensus_pe:.1f} 倍" or "等待更多估值参考", "tone": "good" if scores["valuation"] >= 72 else "warn"},
        {"label": "价格位置", "value": value_label(scores["technical"], 55, 75, ("偏弱", "中性", "偏强")), "note": f"3个月表现 {build_range_payload(hist_records, flow_records, '3M')['performance']:+.2f}%", "tone": "good" if scores["technical"] >= 75 else "warn"},
    ]

    evidence = [
        {"tag": "财务", "title": f"ROE {roe:.2f}% 与净利同比 {profit_yoy:+.2f}%", "body": "长期持有前先确认盈利能力和增长持续性。"},
        {"tag": "现金流", "title": f"近五日主力净流 {flow_net:+.2f} 亿 / 经营数据同步看", "body": "短期资金只能做辅助，真正重要的是现金流能否支撑利润。"},
        {"tag": "估值", "title": f"综合评分 {scores['composite']:.1f} / 估值评分 {scores['valuation']:.1f}", "body": "长期买点更看估值与质量是否匹配，而不是单日情绪。"},
    ]

    logs = [
        {"time": now_local().strftime("%H:%M:%S"), "text": f"INFO  日线行情载入完成：{len(hist_records)} 条。"},
        {"time": now_local().strftime("%H:%M:%S"), "text": f"INFO  资金流记录载入完成：{len(flow_records)} 条。"},
        {"time": now_local().strftime("%H:%M:%S"), "text": f"INFO  财务指标与新闻载入完成：财务 {len(financial_records)} 期 / 新闻 {len(news)} 条 / 研报 {len(reports)} 条。"},
        {"time": now_local().strftime("%H:%M:%S"), "text": f"INFO  已生成长期主义研究结论：综合评分 {scores['composite']:.1f}。"},
    ]

    tags = [
        sector,
        value_label(scores["fundamental"], 60, 80, ("一般质量", "稳健经营", "高质量")),
        value_label(scores["sentiment"], 55, 72, ("增长放缓", "增长中性", "增长良好")),
        "真实数据",
    ]

    stock = {
        "code": symbol,
        "ticker": ticker_for_symbol(symbol),
        "name": name,
        "sector": sector,
        "updated": now_text(),
        "price": round(latest_close, 2),
        "change": round(change, 2),
        "changePct": round(change_pct, 2),
        "session": "真实数据",
        "summary": summary,
        "dataDates": {
            "quote_time": now_local().strftime("%Y-%m-%d %H:%M"),
            "price_date": format_data_date(latest.get("日期")),
            "financial_report_date": format_data_date(latest_financial.get("REPORT_DATE")),
            "latest_news_at": format_data_date(news[0].get("发布时间"), with_time=True) if news else None,
            "latest_report_at": format_data_date(reports[0].get("日期")) if reports else None,
        },
        "tags": tags,
        "heroStats": [
            {"label": "综合评分", "value": f"{scores['composite']:.1f}", "note": "长期主义模型"},
            {"label": "预期差", "value": expected_gap, "note": "成长与质量偏离度"},
            {"label": "市场热度", "value": f"{crowding:.0f}%", "note": f"最新换手率 {turnover:.2f}%"},
            {"label": "观察窗口", "value": observation_window, "note": f"总市值 {market_cap / 1e8:.1f} 亿"},
        ],
        "thesis": {
            "confidence": int(round(clamp(scores["composite"] + (scores["fundamental"] - scores["sentiment"]) * 0.15, 45, 92))),
            "stance": stance,
            "summary": f"操作建议偏向“{operation_advice(scores)}”，在长期框架里更适合归为“{role}”。",
            "metrics": [
                {"label": "操作建议", "value": operation_advice(scores)},
                {"label": "主线角色", "value": role},
                {"label": "估值位置", "value": value_label(scores["valuation"], 55, 72, ("偏贵", "中性", "偏友好"))},
                {"label": "成长状态", "value": value_label(scores["sentiment"], 55, 72, ("偏弱", "中性", "良好"))},
            ],
            "current": current,
            "technical": technical,
            "fundamental": fundamental,
            "catalysts": catalysts,
            "risks": risks,
        },
        "scores": [
            {"label": "价格位置", "value": round(scores["technical"]), "note": "只做辅助，不主导长期结论"},
            {"label": "经营质量", "value": round(scores["fundamental"]), "note": "来自 ROE、毛利率、现金流和负债"},
            {"label": "成长质量", "value": round(scores["sentiment"]), "note": "来自营收、利润与投入产出改善"},
            {"label": "估值性价比", "value": round(scores["valuation"]), "note": "来自一致预期 PE 与成长修正"},
        ],
        "factors": [
            {"label": "盈利质量", "value": round(clamp(roe * 4.5, 20, 95)), "caption": f"ROE {roe:.2f}% 与毛利率 {gross_margin:.2f}% 决定底层资产质量。"},
            {"label": "成长持续性", "value": round(scores["sentiment"]), "caption": "营收和利润增长能否持续，决定长期空间。"},
            {"label": "估值匹配度", "value": round(scores["valuation"]), "caption": "估值不是越低越好，而是要和增长质量匹配。"},
            {"label": "价格位置", "value": round(scores["technical"]), "caption": "价格位置用于帮助理解安全边际，而不是短线择时。"},
            {"label": "风险敞口", "value": round(clamp(100 - scores["valuation"], 35, 82)), "caption": "长期风险更多来自质量恶化和估值透支。"},
        ],
        "signals": signals,
        "evidence": evidence,
        "timeline": build_timeline(news, reports),
        "logs": logs,
        "workflow": DEFAULT_WORKFLOW,
        "heatmap": build_heatmap(flow_records),
        "ranges": {
            "1M": build_range_payload(hist_records, flow_records, "1M"),
            "3M": build_range_payload(hist_records, flow_records, "3M"),
            "6M": build_range_payload(hist_records, flow_records, "6M"),
        },
    }
    return stock


def build_workspace(settings: Settings, symbol: str, force_refresh: bool = False) -> dict[str, Any]:
    ensure_output_dirs(settings)
    symbol = normalize_symbol(symbol)
    if not force_refresh:
        cached = load_workspace_cache(settings, symbol)
        if cached:
            return cached
    stale_cached = load_workspace_cache(settings, symbol, allow_stale=True)

    try:
        info_map = fetch_info_map(symbol)
        hist_frame = fetch_hist(symbol)
        flow_frame = fetch_fund_flow(symbol)
        financial_frame = fetch_financials(symbol)
        news = fetch_news(symbol)
        reports = fetch_reports(symbol)
    except ExternalServiceError:
        if stale_cached:
            return stale_cached
        raise

    workspace = build_heuristic_workspace(symbol, info_map, hist_frame, flow_frame, financial_frame, news, reports)
    save_workspace_cache(settings, symbol, workspace)
    return workspace


def openclaw_available(settings: Settings) -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["openclaw", "status"],
            cwd=settings.root_dir,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except FileNotFoundError:
        return {"available": False, "model": None}
    except subprocess.TimeoutExpired:
        return {"available": False, "model": None}

    available = result.returncode == 0
    return {"available": available, "model": settings.openclaw_agent if available else None}


def build_openclaw_prompt(stock: dict[str, Any], deep_mode: bool) -> str:
    context = {
        "code": stock["code"],
        "name": stock["name"],
        "sector": stock["sector"],
        "price": stock["price"],
        "changePct": stock["changePct"],
        "summary": stock["summary"],
        "scores": stock["scores"],
        "heroStats": stock["heroStats"],
        "timeline": stock["timeline"][:4],
        "evidence": stock["evidence"][:3],
        "ranges": {
            key: {
                "performance": value["performance"],
                "volatility": value["volatility"],
                "metrics": value["metrics"],
            }
            for key, value in stock["ranges"].items()
        },
    }
    detail_level = "深度" if deep_mode else "标准"
    return f"""
你是 A 股研究助手。请基于下面的结构化事实，为股票生成{detail_level}结论。
必须只返回 JSON，不要输出 markdown，不要输出解释。

JSON schema:
{{
  "stance": "进攻偏多|中性偏多|中性|谨慎观察",
  "confidence": 0-100,
  "summary": "一句话总括",
  "current": "1段当前判断",
  "technical": ["3条以内"],
  "fundamental": ["3条以内"],
  "catalysts": ["4条以内"],
  "risks": ["4条以内"],
  "signals": [
    {{"label": "...", "value": "...", "note": "...", "tone": "good|warn|risk"}}
  ],
  "evidence": [
    {{"tag": "...", "title": "...", "body": "..."}}
  ],
  "tags": ["最多4个标签"]
}}

要求:
1. 用中文，结论要像投研工作台，不要像空泛鸡汤。
2. 催化和风险要可执行、可跟踪。
3. 如果信息不足，就保守输出，不要编造。
4. technical/fundamental/catalysts/risks 的每个元素尽量短。

结构化事实:
{json.dumps(context, ensure_ascii=False)}
""".strip()


def extract_json_object(raw_text: str, required_keys: set[str] | None = None) -> dict[str, Any]:
    decoder = json.JSONDecoder()
    candidate: dict[str, Any] | None = None
    for index, char in enumerate(raw_text):
        if char != "{":
            continue
        try:
            parsed, _ = decoder.raw_decode(raw_text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            if required_keys and required_keys.issubset(set(parsed.keys())):
                return parsed
            candidate = parsed
    if candidate is None:
        raise ExternalServiceError("无法解析 OpenClaw 返回的 JSON。")
    return candidate


def extract_payload_text(raw_output: str) -> str:
    envelope = extract_json_object(raw_output, required_keys={"payloads"})
    payloads = envelope.get("payloads") or []
    if not payloads:
        raise ExternalServiceError("OpenClaw 返回为空。")
    text = payloads[0].get("text") or ""
    if not text:
        raise ExternalServiceError("OpenClaw 文本内容为空。")
    return str(text)


def run_openclaw_analysis(settings: Settings, stock: dict[str, Any], deep_mode: bool) -> dict[str, Any]:
    prompt = build_openclaw_prompt(stock, deep_mode)
    thinking = "high" if deep_mode else "medium"
    with OPENCLAW_LOCK:
        try:
            result = subprocess.run(
                [
                    "openclaw",
                    "agent",
                    "--agent",
                    settings.openclaw_agent,
                    "--json",
                    "--thinking",
                    thinking,
                    "--message",
                    prompt,
                ],
                cwd=settings.root_dir,
                capture_output=True,
                text=True,
                timeout=settings.openclaw_timeout_seconds,
                check=False,
            )
        except FileNotFoundError as exc:
            raise ExternalServiceError("未找到 openclaw 命令。") from exc
        except subprocess.TimeoutExpired as exc:
            raise ExternalServiceError("OpenClaw 分析超时。") from exc

    combined = "\n".join(filter(None, [result.stdout, result.stderr]))
    if result.returncode != 0 and not result.stdout:
        raise ExternalServiceError(f"OpenClaw 调用失败: {combined.strip()}")

    payload_text = extract_payload_text(result.stdout or result.stderr or combined)
    cleaned = payload_text.strip().removeprefix("```json").removesuffix("```").strip()
    return extract_json_object(cleaned, required_keys={"stance", "summary"})


def merge_ai_analysis(stock: dict[str, Any], ai_result: dict[str, Any], deep_mode: bool) -> dict[str, Any]:
    merged = json.loads(json.dumps(stock, ensure_ascii=False))
    merged["summary"] = str(ai_result.get("summary") or merged["summary"])
    if ai_result.get("tags"):
        merged["tags"] = [str(tag) for tag in ai_result["tags"][:4]]
    merged["thesis"]["stance"] = str(ai_result.get("stance") or merged["thesis"]["stance"])
    merged["thesis"]["confidence"] = int(clamp(safe_float(ai_result.get("confidence")) or merged["thesis"]["confidence"], 0, 100))
    merged["thesis"]["summary"] = str(ai_result.get("summary") or merged["thesis"]["summary"])
    merged["thesis"]["current"] = str(ai_result.get("current") or merged["thesis"]["current"])
    for key in ("technical", "fundamental", "catalysts", "risks"):
        if isinstance(ai_result.get(key), list) and ai_result[key]:
            merged["thesis"][key] = [str(item) for item in ai_result[key][:4]]
    if isinstance(ai_result.get("signals"), list) and ai_result["signals"]:
        merged["signals"] = [
            {
                "label": str(item.get("label") or "信号"),
                "value": str(item.get("value") or "待观察"),
                "note": str(item.get("note") or ""),
                "tone": str(item.get("tone") or "warn"),
            }
            for item in ai_result["signals"][:4]
        ]
    if isinstance(ai_result.get("evidence"), list) and ai_result["evidence"]:
        merged["evidence"] = [
            {
                "tag": str(item.get("tag") or "证据"),
                "title": str(item.get("title") or "结论支撑"),
                "body": str(item.get("body") or ""),
            }
            for item in ai_result["evidence"][:3]
        ]
    merged["logs"].append(
        {
            "time": now_local().strftime("%H:%M:%S"),
            "text": f"INFO  OpenClaw {'深度' if deep_mode else '标准'}分析完成：{merged['thesis']['stance']} / 置信度 {merged['thesis']['confidence']}。",
        }
    )
    merged["updated"] = now_text()
    return merged


def analyze_symbol(settings: Settings, symbol: str, deep_mode: bool) -> dict[str, Any]:
    workspace = build_workspace(settings, symbol, force_refresh=False)
    ai_result = run_openclaw_analysis(settings, workspace, deep_mode)
    return merge_ai_analysis(workspace, ai_result, deep_mode)


def analyze_symbols(settings: Settings, symbols: list[str], deep_mode: bool) -> list[dict[str, Any]]:
    analyzed = []
    for symbol in symbols:
        analyzed.append(analyze_symbol(settings, symbol, deep_mode))
    return analyzed


def render_report_html(stocks: list[dict[str, Any]], deep_mode: bool) -> str:
    generated_at = now_local().strftime("%Y-%m-%d %H:%M:%S")
    sections = []
    for stock in stocks:
        sections.append(
            f"""
            <section class="card">
              <div class="head">
                <div>
                  <p class="eyebrow">{escape(stock['ticker'])}</p>
                  <h2>{escape(stock['name'])}</h2>
                  <p class="meta">{escape(stock['sector'])} · 最新价 {stock['price']:.2f} · 涨跌幅 {stock['changePct']:+.2f}%</p>
                </div>
                <div class="score">{escape(stock['thesis']['stance'])}<span>置信度 {stock['thesis']['confidence']}</span></div>
              </div>
              <p class="summary">{escape(stock['summary'])}</p>
              <div class="grid grid-4">
                {''.join(f"<div class='stat'><span>{escape(item['label'])}</span><strong>{escape(str(item['value']))}</strong><small>{escape(item['note'])}</small></div>" for item in stock['heroStats'])}
              </div>
              <div class="grid grid-2">
                <div class="block"><h3>当前判断</h3><p>{escape(stock['thesis']['current'])}</p></div>
                <div class="block"><h3>结构化信号</h3><ul>{''.join(f"<li>{escape(item['label'])}：{escape(item['value'])}，{escape(item['note'])}</li>" for item in stock['signals'])}</ul></div>
              </div>
              <div class="grid grid-2">
                <div class="block"><h3>技术与交易</h3><ul>{''.join(f"<li>{escape(item)}</li>" for item in stock['thesis']['technical'])}</ul></div>
                <div class="block"><h3>基本面与估值</h3><ul>{''.join(f"<li>{escape(item)}</li>" for item in stock['thesis']['fundamental'])}</ul></div>
              </div>
              <div class="grid grid-2">
                <div class="block"><h3>催化因素</h3><ul>{''.join(f"<li>{escape(item)}</li>" for item in stock['thesis']['catalysts'])}</ul></div>
                <div class="block"><h3>核心风险</h3><ul>{''.join(f"<li>{escape(item)}</li>" for item in stock['thesis']['risks'])}</ul></div>
              </div>
              <div class="grid grid-3">
                {''.join(f"<div class='evidence'><span>{escape(item['tag'])}</span><strong>{escape(item['title'])}</strong><p>{escape(item['body'])}</p></div>" for item in stock['evidence'])}
              </div>
            </section>
            """
        )

    return f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StockDesk 导出报告</title>
      <style>
        :root {{
          --bg: #f5f2ea;
          --card: #fffdfa;
          --ink: #182321;
          --muted: #64726d;
          --accent: #174e43;
          --line: rgba(24, 35, 33, 0.1);
        }}
        * {{ box-sizing: border-box; }}
        body {{
          margin: 0;
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          color: var(--ink);
          background: linear-gradient(180deg, #f7f4ed 0%, var(--bg) 100%);
        }}
        main {{
          width: min(1120px, calc(100vw - 40px));
          margin: 0 auto;
          padding: 32px 0 48px;
        }}
        .hero {{
          padding: 28px;
          border-radius: 28px;
          background: var(--card);
          border: 1px solid var(--line);
          margin-bottom: 18px;
        }}
        .hero h1, h2, h3, p {{ margin: 0; }}
        .hero h1 {{ font-size: 42px; letter-spacing: -0.04em; }}
        .hero p {{ margin-top: 10px; color: var(--muted); line-height: 1.7; }}
        .card {{
          margin-top: 18px;
          padding: 24px;
          border-radius: 28px;
          background: var(--card);
          border: 1px solid var(--line);
        }}
        .head {{
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }}
        .eyebrow {{
          color: var(--muted);
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }}
        .meta, .summary, .block p, li {{
          color: var(--muted);
          line-height: 1.7;
        }}
        .summary {{ margin-top: 14px; }}
        .score {{
          display: grid;
          justify-items: end;
          gap: 6px;
          font-size: 26px;
          font-weight: 700;
        }}
        .score span {{
          display: inline-flex;
          min-height: 28px;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(23, 78, 67, 0.08);
          color: var(--accent);
          font-size: 12px;
        }}
        .grid {{
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }}
        .grid-4 {{ grid-template-columns: repeat(4, minmax(0, 1fr)); }}
        .grid-3 {{ grid-template-columns: repeat(3, minmax(0, 1fr)); }}
        .grid-2 {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
        .stat, .block, .evidence {{
          padding: 16px;
          border-radius: 20px;
          background: #fff;
          border: 1px solid var(--line);
        }}
        .stat span, .evidence span {{ color: var(--muted); font-size: 12px; }}
        .stat strong {{ display: block; margin-top: 10px; font-size: 30px; }}
        .stat small {{ display: block; margin-top: 8px; color: var(--muted); }}
        .block h3, .evidence strong {{ font-size: 20px; letter-spacing: -0.03em; }}
        .block ul {{ margin: 10px 0 0; padding-left: 18px; }}
        .evidence p {{ margin-top: 10px; color: var(--muted); line-height: 1.7; }}
        @media (max-width: 900px) {{
          .grid-4, .grid-3, .grid-2 {{ grid-template-columns: 1fr; }}
          .head {{ flex-direction: column; }}
          .score {{ justify-items: start; }}
        }}
      </style>
    </head>
    <body>
      <main>
        <section class="hero">
          <p class="eyebrow">OpenClaw StockDesk Report</p>
          <h1>股票分析导出报告</h1>
          <p>生成时间：{escape(generated_at)} · 分析模式：{'深度' if deep_mode else '标准'} · 股票数量：{len(stocks)}</p>
        </section>
        {''.join(sections)}
      </main>
    </body>
    </html>
    """


def export_report(settings: Settings, symbols: list[str], deep_mode: bool) -> dict[str, Any]:
    stocks = analyze_symbols(settings, symbols, deep_mode)
    timestamp = now_local().strftime("%Y%m%d-%H%M%S")
    filename = f"stockdesk-report-{timestamp}.html"
    target = settings.report_dir / filename
    target.write_text(render_report_html(stocks, deep_mode), encoding="utf-8")
    return {
        "filename": filename,
        "download_url": f"/output/reports/{filename}",
    }
