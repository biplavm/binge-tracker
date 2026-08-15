<script lang="ts">
	import type { TrackedShow, WatchedEpisode } from '$lib/db';
	import { calculateLifetimeStats } from '$lib/services/tvmaze';
	import { BarChart3, Clock, Tv, Film, Award, CheckCircle2, Bookmark } from '@lucide/svelte';

	let {
		trackedShows = [],
		watchedEpisodes = []
	}: {
		trackedShows: TrackedShow[];
		watchedEpisodes: WatchedEpisode[];
	} = $props();

	const stats = $derived(calculateLifetimeStats(trackedShows, watchedEpisodes));
</script>

<div class="space-y-6">
	<!-- Hero Lifetime Watch Time Banner -->
	<div class="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/20 via-yellow-100/60 to-white border border-amber-300 shadow-sm">
		<div class="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl"></div>
		<div class="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl"></div>

		<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div>
				<div class="flex items-center gap-2 text-amber-900 font-extrabold text-xs tracking-wider uppercase mb-2">
					<Award class="h-4 w-4 text-amber-700" />
					<span>Personal TV Wrapped</span>
				</div>
				<h2 class="text-2xl sm:text-3xl font-black text-stone-900 font-heading">
					Total Lifetime Watch Time
				</h2>
				<p class="text-sm text-stone-600 mt-1 max-w-md font-medium">
					Aggregated screen time computed across all your logged episodes and TV series.
				</p>
			</div>

			<!-- Time Breakdown Counters -->
			<div class="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
				<div class="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-4 border border-amber-300 shadow-sm backdrop-blur-md">
					<span class="text-2xl sm:text-3xl font-black text-amber-900 font-heading">{stats.days}</span>
					<span class="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Days</span>
				</div>
				<div class="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-4 border border-amber-300 shadow-sm backdrop-blur-md">
					<span class="text-2xl sm:text-3xl font-black text-amber-800 font-heading">{stats.hours}</span>
					<span class="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Hours</span>
				</div>
				<div class="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-4 border border-amber-300 shadow-sm backdrop-blur-md">
					<span class="text-2xl sm:text-3xl font-black text-amber-700 font-heading">{stats.minutes}</span>
					<span class="text-xs font-bold text-stone-500 uppercase tracking-wider mt-1">Mins</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Overview Quick Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<div class="glass-card rounded-2xl p-4 bg-white border border-stone-200 flex items-center gap-3 shadow-sm">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
				<Tv class="h-5 w-5" />
			</div>
			<div>
				<div class="text-xl font-black text-stone-900 font-heading">{stats.totalWatchedEpisodes}</div>
				<div class="text-xs text-stone-500 font-medium">Episodes Watched</div>
			</div>
		</div>

		<div class="glass-card rounded-2xl p-4 bg-white border border-stone-200 flex items-center gap-3 shadow-sm">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
				<Film class="h-5 w-5" />
			</div>
			<div>
				<div class="text-xl font-black text-stone-900 font-heading">{stats.watchingCount}</div>
				<div class="text-xs text-stone-500 font-medium">Active Shows</div>
			</div>
		</div>

		<div class="glass-card rounded-2xl p-4 bg-white border border-stone-200 flex items-center gap-3 shadow-sm">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
				<Bookmark class="h-5 w-5" />
			</div>
			<div>
				<div class="text-xl font-black text-stone-900 font-heading">{stats.backlogCount}</div>
				<div class="text-xs text-stone-500 font-medium">Backlog Queue</div>
			</div>
		</div>

		<div class="glass-card rounded-2xl p-4 bg-white border border-stone-200 flex items-center gap-3 shadow-sm">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
				<CheckCircle2 class="h-5 w-5" />
			</div>
			<div>
				<div class="text-xl font-black text-stone-900 font-heading">{stats.completedCount}</div>
				<div class="text-xs text-stone-500 font-medium">Completed Shows</div>
			</div>
		</div>
	</div>

	<!-- Top Genres & Network Affinity Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Top Genres Bar Breakdown -->
		<div class="glass-panel rounded-3xl p-5 sm:p-6 bg-white border border-stone-200 shadow-sm">
			<div class="flex items-center gap-2 mb-4">
				<BarChart3 class="h-5 w-5 text-amber-700" />
				<h3 class="text-base font-extrabold text-stone-900 font-heading">Top Genres Breakdown</h3>
			</div>

			{#if stats.topGenres.length > 0}
				<div class="space-y-4">
					{#each stats.topGenres as genre}
						<div>
							<div class="flex justify-between text-xs font-bold mb-1.5">
								<span class="text-stone-800">{genre.name}</span>
								<span class="text-amber-800 font-extrabold">{genre.count} eps ({genre.percentage}%)</span>
							</div>
							<div class="h-2.5 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200">
								<div
									class="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
									style={`width: ${genre.percentage}%`}
								></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-stone-500 py-6 text-center">No watched episodes logged yet.</p>
			{/if}
		</div>

		<!-- Network Affinity -->
		<div class="glass-panel rounded-3xl p-5 sm:p-6 bg-white border border-stone-200 shadow-sm">
			<div class="flex items-center gap-2 mb-4">
				<Tv class="h-5 w-5 text-amber-700" />
				<h3 class="text-base font-extrabold text-stone-900 font-heading">Streaming Network Affinity</h3>
			</div>

			{#if stats.networkAffinity.length > 0}
				<div class="space-y-3">
					{#each stats.networkAffinity as net}
						<div class="flex items-center justify-between rounded-2xl bg-stone-50 p-3 border border-stone-200">
							<span class="text-sm font-bold text-stone-800">{net.name}</span>
							<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300">
								{net.count} episodes
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-stone-500 py-6 text-center">No network data calculated yet.</p>
			{/if}
		</div>
	</div>
</div>
