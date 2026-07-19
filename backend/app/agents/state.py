from typing import List, Optional, TypedDict


class VideoState(TypedDict, total=False):
    video_id: str
    video_path: str
    audio_path: str
    caption_path: Optional[str]
    keyframes: List[dict]              # [{timestamp_seconds, image_path}]
    transcript: str
    transcript_segments: List[dict]    # [{start, end, text}]
    visual_descriptions: List[dict]    # [{timestamp_seconds, description}]
    chapters: List[dict]
    claims: List[dict]
    summary: str
    errors: List[str]
