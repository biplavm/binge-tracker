<script lang="ts">
	import type { TVMazeShow } from '$lib/services/tvmaze';
	import { calculateSimilarity } from '$lib/services/tvmaze';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { Sparkles, Plus, Star, Check } from '@lucide/svelte';

	let {
		sourceShow,
		candidates = [],
		onAddShow
	}: {
		sourceShow: { genres: string[]; network?: string };
		candidates: TVMazeShow[];
		onAddShow: (show: TVMazeShow, status: 'watching' | 'yet_to_watch') => void;
	} = $props();

	const rankedCandidates = $derived(
		candidates
			.map((c) => ({
				show: c,
				score: calculateSimilarity(sourceShow, c)
			}))
			.filter((item) => item.score > 15)
			.sort((a, b) => b.score - a.score)
			.slice(0, 6)
	);
</script>

{#if rankedCandidates.length > 0}
	<div class="space-y-4">
		<div class="flex items-center gap-2">
			<Sparkles class="h-5 w-5 text-amber-600" />
			<h3 class="text-lg font-extrabold text-stone-900 font-heading">Recommended Shows You May Like</h3>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each rankedCandidates as { show, score }}
				<div class="glass-card rounded-2xl overflow-hidden bg-white border border-stone-200 flex gap-3 p-3 shadow-sm">
					<img
						src={show.image?.medium || '/placeholder.png'}
						alt={show.name}
						class="h-24 w-16 rounded-xl object-cover shrink-0 border border-stone-200"
					/>
					<div class="flex-1 flex flex-col justify-between">
						<div>
							<div class="flex items-center justify-between gap-1">
								<h4 class="text-sm font-bold text-stone-900 line-clamp-1">{show.name}</h4>
								<span class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
									{score}% match
								</span>
							</div>
							<p class="text-xs text-stone-500 mt-0.5 font-medium">
								{(show.genres || []).slice(0, 2).join(', ')}
							</p>
						</div>

						<div class="flex items-center gap-1.5 mt-2">
							<button
								onclick={() => onAddShow(show, 'watching')}
								class="flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-stone-950 hover:bg-amber-400 shadow-sm transition-colors"
							>
								<Plus class="h-3 w-3 stroke-[3]" /> Watching
							</button>
							<button
								onclick={() => onAddShow(show, 'yet_to_watch')}
								class="flex items-center gap-1 rounded-xl bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200 transition-colors"
							>
								<Plus class="h-3 w-3" /> Queue
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
