import { notFound } from "next/navigation";
import { getEvents, getRun, getSteps } from "@/lib/data";
import { RunView } from "@/components/RunView";
import { Footer, Header } from "@/components/Chrome";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  const [steps, events] = await Promise.all([getSteps(id), getEvents(id)]);
  return (
    <>
      <Header />
      <RunView initial={{ run, steps, events }} />
      <Footer />
    </>
  );
}
