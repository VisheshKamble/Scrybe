import boto3
import pytest
from moto import mock_aws

from app.config import settings
from app.errors import ErrorCode, ScrybeError
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage


def test_local_roundtrip_and_delete(tmp_path):
    s = LocalStorage(str(tmp_path / "s"))
    s.upload("a/b.json", "hello")
    assert s.exists("a/b.json") and s.download("a/b.json") == b"hello"
    s.delete("a/b.json")
    assert not s.exists("a/b.json")
    s.delete("a/b.json")  # idempotent


@pytest.mark.parametrize("key", ["../x", "a/../../x", "/abs", "a//b", "a b", "a\\b", ""])
def test_local_rejects_bad_keys(tmp_path, key):
    with pytest.raises(ValueError):
        LocalStorage(str(tmp_path)).upload(key, "x")


def test_local_download_missing_is_structured(tmp_path):
    with pytest.raises(ScrybeError) as e:
        LocalStorage(str(tmp_path)).download("nope.txt")
    assert e.value.code == ErrorCode.STORAGE_DOWNLOAD_FAILED


@mock_aws
def test_s3_roundtrip(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "s3_bucket", "scrybe-test")
    client = boto3.client("s3", region_name="us-east-1")
    client.create_bucket(Bucket="scrybe-test")
    s = S3Storage(client)
    s.upload("reports/x.json", "{}")
    assert s.exists("reports/x.json") and s.download("reports/x.json") == b"{}"
    f = tmp_path / "f.bin"
    f.write_bytes(b"abc")
    s.upload_file("videos/x.mp4", str(f))
    out = tmp_path / "o.bin"
    s.download_file("videos/x.mp4", str(out))
    assert out.read_bytes() == b"abc"
    assert "reports/x.json" in s.get_url("reports/x.json")
    s.delete("reports/x.json")
    assert not s.exists("reports/x.json")
