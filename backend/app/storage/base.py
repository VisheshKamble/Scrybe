"""Storage abstraction. Render's local disk is ephemeral and *not shared*
between services, so anything the API must read after a worker wrote it
(reports, vector indexes, source video) goes through this interface."""

from __future__ import annotations

import abc
from functools import lru_cache

from app.config import settings


class StorageService(abc.ABC):
    @abc.abstractmethod
    def upload(self, key: str, data: bytes | str, content_type: str | None = None) -> None: ...

    @abc.abstractmethod
    def upload_file(self, key: str, local_path: str) -> None: ...

    @abc.abstractmethod
    def download(self, key: str) -> bytes: ...

    @abc.abstractmethod
    def download_file(self, key: str, local_path: str) -> None: ...

    @abc.abstractmethod
    def delete(self, key: str) -> None: ...

    @abc.abstractmethod
    def exists(self, key: str) -> bool: ...

    @abc.abstractmethod
    def get_url(self, key: str, expires_seconds: int = 3600) -> str | None:
        """A URL a client can fetch directly, or None if the backend can't offer one."""


def validate_key(key: str) -> str:
    """Keys are `a/b/c.ext` made of safe characters; blocks traversal."""
    import re

    if not re.fullmatch(r"[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*", key) or ".." in key.split("/"):
        raise ValueError(f"invalid storage key: {key!r}")
    return key


@lru_cache(maxsize=1)
def get_storage() -> StorageService:
    if settings.storage_backend == "s3":
        from app.storage.s3 import S3Storage

        return S3Storage()
    from app.storage.local import LocalStorage

    return LocalStorage(settings.storage_local_path)


def reset_storage_cache() -> None:
    get_storage.cache_clear()
