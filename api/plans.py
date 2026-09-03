"""Subscription plans and their streaming limits (source of truth)."""

PLANS = {
    "free": {
        "max_destinations": 1,
        "max_video_bitrate_kbps": 2500,
    },
    "pro": {
        "max_destinations": 3,
        "max_video_bitrate_kbps": 6000,
    },
}


def plan_limits(plan: str) -> dict:
    """Return the limits dict for a plan name (falls back to `free`)."""
    return dict(PLANS.get(plan, PLANS["free"]))
