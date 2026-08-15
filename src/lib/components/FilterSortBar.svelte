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
		tracker.filterGenre !== 'all' || tracker.filterNetwork !== 'all' || tracker.sortBy !== 'last_watched'
	);

	function resetFilters() {
		tracker.sortBy = 'last_watched';
		tracker.filterGenre = 'all';
		tracker.filterNetwork = 'all';
	}
</script>

<div class="glass-panel rounded-2xl p-3 bg-white border border-stone-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
	<div class="flex items-center gap-2 flex-wrap flex-1">
		<!-- Sort Selector -->
		<div class="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 font-bold">
			<ArrowUpDown class="h-3.5 w-3.5 text-amber-600 shrink-0" />
			<span>Sort:</span>
			<select
				bind:value={tracker.sortBy}
				class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer"
			>
				<option value="last_watched">Recently Watched</option>
				<option value="user_rating">My Rating (Highest)</option>
				<option value="progress">Progress %</option>
				<option value="title">Title (A-Z)</option>
				<option value="year">Release Year</option>
			</select>
		</div>

		<!-- Genre Filter Dropdown -->
		<div class="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 font-bold">
			<Filter class="h-3.5 w-3.5 text-amber-600 shrink-0" />
			<span>Genre:</span>
			<select
				bind:value={tracker.filterGenre}
				class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer"
			>
				<option value="all">All Genres</option>
				{#each availableGenres as g}
					<option value={g}>{g}</option>
				{/each}
			</select>
		</div>

		<!-- Network Filter Dropdown -->
		{#if availableNetworks.length > 0}
			<div class="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 font-bold">
				<SlidersHorizontal class="h-3.5 w-3.5 text-amber-600 shrink-0" />
				<span>Network:</span>
				<select
					bind:value={tracker.filterNetwork}
					class="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer"
				>
					<option value="all">All Networks</option>
					{#each availableNetworks as net}
						<option value={net}>{net}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	{#if hasActiveFilters}
		<button
			onclick={resetFilters}
			class="flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300 transition-all shrink-0"
		>
			<X class="h-3.5 w-3.5" />
			<span>Reset Filters</span>
		</button>
	{/if}
</div>
