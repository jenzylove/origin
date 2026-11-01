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

## Live results (Nov 1 2026, billing active)

**Spark 1.3 watches a real tutorial: PASS.** Input: "How to Create and Run a React App" (YouTube HWpjpq2ux04, Oct 2021, 4:29, 480p MP4, 5.5 MB sent as a base64 data URL to `/v1/responses`). 31 seconds, 73,108 input tokens (about 16K tokens per video minute, so a 30 minute tutorial is about 490K, inside the 1M context). Output, unedited:

```
00:49 command node -v
01:00 command npm -v
01:35 click   nodejs.org - Download and install 14.17.5 LTS
02:18 command cd react
02:40 command npx create-react-app my-first-react-app --use-npm
03:32 command cd my-first-react-app
03:52 command npm run start
```

Checked by hand against frames at 01:37 and 02:42: both match. Bonus finding: step 3 teaches Node 14, which is end of life, so this tutorial has two outdated steps (Node 14 and Create React App) that both still "work".

**SAM 3.1 on a UI frame: PASS with a descriptive phrase.** Frame at 01:37 (nodejs.org).
- `button`: zero matches.
- `green download button`: two objects, boxes (234,163)-(314,189) and (325,163)-(405,189) on a 640x360 frame: exactly the "14.17.5 LTS" and "16.7.0 Current" buttons (verified by drawing the boxes).

**Design consequence:** Spark writes a visual description of each click target ("green download button"), and SAM turns it into a pixel box. Bare UI nouns fail; descriptive phrases work. SAM output format: `<|box;x1;y1;x2;y2;w;h|><|mask;...|>` per object, parsed with `@meta-sam/parser`.
