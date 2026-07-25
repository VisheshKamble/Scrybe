import uuid
from pathlib import Path

UPLOAD_DIR = Path("data/screenshots")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# The extension comes from the uploaded filename, which is attacker-
# controlled input -- whitelisting to known image types (rather than
# trusting whatever string followed the last ".") is what keeps it from
# ever being used to smuggle something like a nested path (e.g. "b/c",
# which Path() would happily treat as a subdirectory) into the saved
# filename below.
_ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def save_uploaded_screenshot(file_bytes: bytes, extension: str = "jpg") -> str:
    """Saves a user-uploaded frame so it can be matched against the video's
    keyframes via visual similarity search -- this is the "ask about this
    moment" feature.
    """
    safe_extension = extension.lower() if extension.lower() in _ALLOWED_EXTENSIONS else "jpg"
    path = UPLOAD_DIR / f"{uuid.uuid4().hex[:10]}.{safe_extension}"
    path.write_bytes(file_bytes)
    return str(path)
