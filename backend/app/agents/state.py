from typing import Optional, TypedDict


class VideoState(TypedDict, total=False):
    video_id: str
    video_path: str
    audio_path: str
    caption_path: Optional[str]
    keyframes: list[dict]  # [{timestamp_seconds, image_path}]
    transcript: str
    transcript_segments: list[dict]  # [{start, end, text}]
    visual_descriptions: list[dict]  # [{timestamp_seconds, description}]
    chapters: list[dict]
    claims: list[dict]
    summary: str
    errors: list[str]
