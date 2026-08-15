<script lang="ts">
	import { tracker, type SortOption } from '$lib/stores/tracker.svelte';
	import { SlidersHorizontal, ArrowUpDown, Filter, X } from '@lucide/svelte';

	let {
		availableGenres = [],
		availableNetworks = []
	}: {
		availableGenres: string[];
		availableNetworks: string[];
	} = $props();

	const hasActiveFilters = $derived(
		tracker.filterGenre !== 'all' || tracker.filterNetwork !== 'all' || tracker.sortBy !== 'latest'
	);

	function resetFilters() {
		tracker.sortBy = 'latest';
		tracker.filterGenre = 'all';
		tracker.filterNetwork = 'all';
	}
</script>

<div class="glass-panel rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xs">
	<div class="flex items-center gap-2 sm:gap-3 flex-wrap flex-1">
		<!-- Sort Selector -->
		<div class="relative flex items-center gap-2 bg-white/80 hover:bg-white px-3 min-h-12 rounded-xl border border-stone-200 text-stone-700 font-bold shadow-sm transition-colors cursor-pointer group">
			<ArrowUpDown class="h-4 w-4 text-amber-600 shrink-0" />
			<span class="hidden sm:inline">Sort:</span>
			<select
				bind:value={tracker.sortBy}
				class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer appearance-none pr-5 w-full h-full absolute inset-0 opacity-0 z-10"
			>
				<option value="last_watched">Recently Watched</option>
				<option value="user_rating">My Rating (Highest)</option>
				<option value="progress">Progress %</option>
				<option value="title">Title (A-Z)</option>
				<option value="year">Release Year</option>
				<option value="latest">Latest (Upcoming Episode)</option>
			</select>
			<span class="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors pointer-events-none">
				{#if tracker.sortBy === 'last_watched'}Recently Watched
				{:else if tracker.sortBy === 'user_rating'}My Rating
				{:else if tracker.sortBy === 'progress'}Progress %
				{:else if tracker.sortBy === 'title'}Title (A-Z)
				{:else if tracker.sortBy === 'latest'}Latest (Upcoming)
				{:else}Release Year{/if}
			</span>
			<svg class="h-3 w-3 text-stone-400 shrink-0 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
		</div>

		<!-- Genre Filter Dropdown -->
		<div class="relative flex items-center gap-2 bg-white/80 hover:bg-white px-3 min-h-12 rounded-xl border border-stone-200 text-stone-700 font-bold shadow-sm transition-colors cursor-pointer group">
			<Filter class="h-4 w-4 text-amber-600 shrink-0" />
			<span class="hidden sm:inline">Genre:</span>
			<select
				bind:value={tracker.filterGenre}
				class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer appearance-none pr-5 w-full h-full absolute inset-0 opacity-0 z-10"
			>
				<option value="all">All Genres</option>
				{#each availableGenres as g}
					<option value={g}>{g}</option>
				{/each}
			</select>
			<span class="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors pointer-events-none">
				{tracker.filterGenre === 'all' ? 'All' : tracker.filterGenre}
			</span>
			<svg class="h-3 w-3 text-stone-400 shrink-0 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
		</div>

		<!-- Network Filter Dropdown -->
		{#if availableNetworks.length > 0}
			<div class="relative flex items-center gap-2 bg-white/80 hover:bg-white px-3 min-h-12 rounded-xl border border-stone-200 text-stone-700 font-bold shadow-sm transition-colors cursor-pointer group">
				<SlidersHorizontal class="h-4 w-4 text-amber-600 shrink-0" />
				<span class="hidden sm:inline">Network:</span>
				<select
					bind:value={tracker.filterNetwork}
					class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer appearance-none pr-5 w-full h-full absolute inset-0 opacity-0 z-10"
				>
					<option value="all">All Networks</option>
					{#each availableNetworks as net}
						<option value={net}>{net}</option>
					{/each}
				</select>
				<span class="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors pointer-events-none truncate max-w-[100px]">
					{tracker.filterNetwork === 'all' ? 'All' : tracker.filterNetwork}
				</span>
				<svg class="h-3 w-3 text-stone-400 shrink-0 ml-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
			</div>
		{/if}
	</div>

	{#if hasActiveFilters}
		<button
			onclick={resetFilters}
			class="flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-stone-950 hover:bg-amber-200 bg-amber-100 px-3 min-h-12 rounded-xl border border-amber-300 shadow-sm transition-all shrink-0"
		>
			<X class="h-4 w-4" />
			<span>Reset</span>
		</button>
	{/if}
</div>
