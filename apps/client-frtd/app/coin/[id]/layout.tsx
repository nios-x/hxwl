import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${decodeURIComponent(id).toUpperCase()} · hxwl` };
}

export default function CoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
