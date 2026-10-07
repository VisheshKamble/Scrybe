from __future__ import annotations

import shutil
from pathlib import Path

from app.errors import ErrorCode, ScrybeError
from app.storage.base import StorageService, validate_key


class LocalStorage(StorageService):
    """Filesystem backend. Fine for docker-compose (shared volume) and tests;
    NOT suitable for multi-service Render deployments (no shared disk)."""

    def __init__(self, root: str):
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / validate_key(key)).resolve()
        if self.root not in p.parents:
            raise ValueError("path escapes storage root")
        return p

    def upload(self, key, data, content_type=None):
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_suffix(p.suffix + ".tmp")
        try:
            tmp.write_bytes(data.encode() if isinstance(data, str) else data)
            tmp.replace(p)  # atomic: readers never see a half-written file
        except OSError as exc:
            raise ScrybeError(ErrorCode.STORAGE_UPLOAD_FAILED, str(exc)) from exc

    def upload_file(self, key, local_path):
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copyfile(local_path, p)
        except OSError as exc:
            raise ScrybeError(ErrorCode.STORAGE_UPLOAD_FAILED, str(exc)) from exc

    def download(self, key):
        try:
            return self._path(key).read_bytes()
        except OSError as exc:
            raise ScrybeError(ErrorCode.STORAGE_DOWNLOAD_FAILED, f"{key}: {exc}") from exc

    def download_file(self, key, local_path):
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copyfile(self._path(key), local_path)
        except OSError as exc:
            raise ScrybeError(ErrorCode.STORAGE_DOWNLOAD_FAILED, f"{key}: {exc}") from exc

    def delete(self, key):
        try:
            self._path(key).unlink(missing_ok=True)
        except OSError:
            pass

    def exists(self, key):
        return self._path(key).is_file()

    def get_url(self, key, expires_seconds=3600):
        return None
