import os
import time


def uuid7() -> str:
    """Generate a UUID v7 (time-ordered, monotonic)."""
    ms = int(time.time() * 1000)
    rand = os.urandom(10)
    b = bytearray(16)
    # 48-bit Unix timestamp in milliseconds
    b[0] = (ms >> 40) & 0xFF
    b[1] = (ms >> 32) & 0xFF
    b[2] = (ms >> 24) & 0xFF
    b[3] = (ms >> 16) & 0xFF
    b[4] = (ms >> 8)  & 0xFF
    b[5] = ms         & 0xFF
    # 10 random bytes
    b[6:16] = rand
    # Version 7 (0111xxxx in byte 6)
    b[6] = (b[6] & 0x0F) | 0x70
    # Variant 10 (10xxxxxx in byte 8)
    b[8] = (b[8] & 0x3F) | 0x80
    h = b.hex()
    return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
