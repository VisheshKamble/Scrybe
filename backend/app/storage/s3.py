from __future__ import annotations

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.storage.base import StorageService, validate_key


class S3Storage(StorageService):
    """Any S3-compatible store (AWS S3, Cloudflare R2, Backblaze B2, MinIO)."""

    def __init__(self, client=None):
        if client is None:
            import boto3

            client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url or None,
                region_name=settings.s3_region or None,
                aws_access_key_id=settings.s3_access_key_id or None,
                aws_secret_access_key=settings.s3_secret_access_key or None,
            )
        self.client = client
        self.bucket = settings.s3_bucket

    def upload(self, key, data, content_type=None):
        extra = {"ContentType": content_type} if content_type else {}
        try:
            self.client.put_object(
                Bucket=self.bucket, Key=validate_key(key), Body=data.encode() if isinstance(data, str) else data, **extra
            )
        except Exception as exc:  # botocore errors are many; classify at the boundary
            raise ScrybeError(ErrorCode.STORAGE_UPLOAD_FAILED, str(exc)) from exc

    def upload_file(self, key, local_path):
        try:
            self.client.upload_file(local_path, self.bucket, validate_key(key))
        except Exception as exc:
            raise ScrybeError(ErrorCode.STORAGE_UPLOAD_FAILED, str(exc)) from exc

    def download(self, key):
        try:
            return self.client.get_object(Bucket=self.bucket, Key=validate_key(key))["Body"].read()
        except Exception as exc:
            raise ScrybeError(ErrorCode.STORAGE_DOWNLOAD_FAILED, f"{key}: {exc}") from exc

    def download_file(self, key, local_path):
        try:
            self.client.download_file(self.bucket, validate_key(key), local_path)
        except Exception as exc:
            raise ScrybeError(ErrorCode.STORAGE_DOWNLOAD_FAILED, f"{key}: {exc}") from exc

    def delete(self, key):
        try:
            self.client.delete_object(Bucket=self.bucket, Key=validate_key(key))
        except Exception:
            pass

    def exists(self, key):
        try:
            self.client.head_object(Bucket=self.bucket, Key=validate_key(key))
            return True
        except Exception:
            return False

    def get_url(self, key, expires_seconds=3600):
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": validate_key(key)}, ExpiresIn=expires_seconds
        )
