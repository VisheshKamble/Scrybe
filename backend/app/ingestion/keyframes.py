from pathlib import Path

from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector
from scenedetect.scene_manager import save_images

FRAME_DIR = Path("data/keyframes")
FRAME_DIR.mkdir(parents=True, exist_ok=True)


def extract_keyframes(video_path: str, video_id: str, max_frames: int = 24) -> list[dict]:
    """Samples one frame per detected scene change, rather than at fixed
    intervals -- this avoids wasting vision-model calls on near-duplicate
    frames during a static shot.
    """
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=27.0))
    scene_manager.detect_scenes(video)
    scenes = scene_manager.get_scene_list()[:max_frames]

    out_dir = FRAME_DIR / video_id
    out_dir.mkdir(exist_ok=True)
    save_images(scenes, video, num_images=1, output_dir=str(out_dir))

    keyframes = []
    for i, (start, _end) in enumerate(scenes):
        keyframes.append({
            "timestamp_seconds": start.get_seconds(),
            "image_path": str(out_dir / f"Scene-{i + 1:03d}-01.jpg"),
        })
    return keyframes
