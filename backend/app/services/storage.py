import asyncio
import logging
import uuid

import boto3

from app.config import settings

logger = logging.getLogger(__name__)


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


async def upload_file(file_bytes: bytes, content_type: str, folder: str = "uploads") -> str:
    ext = content_type.split("/")[-1] if "/" in content_type else "jpg"
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    def _upload():
        client = _get_s3_client()
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )

    await asyncio.to_thread(_upload)
    return f"{settings.R2_PUBLIC_URL}/{key}"


async def delete_file(url: str) -> None:
    if not url:
        logger.warning("delete_file called with empty url")
        return
    if not settings.R2_PUBLIC_URL:
        logger.warning("delete_file: R2_PUBLIC_URL is not configured, skipping deletion")
        return
    if not url.startswith(settings.R2_PUBLIC_URL):
        logger.warning(f"delete_file: url {url!r} does not start with R2_PUBLIC_URL {settings.R2_PUBLIC_URL!r}")
        return

    key = url.replace(f"{settings.R2_PUBLIC_URL}/", "", 1)
    logger.info(f"delete_file: deleting key={key!r} from bucket={settings.R2_BUCKET_NAME!r}")

    def _delete():
        client = _get_s3_client()
        client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)

    await asyncio.to_thread(_delete)
