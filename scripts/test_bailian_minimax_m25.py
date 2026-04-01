#!/usr/bin/env python3
"""Smoke test for MiniMax-M2.5 through Bailian's OpenAI-compatible API."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request


DEFAULT_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1"
DEFAULT_MODEL = "MiniMax-M2.5"


def load_openclaw_bailian_provider() -> dict[str, object]:
    config_path = pathlib.Path.home() / ".openclaw" / "openclaw.json"
    if not config_path.exists():
        return {}

    try:
        config = json.loads(config_path.read_text())
    except (OSError, json.JSONDecodeError):
        return {}

    return config.get("models", {}).get("providers", {}).get("bailian", {})


def resolve_api_config() -> tuple[str, str]:
    provider = load_openclaw_bailian_provider()

    api_key = (
        os.environ.get("BAILIAN_API_KEY")
        or os.environ.get("DASHSCOPE_API_KEY")
        or provider.get("apiKey")
    )
    base_url = (
        os.environ.get("BAILIAN_BASE_URL")
        or os.environ.get("DASHSCOPE_BASE_URL")
        or provider.get("baseUrl")
        or DEFAULT_BASE_URL
    )

    if not api_key:
        raise RuntimeError(
            "Missing Bailian API key. Set BAILIAN_API_KEY or DASHSCOPE_API_KEY, "
            "or configure ~/.openclaw/openclaw.json with models.providers.bailian.apiKey."
        )

    return str(base_url).rstrip("/"), str(api_key)


def build_payload(args: argparse.Namespace) -> dict[str, object]:
    return {
        "model": args.model,
        "messages": [{"role": "user", "content": args.prompt}],
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
        "stream": False,
    }


def post_chat_completion(base_url: str, api_key: str, payload: dict[str, object]) -> dict[str, object]:
    url = f"{base_url}/chat/completions"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            body = response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response: {body}") from exc


def extract_output(data: dict[str, object]) -> tuple[str, str]:
    choices = data.get("choices") or []
    if not choices:
        return "", ""

    message = choices[0].get("message", {})
    content = message.get("content", "") or ""
    reasoning = message.get("reasoning_content", "") or ""
    return str(content), str(reasoning)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Test Bailian access to MiniMax-M2.5 through the OpenAI-compatible API."
    )
    parser.add_argument(
        "--prompt",
        default="请用一句话介绍你自己。",
        help="Prompt sent as the user message.",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Model id to use. Default: {DEFAULT_MODEL}",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.2,
        help="Sampling temperature.",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=256,
        help="Maximum completion tokens.",
    )
    parser.add_argument(
        "--show-reasoning",
        action="store_true",
        help="Print reasoning_content if the model returns it.",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Print the raw JSON response.",
    )
    args = parser.parse_args()

    try:
        base_url, api_key = resolve_api_config()
        payload = build_payload(args)
        data = post_chat_completion(base_url, api_key, payload)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.raw:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0

    content, reasoning = extract_output(data)
    usage = data.get("usage", {})

    print(f"Base URL: {base_url}")
    print(f"Model: {args.model}")
    if usage:
        print(
            "Usage: "
            f"prompt={usage.get('prompt_tokens', '?')} "
            f"completion={usage.get('completion_tokens', '?')} "
            f"total={usage.get('total_tokens', '?')}"
        )
    print()
    print(content.strip() or "<empty>")

    if args.show_reasoning and reasoning.strip():
        print()
        print("[reasoning]")
        print(reasoning.strip())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
