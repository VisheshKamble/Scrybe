import uuid
from pathlib import Path

UPLOAD_DIR = Path("data/screenshots")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_screenshot(file_bytes: bytes, extension: str = "jpg") -> str:
    """Saves a user-uploaded frame so it can be matched against the video's
    keyframes via visual similarity search -- this is the "ask about this
    moment" feature.
    """
    path = UPLOAD_DIR / f"{uuid.uuid4().hex[:10]}.{extension}"
    path.write_bytes(file_bytes)
    return str(path)
