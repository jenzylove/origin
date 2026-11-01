import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  boxToPercent, gradeCommand, isGatedStep, parseSamOutput, parseSparkSteps, parseTimestamp, youtubeId,
} from "../src/index.js";

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

describe("parseTimestamp", () => {
  it("parses mm:ss, m:ss, hh:mm:ss", () => {
    expect(parseTimestamp("02:40")).toBe(160);
    expect(parseTimestamp("2:40")).toBe(160);
    expect(parseTimestamp("1:02:03")).toBe(3723);
  });
  it("throws on bad input", () => {
    for (const bad of ["", "abc", "12", "1:75", "1:2:3:4", "-1:00"]) expect(() => parseTimestamp(bad)).toThrow();
  });
});

describe("parseSparkSteps", () => {
  it("parses the real fixture", () => {
    const steps = parseSparkSteps(fx("spark_cra_steps.txt"));
    expect(steps).toHaveLength(7);
    expect(steps[4]!.detail).toBe("npx create-react-app my-first-react-app --use-npm");
    expect(steps[4]!.t).toBe(160);
    expect(steps[4]!.tLabel).toBe("02:40");
    expect(steps.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("handles fences and prose, maps aliases, drops empties, sorts", () => {
    const text =
      'Here you go:\n```json\n[{"t":"01:00","action":"Run","detail":"ls [a]"},{"t":"00:10","action":"visit","detail":"https://x.dev","target":"url bar"},{"t":"00:20","action":"press","detail":""},{"t":"00:30","action":"enter","detail":"hi"}]\n```\nHope that helps [1].';
    const s = parseSparkSteps(text);
    expect(s.map((x) => x.action)).toEqual(["navigate", "type", "command"]);
    expect(s[0]!.target).toBe("url bar");
    expect(s[2]!.detail).toBe("ls [a]");
    expect(s[0]!.index).toBe(0);
  });
  it("returns [] when there is no array", () => {
    expect(parseSparkSteps("sorry, no steps")).toEqual([]);
  });
});

const CRA = [
  "npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory.",
  "npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported",
  "npm warn deprecated tar@2.2.2: This version of tar is no longer supported, and will not receive security updates.",
  "create-react-app is deprecated.",
  "This error message will only be shown once per install.",
  "Success! Created demo at /demo",
];
const run = (lines: string[], exitCode = 0, command = "npx create-react-app demo") =>
  gradeCommand({ command, exitCode, stdout: "", stderr: lines.join("\n") });

describe("gradeCommand", () => {
  it("marks CRA changed, ignoring transitive deprecations", () => {
    const g = run(CRA);
    expect(g.verdict).toBe("changed");
    expect(g.reasons).toContain("create-react-app is deprecated");
    expect(g.reasons).toContain("3 transitive deprecation warnings (ignored)");
  });
  it("works without the CRA deprecation line", () => {
    const g = run(CRA.filter((l) => !l.startsWith("create-react-app")));
    expect(g.verdict).toBe("works");
    expect(g.reasons).toEqual(["3 transitive deprecation warnings (ignored)"]);
  });
  it("broken on non-zero exit with last error line", () => {
    const g = run(["npm error code E404", "npm error 404 Not Found - GET https://registry.npmjs.org/nope", "npm notice log"], 1);
    expect(g.verdict).toBe("broken");
    expect(g.reasons.join(" ")).toContain("404 Not Found");
  });
  it("direct npm deprecation of a package in the command is changed", () => {
    expect(run(["npm warn deprecated request@2.88.2: request has been deprecated"], 0, "npm i request").verdict).toBe("changed");
  });
  it("EBADENGINE and DeprecationWarning mark changed", () => {
    expect(run(["npm warn EBADENGINE Unsupported engine"], 0, "npm i foo").verdict).toBe("changed");
    expect(run(["(node:123) [DEP0040] DeprecationWarning: The punycode module is deprecated."], 0, "node app.js").verdict).toBe("changed");
  });
  it("end-of-life mentioning the command name is changed", () => {
    expect(run(["Python 2 is end-of-life; python is no longer supported"], 0, "python app.py").verdict).toBe("changed");
    expect(run(["Something unrelated is end-of-life"], 0, "ls").verdict).toBe("works");
  });
  it("plain success works", () => {
    expect(run(["added 1 package"], 0, "npm i left-pad").verdict).toBe("works");
  });
});

describe("parseSamOutput", () => {
  it("parses the real fixture", () => {
    const frames = parseSamOutput(fx("sam_green_download_button.txt"));
    expect(frames).toHaveLength(1);
    expect(frames[0]!.frame).toBe(0);
    const [a, b] = frames[0]!.objects;
    expect(frames[0]!.objects).toHaveLength(2);
    expect(a!.box).toEqual({ x1: 234, y1: 163, x2: 314, y2: 189 });
    expect(b!.box).toEqual({ x1: 325, y1: 163, x2: 405, y2: 189 });
    expect(a!.width).toBe(640);
    expect(a!.height).toBe(360);
    expect(a!.mask).toMatch(/^x=0;y=0;data=27,81,/);
    expect(a!.mask!.endsWith(",1")).toBe(false);
  });
  it("empty -> []", () => {
    expect(parseSamOutput("")).toEqual([]);
    expect(parseSamOutput("  \n ")).toEqual([]);
  });
  it("handles multiple lines and tricky mask characters", () => {
    const l0 =
      "<0f>0<|box;x1=1;y1=2;x2=3;y2=4;w=10;h=10|><|mask;data=a|>b,1<|c|>,1<|box;x1=5;y1=6;x2=7;y2=8;w=10;h=10|><|mask;data=z|>";
    const l1 = "<1f>0<|box;x1=1;y1=2;x2=3;y2=4;w=10;h=10|>";
    const f = parseSamOutput(`${l0}\n${l1}\n`);
    expect(f.map((x) => x.frame)).toEqual([0, 1]);
    expect(f[0]!.objects).toHaveLength(2);
    expect(f[0]!.objects[0]!.mask).toBe("data=a|>b,1<|c");
    expect(f[0]!.objects[1]!.mask).toBe("data=z");
    expect(f[1]!.objects[0]!.mask).toBeUndefined();
  });
  it("boxToPercent", () => {
    expect(boxToPercent({ x1: 320, y1: 90, x2: 640, y2: 180 }, 640, 360)).toEqual({ left: 50, top: 25, width: 50, height: 25 });
  });
});

describe("isGatedStep", () => {
  const gated = [
    "Click Send to see preview",
    "Post the update to your timeline",
    "Tweet the link",
    "Share it publicly",
    "Enter your card and pay $9",
    "Click Buy now",
    "Proceed to checkout",
    "Place your order",
    "npm publish",
    "Delete your account in Settings",
    "gh repo delete my-repo --yes",
    "Remove the repository permanently",
    "Submit the form to the vendor",
    "Subscribe to the Pro plan",
  ];
  const notGated = [
    "npm publish --dry-run",
    "git push to your fork",
    "delete the default text in App.js",
    "npm run start",
    "npx create-react-app demo --use-npm",
    "cd my-first-react-app",
    "Click the green Download button",
    "Remove the unused import from index.js",
    "Open localhost:3000",
    "Add a post-install script",
    "Subscribe to the RSS feed in your reader",
    "Check the payload in the console",
  ];
  it.each(gated)("gates: %s", (detail) => expect(isGatedStep({ detail })).toBe(true));
  it.each(notGated)("allows: %s", (detail) => expect(isGatedStep({ detail })).toBe(false));
  it("checks target too", () => {
    expect(isGatedStep({ detail: "Click the button", target: "red Delete account button" })).toBe(true);
  });
});

describe("youtubeId", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?feature=share&v=${id}&t=42s`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}?feature=share`,
    `https://www.youtube.com/embed/${id}?start=3`,
    `https://m.youtube.com/watch?v=${id}`,
    `youtube.com/watch?v=${id}`,
  ])("extracts from %s", (u) => expect(youtubeId(u)).toBe(id));
  it.each(["https://vimeo.com/12345678901", "https://example.com/watch?v=dQw4w9WgXcQ", "not a url", "https://www.youtube.com/watch?v=short", ""])(
    "null for %s",
    (u) => expect(youtubeId(u)).toBeNull(),
  );
});
