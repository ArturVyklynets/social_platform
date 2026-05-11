import os
import re
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)


def upload_image(contents: bytes, folder: str) -> str:
    result = cloudinary.uploader.upload(contents, folder=folder, resource_type="image")
    return result["secure_url"]


def delete_image(url: str) -> None:
    if not url or "res.cloudinary.com" not in url:
        return
    match = re.search(r"/upload/(?:v\d+/)?(.+?)(?:\.[^.]+)?$", url)
    if match:
        cloudinary.uploader.destroy(match.group(1))
