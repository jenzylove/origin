# Misses and fixes

Every wrong verdict found while checking runs by hand, what caused it, and the fix. Past runs are never edited; they stay as recorded.

| Run | Step | Origin said | Truth | Cause | Fix |
|---|---|---|---|---|---|
| Angular CLI (CiLUkfH608Y) | `code .` | broken | Not checkable: opens VS Code on the viewer's machine | The sandbox has no editor, and "command not found" was read as broken | Editor and desktop app steps are graded skipped (commit 8ef0c7e) |
| Gatsby blog (RKjqWIB8htQ) | `code .` | broken | Same as above | Same | Same |
| Webpack 4 zero config (_HubKvRRXaU) | `webpack` | changed | Works: the reason itself says it rebuilt successfully | Verdict not tied to the reason | Prompt now requires the reason to justify the verdict |
| React app (HWpjpq2ux04), run 0bac1a33 | `cd my-first-react-app` | broken | Works | A rule check overrode Spark with an earlier failed attempt | Rule check can only add deprecations (commit 13fc9b0) |
| React app (HWpjpq2ux04), run 8e33cc1d | step 5 THEN outline | boxed "16.7.0 Current" | Should box "14.17.5 LTS" | SAM found two green buttons, the first was taken | Muse Spark Open picks among SAM matches |
| Tailwind (8voQWXHHxLA) | `npm run watch` | could not finish | Should be checked in the background | Watch commands never exit | Long running commands are forced into the background |
| Low poly barrel (Ce3X9HQRdw0), run e1503dd8 | final result | not compared | | Last frame was an outro | Spark names the frame where the result is shown |
