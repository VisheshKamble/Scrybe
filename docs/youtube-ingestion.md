# YouTube ingestion

YouTube is the least reliable dependency in Scrybe. Two *different* problems look similar and are handled separately.

## A. Extractor / player challenges (making extraction possible)
- yt-dlp needs a JavaScript runtime (Deno) and the `ejs` remote component to solve player challenges (`--js-runtimes deno --remote-components ejs:github`).
- For clients that require a **PO Token**, the maintained plugin [`bgutil-ytdlp-pot-provider`](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) (pinned in `requirements.txt`) obtains tokens from a provider server. Run the server as a separate container (`docker-compose.yml` has it) and set `BGUTIL_BASE_URL`; Scrybe passes it via `--extractor-args youtubepot-bgutilhttp:base_url=...`. The server version should match the plugin's major version.
- Verified here: the plugin registers with yt-dlp (`yt-dlp -v` lists `bgutil:http-2.0.1`). **Not verified:** token generation against live YouTube (no access from the build sandbox). Check `yt-dlp -v` output in your deployment, and re-check the yt-dlp PO Token docs when upgrading, since this area changes often.

## B. IP-level rate limiting (what PO Tokens do *not* fix)
Datacenter IPs (including Render's) are often throttled or flagged regardless of tokens. Symptoms: `HTTP Error 429`, `Sign in to confirm you're not a bot`. Scrybe cannot remove this; it makes it **visible, bounded and polite**:

| Mechanism | Setting | Behavior |
|---|---|---|
| Cluster-wide concurrency cap | `YOUTUBE_MAX_CONCURRENT_DOWNLOADS` | Redis lease set; crashed workers' leases expire. |
| Request spacing | `YOUTUBE_MIN_REQUEST_DELAY` | Redis `SET NX PX`, shared by all workers. |
| Block cooldown | `YOUTUBE_COOLDOWN_SECONDS` | After a 429/bot-check *every* worker pauses; waiting costs no retry budget. |
| Bounded retries | `YOUTUBE_MAX_RETRIES`, backoff base/cap | Exponential backoff with ±50% jitter. Permanent errors (private, deleted, unavailable, geo, age) never retry. |
| Queue age limit | 4 h in code | A job that can't get capacity eventually fails with a clear error. |
| Bounded yt-dlp internals | `--retries 2 --fragment-retries 2 --extractor-retries 1` | No infinite retries. |

Users see states `retrying` / `rate_limited` with messages like *"YouTube temporarily limited requests from our processing server. Your job will retry automatically."*

## If your IP stays blocked
Options, in order: (1) wait; the cooldown/retry design is built for transient blocks. (2) Run the `youtube_ingestion` worker where you control egress (home server, VPS with a clean IP) pointing at the same Redis and S3 bucket; nothing else changes. (3) Set `YTDLP_PROXY` to *your own* egress. (4) Last resort: `YTDLP_COOKIES_FILE` with a throwaway account's cookies, supplied as a secret file and never committed. Using account cookies can put that account at risk and may violate YouTube's terms; it is intentionally not the default.

Not done, deliberately: disabling TLS verification, spoofing user agents, free proxy lists, committed cookies, unbounded retries.

## Security of the boundary
User input is parsed (host allowlist, no userinfo/ports, 11-char id), then a canonical `https://www.youtube.com/watch?v=<id>` is rebuilt and passed after `--` to yt-dlp. Playlist params and flag-lookalike strings never reach the subprocess.

## Extending
`app/ingestion/youtube.py` is the only YouTube-specific downloader. A new source (uploaded file, podcast) should produce the same artifacts in storage (`videos/<id>.mp4` and optional `.en.srt`) and then dispatch `process_video_task`.
