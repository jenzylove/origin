import { join } from "node:path";
import type { Sandbox, ExecResult } from "./sandbox.js";

const SCENE = "/work/scene.blend";

// Opens the saved scene (or a fresh default one), runs the step's code, saves the scene.
const open = `import bpy, os
if os.path.exists("${SCENE}"):
    bpy.ops.wm.open_mainfile(filepath="${SCENE}")
`;
const prelude = (code: string) => `${open}${code}
bpy.ops.wm.save_as_mainfile(filepath="${SCENE}")
print("ORIGIN_SAVED")
`;

// Frame every mesh with a fresh camera and light, so the render shows the whole model
// whatever camera the tutorial left behind. The tutorial's own scene is not changed on disk.
const RENDER = `import bpy, mathutils
s = bpy.context.scene
meshes = [o for o in s.objects if o.type == "MESH" and o.visible_get()]
if meshes:
    pts = [o.matrix_world @ mathutils.Vector(c) for o in meshes for c in o.bound_box]
    lo = mathutils.Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = mathutils.Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center, size = (lo + hi) / 2, max((hi - lo).length, 0.1)
    cam = bpy.data.objects.new("OriginCam", bpy.data.cameras.new("OriginCam"))
    s.collection.objects.link(cam)
    cam.location = center + mathutils.Vector((1.0, -1.3, 0.8)).normalized() * size * 1.6
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50
    s.camera = cam
    sun = bpy.data.objects.new("OriginSun", bpy.data.lights.new("OriginSun", "SUN"))
    sun.data.energy = 3.0
    sun.rotation_euler = (0.8, 0.2, 0.6)
    s.collection.objects.link(sun)
    if s.world is None:
        s.world = bpy.data.worlds.new("OriginWorld")
    s.world.color = (0.18, 0.18, 0.2)
s.render.engine = "CYCLES"
s.cycles.device = "CPU"
s.cycles.samples = 24
s.cycles.use_denoising = False
s.render.resolution_x, s.render.resolution_y, s.render.resolution_percentage = 960, 540, 100
s.render.filepath = "/work/render.png"
if s.camera is None:
    print("ORIGIN_NO_CAMERA")
else:
    bpy.ops.render.render(write_still=True)
    print("ORIGIN_RENDERED")
`;

/** Headless Blender inside the sandbox: every step edits one saved scene by script. */
export class Blender {
  private ready = false;
  private n = 0;
  constructor(private sb: Sandbox, private work: string) {}

  private async ensure(): Promise<void> {
    if (this.ready) return;
    // Today's Blender: the newest official release, not the distro's older package.
    const install = String.raw`
if [ ! -x /usr/local/bin/blender-today ]; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq xz-utils libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libxkbcommon0 libsm6 libice6 >/dev/null
  D=$(curl -s https://download.blender.org/release/ | grep -oE 'Blender[0-9]+\.[0-9]+/' | sort -V | uniq | tail -1)
  F=$(curl -s https://download.blender.org/release/$D | grep -oE 'blender-[0-9.]+-linux-x64\.tar\.xz' | sort -V | uniq | tail -1)
  curl -sL "https://download.blender.org/release/$D$F" | tar -xJ -C /opt
  ln -sf "/opt/$(basename "$F" .tar.xz)/blender" /usr/local/bin/blender-today
fi
blender-today --version | head -1`;
    const r = await this.sb.exec(install, { timeoutMs: 600_000 });
    if (r.exitCode !== 0) throw new Error(`Blender install failed: ${r.stderr.slice(-300)}`);
    this.ready = true;
  }

  private async script(name: string, body: string): Promise<ExecResult> {
    await this.ensure();
    const b64 = Buffer.from(body).toString("base64");
    return this.sb.exec(`echo ${b64} | base64 -d > /work/${name}.py && blender-today -b --factory-startup --python /work/${name}.py 2>&1 | grep -vE "^(Blender quit|Read prefs|Fra:)" | tail -40`, { timeoutMs: 300_000 });
  }

  async python(code: string): Promise<ExecResult> {
    return this.script("step", prelude(code));
  }

  async version(): Promise<string> {
    await this.ensure();
    return (await this.sb.exec("blender-today --version | head -1")).stdout.trim();
  }

  /** Render the current scene; returns the image on this machine, or why it could not. */
  async render(): Promise<{ path: string | null; note: string }> {
    // Read only: the framing camera and light are never saved into the tutorial's scene.
    const r = await this.script("render", `${open}${RENDER}`);
    if (r.stdout.includes("ORIGIN_NO_CAMERA")) return { path: null, note: "The scene has no camera, so nothing was rendered." };
    if (!r.stdout.includes("ORIGIN_RENDERED")) return { path: null, note: `Render failed: ${r.stdout.slice(-400)}` };
    const host = join(this.work, `render_${++this.n}.png`);
    await this.sb.copyOut("/work/render.png", host);
    return { path: host, note: "Rendered the current scene (Cycles, CPU, 24 samples)." };
  }
}
