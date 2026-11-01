# Origin benchmark candidates

`candidates.json` lists 60 YouTube tutorials that Origin could re-run on today's software and mark each step works, changed or broken.

## How the list was built

Everything came from yt-dlp metadata only (id, duration, upload date, license, channel, title). No video was downloaded.

1. For each of 46 topic queries (for example "create-react-app tutorial", "webpack 4 setup tutorial", "how to create a github repository", "blender 2.8 low poly tutorial", "publish npm package tutorial") two searches ran:
   - a Creative Commons search: YouTube's own CC license filter on the results page (`sp=EgIwAQ%253D%253D`), first 20 results;
   - a normal search: `ytsearch15:<query>`, first 15 results.
2. Results were pooled and kept only if the video is 2 to 15 minutes long and uploaded 2018 to 2023. That left 523 unique videos.
3. I picked 15 per kind by hand from the pool, favouring single focused tutorials and Creative Commons ones, and dropping courses, lesson series parts, compilations and off topic hits.
4. `kind`, `why_interesting` and `needs_account` are my own labels. All other fields are copied from yt-dlp. The `license` value "NA" means yt-dlp reported the standard YouTube license.

## Counts

| kind | count | Creative Commons |
|---|---|---|
| code | 15 | 6 |
| web | 15 | 12 |
| blender | 15 | 11 |
| account | 15 | 9 |
| total | 60 | 38 |

30 of the 60 need an account (all 15 web and all 15 account entries; code and blender need none). In code, 5 entries are controls expected to still work. A few blender entries are also near current versions and act as controls.

## Notes

- `why_interesting` is a guess from the title and date, not a verified result. Origin's run is what decides works, changed or broken.
- Web and account entries need a free or real account on the target service. Account entries end in a publish, post or payment step, so use a throwaway account.
- Sorted by kind, then upload date.
