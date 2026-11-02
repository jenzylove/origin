import { redirect } from "next/navigation";
import { latestRunForVideo } from "@/lib/data";
import { StartBox } from "@/components/StartBox";
import { Footer, Header } from "@/components/Chrome";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const run = await latestRunForVideo(videoId).catch(() => null);
  if (run) redirect(`/run/${run.id}`);
  return (
    <>
      <Header />
      <main className="wrap results-page">
        <p className="label">Not checked yet</p>
        <h1 className="run-title"><span className="tone">Nobody has run</span> this tutorial.</h1>
        <p className="body-lg results-lede">Paste it and Origin will run every step on today&apos;s software.</p>
        <StartBox initial={`https://www.youtube.com/watch?v=${videoId}`} />
      </main>
      <Footer />
    </>
  );
}
