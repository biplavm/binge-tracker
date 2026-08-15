<script lang="ts">
	import type { TVMazeShow, TVMazeEpisode } from '$lib/services/tvmaze';
	import { formatLongDate } from '$lib/services/tvmaze';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { X, Check, Eye, EyeOff, Calendar, CheckCheck } from '@lucide/svelte';

	let {
		show,
		watchedIds = [],
		onClose
	}: {
		show: TVMazeShow;
		watchedIds: number[];
		onClose: () => void;
	} = $props();

	const episodes = $derived(show._embedded?.episodes ?? []);

	// Group episodes by season number
	const seasonsMap = $derived(() => {
		const map = new Map<number, TVMazeEpisode[]>();
		episodes.forEach((ep) => {
			if (!map.has(ep.season)) map.set(ep.season, []);
			map.get(ep.season)!.push(ep);
		});
		return map;
	});

	const seasonsList = $derived(Array.from(seasonsMap().keys()).sort((a, b) => a - b));
	let activeSeason = $state<number>(1);

	$effect(() => {
		if (seasonsList.length > 0 && !seasonsList.includes(activeSeason)) {
			activeSeason = seasonsList[0];
		}
	});

	const currentSeasonEpisodes = $derived(seasonsMap().get(activeSeason) || []);

	const seasonWatchedCount = $derived(
		currentSeasonEpisodes.filter((ep) => watchedIds.includes(ep.id)).length
	);

	const isSeasonFullyWatched = $derived(
		currentSeasonEpisodes.length > 0 && seasonWatchedCount === currentSeasonEpisodes.length
	);

	async function toggleSeasonWatched() {
		if (isSeasonFullyWatched) {
			for (const ep of currentSeasonEpisodes) {
				await tracker.unmarkEpisode(show.id, ep.id);
			}
		} else {
			await tracker.markSeasonWatched(show.id, currentSeasonEpisodes);
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
	<div class="glass-panel relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl">
		<!-- Modal Header -->
		<div class="flex items-center justify-between border-b border-stone-200 p-4 sm:p-5 bg-stone-50/80">
			<div class="flex items-center gap-3">
				<img
					src={show.image?.medium || '/placeholder.png'}
					alt={show.name}
					class="h-12 w-12 rounded-xl object-cover border border-stone-300 shadow-sm"
				/>
				<div>
					<h2 class="text-lg font-extrabold text-stone-900 font-heading">{show.name}</h2>
					<p class="text-xs text-stone-500 font-medium">
						{episodes.length} Total Episodes • {seasonsList.length} Seasons
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={() => tracker.toggleSpoilerMode()}
					class={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
						tracker.antiSpoilerMode
							? 'bg-amber-100 text-amber-900 border-amber-300'
							: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
					}`}
				>
					{#if tracker.antiSpoilerMode}
						<EyeOff class="h-4 w-4 text-amber-800" />
						<span class="hidden sm:inline">Spoiler Shield</span>
					{:else}
						<Eye class="h-4 w-4" />
						<span class="hidden sm:inline">Spoilers Visible</span>
					{/if}
				</button>

				<button
					onclick={onClose}
					class="flex h-11 w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-900 transition-colors"
					title="Close Modal"
				>
					<X class="h-5 w-5" />
				</button>
			</div>
		</div>

		<!-- Season Navigation Tabs -->
		<div class="flex items-center justify-between border-b border-stone-200 bg-stone-50/50 px-4 py-2 overflow-x-auto gap-2">
			<div class="flex items-center gap-1.5">
				{#each seasonsList as s}
					{@const eps = seasonsMap().get(s) || []}
					{@const isCompleted = eps.length > 0 && eps.every(ep => watchedIds.includes(ep.id))}
					<button
						onclick={() => (activeSeason = s)}
						class={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all shrink-0 ${
							activeSeason === s
								? 'bg-amber-500 text-stone-950 shadow-sm'
								: 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
						}`}
					>
						<span>Season {s}</span>
						{#if isCompleted}
							<Check class={`h-3.5 w-3.5 stroke-[3] ${activeSeason === s ? 'text-stone-950' : 'text-emerald-600'}`} />
						{/if}
					</button>
				{/each}
			</div>

			<button
				onclick={toggleSeasonWatched}
				class="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-xs sm:text-sm font-extrabold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all shrink-0"
			>
				<CheckCheck class="h-4 w-4 sm:h-5 sm:w-5 text-amber-800" />
				<span>{isSeasonFullyWatched ? 'Unmark Season' : 'Mark Season'}</span>
			</button>
		</div>

		<!-- Episodes Scrollable Container -->
		<div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#fcfbf7]">
			{#each currentSeasonEpisodes as ep}
				{@const isWatched = watchedIds.includes(ep.id)}
				<div
					class={`group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl p-3.5 border transition-all ${
						isWatched
							? 'bg-amber-50/70 border-amber-200/80 text-stone-800'
							: 'bg-white border-stone-200 text-stone-900 hover:border-amber-400/60 shadow-sm'
					}`}
				>
					<div class="flex items-start gap-3 flex-1">
						<button
							onclick={() =>
								isWatched
									? tracker.unmarkEpisode(show.id, ep.id)
									: tracker.markEpisodeWatched(show.id, ep)}
							class={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${
								isWatched
									? 'bg-amber-500 border-amber-500 text-stone-950 font-bold'
									: 'border-stone-300 bg-white text-transparent hover:border-amber-500'
							}`}
						>
							<Check class="h-5 w-5 stroke-[3]" />
						</button>

						<div class="space-y-1">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-xs font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
									E{ep.number}
								</span>
								<h4 class={`text-sm font-bold text-stone-900 ${tracker.antiSpoilerMode && !isWatched ? 'spoiler-blur' : ''}`}>
									{ep.name}
								</h4>
								{#if ep.airdate}
									<span class="text-[11px] text-stone-500 flex items-center gap-1 font-medium">
										<Calendar class="h-3 w-3 text-stone-400" />
										{formatLongDate(ep.airdate)}
									</span>
								{/if}
							</div>

							{#if ep.summary}
								<p class={`text-xs text-stone-600 leading-relaxed ${tracker.antiSpoilerMode && !isWatched ? 'spoiler-blur' : ''}`}>
									{ep.summary.replace(/<[^>]*>?/gm, '')}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
