import asyncio
import uuid

import boto3

from app.config import settings


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
    if not url or not settings.R2_PUBLIC_URL or not url.startswith(settings.R2_PUBLIC_URL):
        return
    key = url.replace(f"{settings.R2_PUBLIC_URL}/", "", 1)

    def _delete():
        client = _get_s3_client()
        client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)

    await asyncio.to_thread(_delete)
