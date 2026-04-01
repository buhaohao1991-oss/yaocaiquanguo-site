from __future__ import annotations

import argparse
import json
import posixpath
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from .config import ConfigError, Settings, load_settings
from .errors import StockDeskError, ValidationError
from .service import analyze_symbols, build_market_overview, build_workspace, export_report, normalize_symbol, openclaw_available, query_universe


def log_event(event: str, **fields) -> None:
    payload = {"event": event, **fields}
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def validate_symbols(payload: dict) -> list[str]:
    symbols = payload.get("symbols")
    if not isinstance(symbols, list) or not symbols:
        raise ValidationError("symbols 必须是非空数组。")
    normalized = []
    for item in symbols[:12]:
        normalized.append(normalize_symbol(item))
    return list(dict.fromkeys(normalized))


class StockDeskHandler(SimpleHTTPRequestHandler):
    server_version = "StockDesk/1.0"

    def __init__(self, *args, settings: Settings, **kwargs):
        self.settings = settings
        super().__init__(*args, directory=str(settings.public_dir), **kwargs)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "no-referrer")
        if self.settings.allowed_origin:
            self.send_header("Access-Control-Allow-Origin", self.settings.allowed_origin)
            self.send_header("Vary", "Origin")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        log_event("request", path=self.path, detail=fmt % args)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/health":
                self.send_json(
                    {
                        "ok": True,
                        "openclaw": openclaw_available(self.settings),
                    }
                )
                return
            if parsed.path in {"/health", "/ready"}:
                self.send_json({"ok": True})
                return
            if parsed.path == "/api/workspace":
                query = parse_qs(parsed.query)
                symbol = normalize_symbol((query.get("symbol") or [""])[0])
                stock = build_workspace(self.settings, symbol)
                self.send_json({"stock": stock})
                return
            if parsed.path == "/api/market-overview":
                query = parse_qs(parsed.query)
                refresh_raw = (query.get("refresh") or ["0"])[0]
                force_refresh = str(refresh_raw).strip().lower() in {"1", "true", "yes", "y"}
                market = build_market_overview(self.settings, force_refresh=force_refresh)
                self.send_json(market)
                return
            if parsed.path == "/api/universe":
                query = parse_qs(parsed.query)
                search_text = (query.get("q") or query.get("query") or [""])[0]
                limit_raw = (query.get("limit") or ["60"])[0]
                refresh_raw = (query.get("refresh") or ["0"])[0]
                try:
                    limit = int(limit_raw)
                except ValueError as exc:
                    raise ValidationError("limit 必须是整数。") from exc
                force_refresh = str(refresh_raw).strip().lower() in {"1", "true", "yes", "y"}
                universe = query_universe(self.settings, query=str(search_text), limit=limit, force_refresh=force_refresh)
                self.send_json(universe)
                return
            if parsed.path == "/":
                self.path = "/stock-analysis-upgrade.html"
            super().do_GET()
        except Exception as exc:
            self.handle_error(exc)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        try:
            payload = self.read_json_body()
            if parsed.path == "/api/analyze":
                symbols = validate_symbols(payload)
                deep_mode = bool(payload.get("deep_mode"))
                stocks = analyze_symbols(self.settings, symbols, deep_mode)
                self.send_json({"stocks": stocks})
                return
            if parsed.path == "/api/batch-analyze":
                symbols = validate_symbols(payload)
                deep_mode = bool(payload.get("deep_mode"))
                stocks = analyze_symbols(self.settings, symbols, deep_mode)
                self.send_json({"stocks": stocks})
                return
            if parsed.path == "/api/export-report":
                symbols = validate_symbols(payload)
                deep_mode = bool(payload.get("deep_mode"))
                result = export_report(self.settings, symbols, deep_mode)
                self.send_json(result)
                return
            raise ValidationError("未知的 API 路径。")
        except Exception as exc:
            self.handle_error(exc)

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"
        try:
            payload = json.loads(raw_body or "{}")
        except json.JSONDecodeError as exc:
            raise ValidationError("请求体不是有效 JSON。") from exc
        if not isinstance(payload, dict):
            raise ValidationError("请求体必须是 JSON 对象。")
        return payload

    def handle_error(self, exc: Exception) -> None:
        if isinstance(exc, StockDeskError):
            status = exc.status_code
            error_code = exc.error_code
            message = exc.message
        else:
            status = HTTPStatus.INTERNAL_SERVER_ERROR
            error_code = "internal_error"
            message = str(exc) or "服务器内部错误。"
        log_event("error", path=self.path, status=status, error=error_code, message=message)
        self.send_json({"error": message, "code": error_code}, status=status)

    def send_json(self, payload: dict, status: int = 200) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        normalized = posixpath.normpath(unquote(parsed.path))
        cleaned = normalized.lstrip("/")
        if cleaned == "":
            cleaned = "stock-analysis-upgrade.html"

        if cleaned.startswith("output/"):
          base_dir = self.settings.output_dir.resolve()
          relative = cleaned[len("output/") :]
        else:
          base_dir = self.settings.public_dir.resolve()
          relative = cleaned

        target = (base_dir / relative).resolve()
        if base_dir not in target.parents and target != base_dir:
            return str(base_dir / "__missing__")
        return str(target)


def create_server(settings: Settings) -> ThreadingHTTPServer:
    def handler(*args, **kwargs):
        StockDeskHandler(*args, settings=settings, **kwargs)

    return ThreadingHTTPServer((settings.host, settings.port), handler)


def main() -> int:
    root_dir = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Serve the StockDesk demo with real data and OpenClaw analysis.")
    parser.add_argument("--host", help="Override host from env.")
    parser.add_argument("--port", type=int, help="Override port from env.")
    args = parser.parse_args()

    try:
        settings = load_settings(root_dir)
    except ConfigError as exc:
        print(f"Config error: {exc}")
        return 1

    if args.host:
        settings = Settings(**{**settings.__dict__, "host": args.host})
    if args.port:
        settings = Settings(**{**settings.__dict__, "port": args.port})

    server = create_server(settings)
    log_event("startup", host=settings.host, port=settings.port, root=str(root_dir))
    print(f"StockDesk server running at http://{settings.host}:{settings.port}/stock-analysis-upgrade.html", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        log_event("shutdown")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
