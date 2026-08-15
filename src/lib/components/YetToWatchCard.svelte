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

<div class="glass-card group relative overflow-hidden rounded-2xl flex flex-col bg-white border border-stone-200 shadow-sm">
	<div class="relative w-full aspect-[16/9] bg-stone-100 overflow-hidden">
		<img
			src={show.image?.original || show.image?.medium || '/placeholder.png'}
			alt={show.name}
			loading="lazy"
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent"></div>

		<!-- Status Badge -->
		<div class="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-stone-800 backdrop-blur-md border border-stone-200 shadow-sm">
			<span class={`h-2 w-2 rounded-full ${show.status === 'Ended' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
			<span>{show.status || 'Running'}</span>
		</div>

		<!-- Runtime Badge -->
		<div class="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-black text-stone-950 backdrop-blur-md shadow-sm">
			<Clock class="h-3 w-3 text-stone-950" />
			<span>{formattedRuntime}</span>
		</div>

		<!-- Bottom Overlay Details -->
		<div class="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
			<div>
				<h3 class="text-base font-extrabold text-white font-heading group-hover:text-amber-300 transition-colors drop-shadow-sm">
					{show.name}
				</h3>
				<p class="text-xs text-stone-200 font-medium drop-shadow-sm">
					{episodes.length} Episodes • {(show.genres || []).slice(0, 2).join(', ')}
				</p>
			</div>

			{#if show.rating?.average}
				<div class="flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-xs font-black text-stone-950 shadow-sm">
					<Star class="h-3 w-3 fill-stone-950 text-stone-950" />
					<span>{show.rating.average}</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="p-4 flex items-center justify-between gap-2 border-t border-stone-200 bg-stone-50/50">
		<button
			onclick={() => tracker.openShowModal(show.id)}
			class="text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
		>
			Preview Episodes
		</button>

		<div class="flex items-center gap-2">
			<button
				onclick={() => {
					if (confirm(`Are you sure you want to remove "${show.name}" from your queue?`)) {
						tracker.removeShow(show.id);
					}
				}}
				class="rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
				title="Remove"
			>
				<Trash2 class="h-4 w-4" />
			</button>

			<button
				onclick={startWatching}
				class="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 py-1.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-98 transition-all"
			>
				<Play class="h-3.5 w-3.5 fill-stone-950 text-stone-950" />
				<span>Start Watching</span>
			</button>
		</div>
	</div>
</div>
