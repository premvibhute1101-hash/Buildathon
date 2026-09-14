import hashlib
import os
import hmac
from datetime import datetime, timedelta, timezone
import jwt
from typing import Optional
from app.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies password using pbkdf2_sha256."""
    try:
        if ":" not in hashed_password:
            # Fallback for plain hex if any
            return hmac.compare_digest(
                hashlib.sha256(plain_password.encode()).hexdigest(),
                hashed_password
            )
        salt_hex, key_hex = hashed_password.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashes password with 100,000 iterations of PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
