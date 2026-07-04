#!/usr/bin/env python3
import json
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

ENV_PATH = "/opt/studio-neeklo/backend/.env"


def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def mask(value: str) -> str:
    if not value:
        return "NOT SET"
    return f"{value[:8]}...{value[-4:]} (len={len(value)})"


def req(method, url, headers=None, data=None, timeout=20):
    headers = headers or {}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers.setdefault("Content-Type", "application/json")
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
            return response.status, text
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc)


def main() -> None:
    env = load_env(ENV_PATH)

    print("=== KEY INVENTORY (masked) ===")
    key_names = [
        "OPENROUTER_API_KEY",
        "OPENAI_API_KEY",
        "OPENAI_API_KEY_ALT",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "GEMINI_OAUTH_TOKEN",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_API_KEY_ALT",
        "HEYGEN_API_KEY",
        "FAL_KEY",
        "REPLICATE_API_TOKEN",
        "NEEKLO_GENERATION_API_KEY",
        "NEEKLO_PLATFORM_API_KEY",
    ]
    for name in key_names:
        print(f"{name:<28} {mask(env.get(name, ''))}")

    print("\n=== PROVIDER CONFIG ===")
    config_keys = [
        "GEN_IMAGE_PROVIDER",
        "GEN_VIDEO_PROVIDER",
        "GEN_VOICE_PROVIDER",
        "REPLICATE_IMAGE_MODEL",
        "REPLICATE_VIDEO_MODEL",
        "REPLICATE_TTS_MODEL",
        "FAL_IMAGE_MODEL",
        "FAL_VIDEO_MODEL",
        "OPENROUTER_MODEL",
        "EGRESS_PROXY_URL",
        "NEEKLO_GENERATION_API_URL",
        "NEEKLO_PLATFORM_API_URL",
        "NEEKLO_MEDIA_API_URL",
    ]
    for name in config_keys:
        value = env.get(name) or "default/not set"
        print(f"{name}={value}")

    print("\n=== AVAILABILITY CHECKS ===")
    results: list[tuple[str, bool | None, str]] = []

    openrouter_key = env.get("OPENROUTER_API_KEY")
    if openrouter_key:
        status, body = req(
            "POST",
            "https://openrouter.ai/api/v1/chat/completions",
            {"Authorization": f"Bearer {openrouter_key}"},
            {
                "model": "openai/gpt-4o-mini",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5,
            },
        )
        detail = f"HTTP {status}"
        if status != 200:
            detail += " " + body[:120]
        results.append(("OpenRouter", status == 200, detail))
    else:
        results.append(("OpenRouter", None, "SKIP"))

    for label, env_name in [
        ("OpenAI (primary)", "OPENAI_API_KEY"),
        ("OpenAI (alt)", "OPENAI_API_KEY_ALT"),
    ]:
        api_key = env.get(env_name)
        if api_key:
            status, body = req(
                "GET",
                "https://api.openai.com/v1/models",
                {"Authorization": f"Bearer {api_key}"},
            )
            detail = f"HTTP {status}"
            if status == 200:
                try:
                    detail += f", {len(json.loads(body).get('data', []))} models"
                except json.JSONDecodeError:
                    pass
            else:
                detail += " " + body[:100]
            results.append((label, status == 200, detail))
        else:
            results.append((label, None, "SKIP"))

    anthropic_key = env.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        status, body = req(
            "POST",
            "https://api.anthropic.com/v1/messages",
            {"x-api-key": anthropic_key, "anthropic-version": "2023-06-01"},
            {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 5,
                "messages": [{"role": "user", "content": "ping"}],
            },
        )
        detail = f"HTTP {status}"
        if status != 200:
            detail += " " + body[:120]
        results.append(("Anthropic", status == 200, detail))
    else:
        results.append(("Anthropic", None, "SKIP"))

    gemini_key = env.get("GEMINI_API_KEY")
    if gemini_key:
        status, body = req(
            "GET",
            f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}",
        )
        detail = f"HTTP {status}"
        if status == 200:
            try:
                detail += f", {len(json.loads(body).get('models', []))} models"
            except json.JSONDecodeError:
                pass
        else:
            detail += " " + body[:120]
        results.append(("Gemini (API key)", status == 200, detail))
    else:
        results.append(("Gemini (API key)", None, "SKIP"))

    gemini_oauth = env.get("GEMINI_OAUTH_TOKEN")
    if gemini_oauth:
        status, body = req(
            "GET",
            "https://generativelanguage.googleapis.com/v1beta/models",
            {"Authorization": f"Bearer {gemini_oauth}"},
        )
        detail = f"HTTP {status}"
        if status != 200:
            detail += " " + body[:120]
        results.append(("Gemini (OAuth)", status == 200, detail))
    else:
        results.append(("Gemini (OAuth)", None, "SKIP"))

    replicate_key = env.get("REPLICATE_API_TOKEN")
    if replicate_key:
        status, body = req(
            "GET",
            "https://api.replicate.com/v1/account",
            {"Authorization": f"Bearer {replicate_key}"},
        )
        detail = f"HTTP {status}"
        if status == 200:
            try:
                detail += f", user @{json.loads(body).get('username', '?')}"
            except json.JSONDecodeError:
                pass
        else:
            detail += " " + body[:120]
        results.append(("Replicate", status == 200, detail))
    else:
        results.append(("Replicate", None, "SKIP"))

    fal_key = env.get("FAL_KEY")
    if fal_key:
        status, body = req(
            "GET",
            "https://rest.alpha.fal.ai/accounts/current",
            {"Authorization": f"Key {fal_key}"},
        )
        detail = f"account probe HTTP {status}"
        if status != 200:
            detail += " " + body[:120]
        results.append(("Fal.ai", status == 200, detail))
    else:
        results.append(("Fal.ai", None, "SKIP"))

    for label, env_name in [
        ("ElevenLabs (primary)", "ELEVENLABS_API_KEY"),
        ("ElevenLabs (alt)", "ELEVENLABS_API_KEY_ALT"),
    ]:
        api_key = env.get(env_name)
        if api_key:
            status, body = req(
                "GET",
                "https://api.elevenlabs.io/v1/user",
                {"xi-api-key": api_key},
            )
            detail = f"HTTP {status}"
            if status == 200:
                try:
                    detail += f", tier={json.loads(body).get('subscription', {}).get('tier', '?')}"
                except json.JSONDecodeError:
                    pass
            else:
                detail += " " + body[:120]
            results.append((label, status == 200, detail))
        else:
            results.append((label, None, "SKIP"))

    heygen_key = env.get("HEYGEN_API_KEY")
    if heygen_key:
        status, body = req(
            "GET",
            "https://api.heygen.com/v2/user/remaining_quota",
            {"X-Api-Key": heygen_key},
        )
        detail = f"HTTP {status}"
        if status != 200:
            detail += " " + body[:120]
        results.append(("HeyGen", status == 200, detail))
    else:
        results.append(("HeyGen", None, "SKIP"))

    for label, url_name, key_name in [
        ("Neeklo Generation API", "NEEKLO_GENERATION_API_URL", "NEEKLO_GENERATION_API_KEY"),
        ("Neeklo Platform API", "NEEKLO_PLATFORM_API_URL", "NEEKLO_PLATFORM_API_KEY"),
    ]:
        url = (env.get(url_name) or "").rstrip("/")
        api_key = env.get(key_name)
        if url and api_key:
            status, body = req("GET", url + "/health", {"Authorization": f"Bearer {api_key}"})
            if status not in (200, 404):
                status, body = req("GET", url + "/health", {"x-api-key": api_key})
            results.append((label, status == 200, f"HTTP {status} {body[:100]}"))
        elif url:
            status, body = req("GET", url + "/health")
            results.append((label, status == 200, f"HTTP {status} (no key) {body[:100]}"))
        else:
            results.append((label, None, "SKIP"))

    media_url = (env.get("NEEKLO_MEDIA_API_URL") or "").rstrip("/")
    if media_url:
        status, body = req("GET", media_url + "/health")
        results.append(("Neeklo Media API", status == 200, f"HTTP {status} {body[:100]}"))
    else:
        results.append(("Neeklo Media API", None, "SKIP"))

    proxy_url = env.get("EGRESS_PROXY_URL")
    if proxy_url:
        try:
            proxy_handler = urllib.request.ProxyHandler({"http": proxy_url, "https": proxy_url})
            opener = urllib.request.build_opener(proxy_handler)
            response = opener.open("https://api.ipify.org?format=json", timeout=10)
            ip = response.read().decode()
            results.append(("Egress proxy", True, f"OK via proxy, IP={ip}"))
        except Exception as exc:  # noqa: BLE001
            results.append(("Egress proxy", False, str(exc)[:120]))
    else:
        results.append(("Egress proxy", None, "SKIP"))

    for name, ok, detail in results:
        status = "SKIP" if ok is None else "OK" if ok else "FAIL"
        print(f"{name:<24} {status:<5} {detail}")

    if proxy_url:
        print("\n=== CHECKS VIA EGRESS PROXY ===")
        proxy_handler = urllib.request.ProxyHandler({"http": proxy_url, "https": proxy_url})
        proxy_opener = urllib.request.build_opener(proxy_handler)

        def req_proxy(url, headers):
            request = urllib.request.Request(url, headers=headers)
            try:
                with proxy_opener.open(request, timeout=15) as response:
                    return response.status, response.read().decode("utf-8", errors="replace")
            except urllib.error.HTTPError as exc:
                return exc.code, exc.read().decode("utf-8", errors="replace")
            except Exception as exc:  # noqa: BLE001
                return 0, str(exc)

        if replicate_key:
            status, body = req_proxy(
                "https://api.replicate.com/v1/account",
                {"Authorization": f"Bearer {replicate_key}"},
            )
            print(f"{'Replicate (proxy)':<24} {'OK' if status == 200 else 'FAIL':<5} HTTP {status} {body[:100]}")
        if env.get("ELEVENLABS_API_KEY"):
            status, body = req_proxy(
                "https://api.elevenlabs.io/v1/user",
                {"xi-api-key": env["ELEVENLABS_API_KEY"]},
            )
            print(f"{'ElevenLabs (proxy)':<24} {'OK' if status == 200 else 'FAIL':<5} HTTP {status} {body[:100]}")
        if env.get("OPENAI_API_KEY"):
            status, body = req_proxy(
                "https://api.openai.com/v1/models",
                {"Authorization": f"Bearer {env['OPENAI_API_KEY']}"},
            )
            print(f"{'OpenAI primary (proxy)':<24} {'OK' if status == 200 else 'FAIL':<5} HTTP {status} {body[:100]}")

    print("\n=== LOCAL SERVICES ===")
    for service in ["studio-api", "studio-frontend", "studio-worker", "studio-proxy-tunnel"]:
        result = subprocess.run(["systemctl", "is-active", service], capture_output=True, text=True)
        print(f"{service:<22} {result.stdout.strip()}")

    for label, url in [
        ("studio-api health", "http://127.0.0.1:3016/api/health"),
        ("studio-frontend", "http://127.0.0.1:3000/"),
    ]:
        status, _ = req("GET", url)
        print(f"{label:<22} HTTP {status}")

    print("\n=== RECENT WORKER ERRORS (last 5) ===")
    log_path = Path("/var/log/studio-neeklo/worker.log")
    if log_path.exists():
        errors = [
            line
            for line in log_path.read_text(errors="replace").splitlines()
            if any(token in line.lower() for token in ["error", "fail", "429", "401", "403"])
        ]
        for line in errors[-5:]:
            print(line[:200])
        if not errors:
            print("(none)")
    else:
        print("(log not found)")


if __name__ == "__main__":
    main()
