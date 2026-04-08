import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { WordData } from "@/components/WordCard";
import { POS_COLORS } from "@/lib/pos-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_layout/dictionary/$word")({
	component: WordDetailPage,
	head: ({ params }) => ({
		meta: [{ title: `${params.word} — toki pona dojo` }],
	}),
});

// TODO: Replace this hardcoded map with data from the API when a
// "word → units" endpoint is available (e.g. GET /api/v1/dictionary/words/:word/units).
const WORD_UNITS: Record<string, number[]> = {
	mi: [1],
	sina: [1],
	pona: [1],
	ike: [1],
	toki: [1],
	moku: [1, 3],
	jan: [2],
	tomo: [2],
	telo: [2],
	soweli: [2],
	suno: [2],
	ma: [2],
	nimi: [2],
	lukin: [3, 8],
	lape: [3],
	pali: [3],
	kama: [3],
	jo: [3],
	li: [4],
	e: [4],
	ona: [4],
	ni: [4],
	seme: [4],
	mute: [5],
	lili: [5],
	suli: [5],
	wawa: [5],
	sin: [5],
	ante: [5],
	pi: [6],
	sona: [6],
	kalama: [6, 9],
	ilo: [6],
	nasin: [6],
	la: [7],
	tenpo: [7],
	sike: [7],
	open: [7],
	pini: [7],
	o: [8],
	wile: [8],
	ken: [8],
	olin: [9],
	pilin: [9],
	musi: [9],
	sitelen: [9],
	lon: [10],
	tawa: [10],
	tan: [10],
	kepeken: [10],
};

function WordDetailPage() {
	const { word } = Route.useParams();

	const { data, isLoading, error } = useQuery<WordData>({
		queryKey: ["dictionary", "word", word],
		queryFn: async () => {
			const res = await fetch(
				`/api/v1/dictionary/words/${encodeURIComponent(word)}`,
			);
			if (!res.ok) throw new Error("Word not found");
			return res.json();
		},
	});

	if (isLoading) {
		return (
			<div className="space-y-4 py-6">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="py-12 text-center">
				<p className="font-tp text-2xl text-zen-text3">ala</p>
				<p className="mt-2 text-sm text-zen-text3">word not found</p>
				<Link
					to="/dictionary"
					className="mt-4 inline-flex items-center gap-1 text-sm text-zen-teal hover:underline"
				>
					<ArrowLeft className="size-3" /> back to dictionary
				</Link>
			</div>
		);
	}

	const units = WORD_UNITS[data.word] || [];

	return (
		<div className="flex flex-col gap-6 py-6">
			<Link
				to="/dictionary"
				className="inline-flex items-center gap-1 text-sm text-zen-text3 hover:text-zen-text2 transition-colors"
			>
				<ArrowLeft className="size-3" /> dictionary
			</Link>

			<div className="flex items-start gap-4">
				<div className="flex-1">
					<h1 className="font-tp text-4xl">{data.word}</h1>
					<div className="mt-2 flex flex-wrap gap-2">
						{data.pos.map((p) => (
							<Badge
								key={p}
								variant="outline"
								className={cn(
									"border-0 font-label",
									POS_COLORS[p] || "bg-zen-bg3 text-zen-text2",
								)}
							>
								{p}
							</Badge>
						))}
						{data.ku && (
							<Badge
								variant="outline"
								className="border-zen-border text-zen-text3 font-label"
							>
								ku suli
							</Badge>
						)}
						{data.book && data.book !== "pu" && !data.ku && (
							<Badge
								variant="outline"
								className="border-zen-border text-zen-text3 font-label"
							>
								{data.book}
							</Badge>
						)}
						{data.usage_category && data.usage_category !== "core" && (
							<Badge
								variant="outline"
								className="border-zen-border/50 text-zen-text3/70 font-label"
							>
								{data.usage_category}
							</Badge>
						)}
					</div>
				</div>
				{data.sitelen_emosi && (
					<span
						className="text-5xl"
						aria-label={`sitelen emosi for ${data.word}`}
					>
						{data.sitelen_emosi}
					</span>
				)}
			</div>

			<div className="space-y-4">
				{data.pos.map((pos) => {
					const defs = data.definitions.filter((d) => d.pos === pos);
					if (defs.length === 0) return null;
					return (
						<div key={pos}>
							<h2 className="font-label text-zen-text3 mb-1">{pos}</h2>
							{defs.map((def, i) => (
								<p key={i} className="text-zen-text2">
									{def.definition}
								</p>
							))}
						</div>
					);
				})}
			</div>

			{data.note && (
				<div className="rounded-lg border border-zen-border bg-zen-bg2 p-4">
					<p className="font-label text-zen-text3 mb-1">etymology</p>
					<p className="text-sm text-zen-text2 italic">{data.note}</p>
				</div>
			)}

			{data.see_also && (
				<div>
					<p className="font-label text-zen-text3 mb-1">see also</p>
					<div className="flex flex-wrap gap-2">
						{data.see_also
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean)
							.map((related) => (
								<Link
									key={related}
									to="/dictionary/$word"
									params={{ word: related }}
									className="font-tp text-zen-teal hover:underline"
								>
									{related}
								</Link>
							))}
					</div>
				</div>
			)}

			{units.length > 0 && (
				<div>
					<p className="font-label text-zen-text3 mb-1">used in units</p>
					<div className="flex gap-2">
						{units.map((u) => (
							<span
								key={u}
								className="flex size-8 items-center justify-center rounded-full bg-zen-teal-bg text-sm font-tp text-zen-teal-dark"
							>
								{u}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
