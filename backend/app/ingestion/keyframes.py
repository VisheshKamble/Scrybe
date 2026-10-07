from pathlib import Path

from scenedetect import SceneManager, open_video
from scenedetect.detectors import ContentDetector
from scenedetect.scene_manager import save_images


def extract_keyframes(video_path: str, video_id: str, max_frames: int = 24, out_root: Path | None = None) -> list[dict]:
    """Samples one frame per detected scene change, rather than at fixed
    intervals -- this avoids wasting vision-model calls on near-duplicate
    frames during a static shot.
    """
    video = open_video(video_path)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=27.0))
    scene_manager.detect_scenes(video)
    scenes = scene_manager.get_scene_list()[:max_frames]

    out_dir = (out_root or Path("data/keyframes")) / video_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # save_images()'s *default* image_name_template is
    # "$VIDEO_NAME-Scene-$SCENE_NUMBER-$IMAGE_NUMBER" -- it includes the
    # source video's own filename stem as a prefix, not just
    # "Scene-NNN-01.jpg". Its return value is also keyed by 0-indexed
    # scene position, not the 1-indexed "$SCENE_NUMBER" its own docstring
    # describes. Both of those were previously guessed at (a hardcoded
    # f"Scene-{i+1:03d}-01.jpg", no video-name prefix, keyed by i+1) and
    # the guess was wrong on every count -- every image_path this function
    # returned pointed at a file that was never actually written, which
    # made every keyframe image silently fail to load in the visual agent
    # for every video ever processed. Using the dict this call returns
    # directly, instead of reconstructing a filename by hand, means this
    # can't drift out of sync with the library's own naming again.
    saved_images = save_images(scenes, video, num_images=1, output_dir=str(out_dir))

    keyframes = []
    for i, (start, _end) in enumerate(scenes):
        paths = saved_images.get(i)
        if not paths:
            continue
        # save_images() returns filenames relative to output_dir, not full
        # paths -- confirmed by testing against a real video, not assumed.
        keyframes.append(
            {
                "timestamp_seconds": start.get_seconds(),
                "image_path": str(out_dir / paths[0]),
            }
        )
    return keyframes
