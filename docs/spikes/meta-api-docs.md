# Spike: what the Meta Model API docs settle (Nov 1 2026)

Key works: `GET /v1/models` lists muse-spark-1.3, muse-spark-1.2, sam-3.1, muse-voice-transcribe-1.0, muse-image-1.0, muse-wonder-1.0. Generation calls return `billing_not_configured` until the card check passes.

**Muse Spark 1.3 takes video** (docs: /docs/video-understanding)
- Responses API (`POST /v1/responses`): `input_video` with `video_url` (public URL or base64 data URL) or `file_id` from `POST /v1/files` (purpose `user_data`). Chat Completions: `video_url` content part.
- MP4 only. Reads embedded audio too, but "audio understanding in Muse Spark 1.3 is currently not fully supported", so Voice Transcribe has a real job.
- Not documented: max duration, size, fps. Needs a live test.

**SAM 3.1 takes images and video** (docs: /docs/sam/overview)
- `POST /v1/responses`, model `sam-3.1`, one short noun phrase + `input_image` or `input_video`; stream recommended for video.
- Returns a box and mask per object per frame, with stable object identity across frames. Masks decode with `@meta-sam/parser`.
- Not documented: whether UI elements ("button", "menu") segment on screen recordings. Needs a live test.
