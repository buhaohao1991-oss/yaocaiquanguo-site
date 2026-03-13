#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook


FOUR_MARKETS = ["亳州", "安国", "成都", "玉林"]


def text(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def date_text(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    raw = text(value)
    return raw[:10]


def number_text(value, unit: str) -> str:
    if value in ("", None):
        return "待补充"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return text(value)
    number_str = f"{number:.2f}".rstrip("0").rstrip(".")
    suffix = unit or "元/kg"
    return f"{number_str} {suffix}"


def shorten(value: str, limit: int = 40) -> str:
    raw = text(value)
    if len(raw) <= limit:
        return raw
    return f"{raw[:limit].rstrip()}..."


def classify_tag(*parts: str) -> str:
    joined = " ".join(text(part) for part in parts)
    if any(keyword in joined for keyword in ["产新", "新货"]):
        return "产新"
    if any(keyword in joined for keyword in ["上浮", "上扬", "上涨", "走高", "抬升"]):
        return "上扬"
    if any(keyword in joined for keyword in ["坚挺", "偏强"]):
        return "坚挺"
    if any(keyword in joined for keyword in ["走货快", "畅快", "购销顺畅", "走动快", "走动良好", "走销", "走动尚可"]):
        return "走快"
    if any(keyword in joined for keyword in ["下滑", "下调", "回落", "疲软"]):
        return "下滑"
    if any(keyword in joined for keyword in ["平稳", "稳定", "正常", "不温不火", "价稳", "行情稳"]):
        return "平稳"
    return "关注"


def collect_from_quote_sheet(ws):
    rows = []
    headers = [text(cell.value) for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    for row_index, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not any(value not in (None, "") for value in row):
            continue
        data = {headers[index]: row[index] for index in range(len(headers))}
        rows.append(
            {
                "date": date_text(data.get("记录日期")),
                "herb": text(data.get("品种")),
                "spec": text(data.get("规格")),
                "unit": text(data.get("单位")) or "元/kg",
                "market": text(data.get("市场")),
                "location": text(data.get("产区")),
                "price": data.get("今日价"),
                "summary": text(data.get("备注")),
                "source": text(data.get("来源网站")),
                "url": text(data.get("来源链接")),
                "row_index": row_index,
            }
        )

    origins = [item for item in rows if item["market"] == "产地"]
    markets = [item for item in rows if item["market"] and item["market"] != "产地"]
    return origins, markets, []


def collect_from_multi_sheet(wb):
    def collect(sheet_name, mapping):
        sheet = wb[sheet_name]
        headers = [text(cell.value) for cell in next(sheet.iter_rows(min_row=1, max_row=1))]
        records = []
        for row_index, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not any(value not in (None, "") for value in row):
                continue
            data = {headers[index]: row[index] for index in range(len(headers))}
            record = {"row_index": row_index}
            for target, source in mapping.items():
                record[target] = data.get(source)
            records.append(record)
        return records

    origins = collect(
        "产地行情",
        {
            "date": "记录日期",
            "herb": "品种",
            "spec": "规格",
            "location": "产区",
            "price": "报价",
            "unit": "单位",
            "tag": "行情标签",
            "summary": "摘要",
            "source": "来源网站",
            "url": "来源链接",
            "note": "备注",
        },
    )
    for item in origins:
        item["date"] = date_text(item["date"])
        item["herb"] = text(item.get("herb"))
        item["spec"] = text(item.get("spec"))
        item["location"] = text(item.get("location"))
        item["unit"] = text(item.get("unit")) or "元/kg"
        item["summary"] = text(item.get("summary") or item.get("note"))
        item["source"] = text(item.get("source"))
        item["url"] = text(item.get("url"))
        item["market"] = "产地"

    markets = collect(
        "四大市场",
        {
            "date": "记录日期",
            "market": "市场",
            "herb": "品种",
            "spec": "规格",
            "price": "报价",
            "unit": "单位",
            "tag": "行情标签",
            "summary": "摘要",
            "source": "来源网站",
            "url": "来源链接",
            "note": "备注",
        },
    )
    for item in markets:
        item["date"] = date_text(item["date"])
        item["market"] = text(item.get("market"))
        item["herb"] = text(item.get("herb"))
        item["spec"] = text(item.get("spec"))
        item["unit"] = text(item.get("unit")) or "元/kg"
        item["summary"] = text(item.get("summary") or item.get("note"))
        item["source"] = text(item.get("source"))
        item["url"] = text(item.get("url"))
        item["location"] = item["market"]

    hotspots = collect(
        "行业热点",
        {
            "date": "记录日期",
            "kind": "类型",
            "title": "标题",
            "herb": "关联品种",
            "location": "关联地区/市场",
            "summary": "摘要",
            "source": "来源网站",
            "url": "来源链接",
            "note": "备注",
        },
    )
    for item in hotspots:
        item["date"] = date_text(item["date"])
        item["kind"] = text(item.get("kind")) or "热点"
        item["title"] = text(item.get("title"))
        item["herb"] = text(item.get("herb"))
        item["location"] = text(item.get("location"))
        item["summary"] = text(item.get("summary") or item.get("note"))
        item["source"] = text(item.get("source"))
        item["url"] = text(item.get("url"))

    return origins, markets, hotspots


def load_records(workbook_path: Path):
    wb = load_workbook(workbook_path, data_only=True)
    if {"产地行情", "四大市场", "行业热点"}.issubset(set(wb.sheetnames)):
        return collect_from_multi_sheet(wb)
    if "报价录入" in wb.sheetnames:
        return collect_from_quote_sheet(wb["报价录入"])
    raise SystemExit("Workbook does not contain a supported sheet structure.")


def build_dashboard(origins, markets, hotspots, source_path: Path):
    all_dates = sorted({item["date"] for item in origins + markets + hotspots if item.get("date")})
    latest_date = all_dates[-1] if all_dates else ""
    counts_by_date = Counter(item["date"] for item in origins + markets + hotspots if item.get("date"))
    herb_count = len({item["herb"] for item in origins + markets if item.get("herb")})
    source_count = len({item["source"] for item in origins + markets + hotspots if item.get("source")})
    sorted_origins = sorted(origins, key=lambda item: (item.get("date", ""), item.get("row_index", 0)), reverse=True)
    focus_markets = [item for item in markets if item.get("market") in FOUR_MARKETS]
    sorted_market_items = sorted(focus_markets, key=lambda item: (item.get("date", ""), item.get("row_index", 0)), reverse=True)
    covered_markets = sorted({item["market"] for item in focus_markets})
    sorted_hotspots = sorted(hotspots, key=lambda item: (item.get("date", ""), item.get("row_index", 0)), reverse=True)

    origin_items = [
        {
            "date": item.get("date") or "--",
            "herb": item.get("herb") or "待补充",
            "spec": item.get("spec") or "待补充规格",
            "location": item.get("location") or "待补充产区",
            "price": number_text(item.get("price"), item.get("unit")),
            "tag": text(item.get("tag")) or classify_tag(item.get("spec"), item.get("summary")),
            "summary": text(item.get("summary")) or "待补充摘要",
            "source": item.get("source") or "待补充",
            "url": item.get("url") or "",
        }
        for item in sorted_origins
    ]

    market_groups = []
    for market in FOUR_MARKETS:
        market_items = [item for item in sorted_market_items if item.get("market") == market]
        latest_market_date = market_items[0]["date"] if market_items else ""
        market_groups.append(
            {
                "name": market,
                "count": len(market_items),
                "latest_date": latest_market_date,
                "items": [
                    {
                        "date": item.get("date") or "--",
                        "herb": item.get("herb") or "待补充",
                        "spec": item.get("spec") or "待补充规格",
                        "price": number_text(item.get("price"), item.get("unit")),
                        "tag": text(item.get("tag")) or classify_tag(item.get("spec"), item.get("summary")),
                        "summary": text(item.get("summary")) or "待补充摘要",
                        "source": item.get("source") or "待补充",
                        "url": item.get("url") or "",
                    }
                    for item in market_items
                ],
            }
        )

    hotspot_items = [
        {
            "date": item.get("date") or "--",
            "kind": item.get("kind") or "热点",
            "title": item.get("title") or item.get("herb") or "待补充标题",
            "herb": item.get("herb") or "",
            "location": item.get("location") or "",
            "summary": text(item.get("summary")) or "待补充摘要",
            "source": item.get("source") or "待补充",
            "url": item.get("url") or "",
        }
        for item in sorted_hotspots
    ]

    note = (
        f"当前已整理 {len(origin_items)} 条产地行情、{len(sorted_market_items)} 条四大市场记录，"
        f"行业热点 {len(hotspot_items)} 条。"
    )

    return {
        "meta": {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source_file": source_path.name,
            "latest_date": latest_date,
            "available_dates": all_dates,
            "latest_count": counts_by_date[latest_date] if latest_date else 0,
            "day_span": len(all_dates),
            "covered_markets": covered_markets,
            "source_count": source_count,
            "herb_count": herb_count,
            "note": note,
        },
        "status": f"真实数据版 · 最新整理于 {latest_date}" if latest_date else "真实数据版 · 等待导入",
        "hero": {
            "eyebrow": "只做三块：产地行情 / 四大市场 / 行业热点",
            "title": "先把最有价值的信息做深，再做宽。",
            "lead": "首页不再铺无关模块，当前只保留三个主板块。产地行情按时间顺序完整收录，四大市场按市场分组维护，行业热点单独沉淀政策和新闻。",
            "source_strip": [
                f"产地行情：{len(origin_items)} 条",
                f"四大市场：{len(sorted_market_items)} 条",
                f"行业热点：{len(hotspot_items)} 条",
                f"来源网站：{source_count} 个",
            ],
        },
        "origin": {
            "total": len(origin_items),
            "latest_date": latest_date,
            "items": origin_items,
            "empty_text": "当前还没有产地行情数据。",
        },
        "markets": {
            "total": len(sorted_market_items),
            "covered_count": len(covered_markets),
            "groups": market_groups,
            "empty_text": "当前还没有四大市场数据。",
        },
        "hotspots": {
            "total": len(hotspot_items),
            "items": hotspot_items,
            "empty_text": "当前还没有行业热点，请在“行业热点”工作表里补充政策和新闻。",
        },
        "footer": {
            "left": "当前地址：yaocaiquanguo-site.pages.dev",
            "right": f"当前读取的数据源：{source_path.name}",
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Build dashboard JSON from herb workbook.")
    parser.add_argument("source", help="Path to the source workbook.")
    parser.add_argument(
        "--output",
        default="public/data/dashboard.json",
        help="Output JSON path relative to the repository root.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    source_path = Path(args.source).expanduser().resolve()
    output_path = (repo_root / args.output).resolve()

    origins, markets, hotspots = load_records(source_path)
    payload = build_dashboard(origins, markets, hotspots, source_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output_path)


if __name__ == "__main__":
    main()
