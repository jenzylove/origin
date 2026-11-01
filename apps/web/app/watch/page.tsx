import { redirect } from "next/navigation";

export default async function Watch({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  redirect(v ? `/v/${encodeURIComponent(v)}` : "/");
}
