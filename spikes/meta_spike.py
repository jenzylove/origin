"""Live spike: Spark watches a tutorial clip and lists steps; SAM finds UI targets in a frame."""
import base64, json, os, sys, urllib.request

env = dict(l.strip().split("=", 1) for l in open(".env") if "=" in l)
BASE, KEY = env["META_API_BASE"], env["META_API_KEY"]

def post(path, body):
    req = urllib.request.Request(BASE + path, json.dumps(body).encode(),
        {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        return {"http_error": e.code, "body": e.read().decode()[:1000]}

def data_url(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()

def spark_steps(video):
    return post("/responses", {"model": "muse-spark-1.3", "input": [{"type": "message", "role": "user", "content": [
        {"type": "input_text", "text": "This is a software tutorial. List every step the viewer must perform, in order, as JSON: "
            "[{\"t\": \"mm:ss\", \"action\": \"command|click|type|setting\", \"detail\": \"exact command or UI target\"}]. Only JSON."},
        {"type": "input_video", "video_url": data_url(video, "video/mp4")}]}]})

def sam_find(image, phrase):
    return post("/responses", {"model": "sam-3.1", "input": [{"type": "message", "role": "user", "content": [
        {"type": "input_text", "text": phrase},
        {"type": "input_image", "image_url": data_url(image, "image/jpeg")}]}]})

if __name__ == "__main__":
    mode, path = sys.argv[1], sys.argv[2]
    out = spark_steps(path) if mode == "spark" else sam_find(path, sys.argv[3])
    print(json.dumps(out, indent=1)[:6000])
