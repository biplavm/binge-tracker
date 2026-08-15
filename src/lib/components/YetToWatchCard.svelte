<script lang="ts">
	import type { TVMazeShow } from '$lib/services/tvmaze';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { Play, Clock, Star, Film, Trash2, CheckCircle2 } from '@lucide/svelte';

	let { show }: { show: TVMazeShow } = $props();

	const episodes = $derived(show._embedded?.episodes ?? []);
	const totalRuntimeMinutes = $derived(
		episodes.reduce((acc, ep) => acc + (ep.runtime || show.averageRuntime || 45), 0)
	);

	const runtimeHours = $derived(Math.floor(totalRuntimeMinutes / 60));
	const runtimeMins = $derived(totalRuntimeMinutes % 60);

	const formattedRuntime = $derived(
		runtimeHours > 0 ? `${runtimeHours}h ${runtimeMins}m` : `${runtimeMins}m`
	);

	async function startWatching() {
		await tracker.updateShowStatus({
			tvmazeId: show.id,
			name: show.name,
			poster: show.image?.medium,
			status: 'watching',
			rating: show.rating?.average ?? undefined,
			runtime: show.runtime,
			averageRuntime: show.averageRuntime,
			addedAt: new Date(),
			genres: show.genres || [],
			network: show.network?.name || show.webChannel?.name,
			summary: show.summary
		});
		tracker.activeTab = 'watching';
	}
</script>

<div class="glass-card group relative overflow-hidden rounded-2xl flex flex-col bg-white border border-stone-200 shadow-sm p-4 sm:p-5 gap-3 sm:gap-4">
	<!-- Mobile Header: Show name + year + genre above poster & info -->
	<div class="flex sm:hidden items-start justify-between gap-2 border-b border-stone-100 pb-2">
		<div class="min-w-0 flex-1">
			<h3 class="text-base font-extrabold text-stone-900 font-heading leading-snug">
				{show.name}
			</h3>
			<p class="text-xs text-stone-500 font-medium mt-0.5">
				{show.premiered?.slice(0, 4) || 'TBA'}{#if show.genres && show.genres.length > 0} • {show.genres.slice(0, 3).join(', ')}{/if}
			</p>
		</div>
		{#if show.rating?.average}
			<div class="flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-200 shadow-sm">
				<Star class="h-3 w-3 fill-amber-500 text-amber-500" />
				<span>{show.rating.average}</span>
			</div>
		{/if}
	</div>

	<div class="flex flex-row gap-3 sm:gap-5 items-stretch">
		<!-- Left: Portrait Poster -->
		<div class="relative w-24 sm:w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm self-start">
			<img
				src={show.image?.medium || show.image?.original || '/placeholder.png'}
				alt={show.name}
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/10 to-transparent"></div>

			<!-- Status Badge -->
			<div class="absolute top-1 left-1 flex items-center gap-1 rounded-md bg-stone-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md shadow-sm border border-stone-700/50">
				<span class={`h-1.5 w-1.5 rounded-full ${show.status === 'Ended' ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
				<span>{show.status || 'Running'}</span>
			</div>
		</div>

		<!-- Right: Details & Actions -->
		<div class="flex-1 flex flex-col justify-between min-w-0 py-1">
			<div>
				<!-- Desktop Header (hidden sm:flex) -->
				<div class="hidden sm:flex items-start justify-between gap-1.5">
					<h3 class="text-sm sm:text-base font-extrabold text-stone-900 font-heading leading-tight line-clamp-2">
						{show.name}
					</h3>
					{#if show.rating?.average}
						<div class="flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-200 shadow-sm">
							<Star class="h-3 w-3 fill-amber-500 text-amber-500" />
							<span>{show.rating.average}</span>
						</div>
					{/if}
				</div>

				<div class="mt-1 flex flex-wrap items-center gap-1.5">
					<div class="flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
						<Film class="h-3 w-3 text-stone-400" />
						<span>{episodes.length} Eps</span>
					</div>
					<div class="flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
						<Clock class="h-3 w-3 text-stone-400" />
						<span>{formattedRuntime}</span>
					</div>
				</div>
				
				<p class="hidden sm:block mt-1.5 text-[10px] sm:text-xs text-stone-500 font-medium line-clamp-1">
					{(show.genres || []).slice(0, 3).join(' • ')}
				</p>
			</div>

			<!-- Action Buttons -->
			<div class="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
				<div class="flex items-center gap-1 sm:gap-2">
					<button
						onclick={() => tracker.openShowModal(show.id)}
						class="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-stone-50 px-3 sm:px-4 text-[10px] sm:text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200 transition-colors shadow-sm"
					>
						Preview
					</button>
					<button
						onclick={() => {
							if (confirm(`Remove "${show.name}" from your queue?`)) {
								tracker.removeShow(show.id);
							}
						}}
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 text-stone-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-stone-200 transition-colors shadow-sm"
						title="Remove"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</div>

				<button
					onclick={startWatching}
					class="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 sm:px-5 text-[10px] sm:text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition-all"
				>
					<Play class="h-4 w-4 fill-stone-950 text-stone-950" />
					<span>Start</span>
				</button>
			</div>
		</div>
	</div>
</div>
