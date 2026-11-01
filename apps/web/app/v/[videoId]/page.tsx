import { redirect } from "next/navigation";
import { latestRunForVideo } from "@/lib/data";
import { StartBox } from "@/components/StartBox";
import { Header } from "@/components/Chrome";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const run = await latestRunForVideo(videoId).catch(() => null);
  if (run) redirect(`/run/${run.id}`);
  return (
    <>
      <Header />
      <main className="wrap section">
        <p className="eyebrow">Video {videoId}</p>
        <h1 className="display">Not <em>checked</em> yet.</h1>
        <p className="lede">Nobody has run this tutorial. Paste it and Origin will.</p>
        <StartBox initial={`https://www.youtube.com/watch?v=${videoId}`} />
      </main>
    </>
  );
}
