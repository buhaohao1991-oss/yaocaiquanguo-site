from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


class ConfigError(RuntimeError):
    """Raised when environment configuration is invalid."""


@dataclass(frozen=True)
class Settings:
    root_dir: Path
    public_dir: Path
    output_dir: Path
    cache_dir: Path
    report_dir: Path
    host: str
    port: int
    cache_ttl_seconds: int
    openclaw_agent: str
    openclaw_timeout_seconds: int
    allowed_origin: str


def _int_env(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from exc
    if value < minimum:
        raise ConfigError(f"{name} must be >= {minimum}, got {value}")
    return value


def load_settings(root_dir: Path) -> Settings:
    public_dir = root_dir / "public"
    output_dir = root_dir / "output"
    cache_dir = output_dir / "stockdesk-cache"
    report_dir = output_dir / "reports"

    host = os.getenv("STOCKDESK_HOST", "127.0.0.1").strip() or "127.0.0.1"
    port = _int_env("STOCKDESK_PORT", 8765)
    cache_ttl_seconds = _int_env("STOCKDESK_CACHE_TTL_SECONDS", 900)
    openclaw_timeout_seconds = _int_env("STOCKDESK_OPENCLAW_TIMEOUT_SECONDS", 180)
    openclaw_agent = os.getenv("STOCKDESK_OPENCLAW_AGENT", "main").strip() or "main"
    allowed_origin = os.getenv("STOCKDESK_ALLOWED_ORIGIN", "").strip()

    if not public_dir.exists():
        raise ConfigError(f"Public directory not found: {public_dir}")

    cache_dir.mkdir(parents=True, exist_ok=True)
    report_dir.mkdir(parents=True, exist_ok=True)

    return Settings(
        root_dir=root_dir,
        public_dir=public_dir,
        output_dir=output_dir,
        cache_dir=cache_dir,
        report_dir=report_dir,
        host=host,
        port=port,
        cache_ttl_seconds=cache_ttl_seconds,
        openclaw_agent=openclaw_agent,
        openclaw_timeout_seconds=openclaw_timeout_seconds,
        allowed_origin=allowed_origin,
    )
