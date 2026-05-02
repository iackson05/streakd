from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _client_ip(request: Request) -> str:
    """Resolve the real client IP behind a reverse proxy (nginx).
    Falls back to the direct connection IP when no proxy header is present.
    Note: only trustworthy when the app is actually behind a proxy that strips
    incoming X-Forwarded-For values from the public internet.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # Take the first (left-most) IP — the original client
        return fwd.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
