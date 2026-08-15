<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import { db, type TrackedShow, type WatchedEpisode } from '$lib/db';
	import { getShowDetails, getPopularShows, searchShows, type TVMazeShow } from '$lib/services/tvmaze';
	import { triggerAutoSync } from '$lib/supabase';
	import ShowCard from '$lib/components/ShowCard.svelte';
	import YetToWatchCard from '$lib/components/YetToWatchCard.svelte';
	import StatsDashboard from '$lib/components/StatsDashboard.svelte';
	import SimilarShows from '$lib/components/SimilarShows.svelte';
	import BingePaceModal from '$lib/components/BingePaceModal.svelte';
	import FilterSortBar from '$lib/components/FilterSortBar.svelte';
	import CustomListsView from '$lib/components/CustomListsView.svelte';
	import { liveQuery } from 'dexie';
	import { Tv, Bookmark, Sparkles, Plus, Search, Film, Flame, Star, ListPlus } from '@lucide/svelte';

	// Dexie live queries for tracked shows and watched episodes
	let trackedShowsList = $state<TrackedShow[]>([]);
	let watchedEpisodesList = $state<WatchedEpisode[]>([]);

	$effect(() => {
		const subShows = liveQuery(() => db.shows.toArray()).subscribe((val) => {
			trackedShowsList = val || [];
		});
		const subEps = liveQuery(() => db.watchedEpisodes.toArray()).subscribe((val) => {
			watchedEpisodesList = val || [];
		});
		return () => {
			subShows.unsubscribe();
			subEps.unsubscribe();
		};
	});

	// Cache for deep embedded TVMazeShow details per show ID
	let showDetailsCache = $state<Record<number, TVMazeShow>>({});

	// Fetch full details (episodes + nextepisode) for all tracked shows
	$effect(() => {
		if (trackedShowsList.length > 0) {
			trackedShowsList.forEach((s) => {
				if (!showDetailsCache[s.tvmazeId]) {
					getShowDetails(s.tvmazeId).then((details) => {
						showDetailsCache = { ...showDetailsCache, [s.tvmazeId]: details };
					});
				}
			});
		}
	});

	// Popular shows for Discover tab
	let popularShows = $state<TVMazeShow[]>([]);
	$effect(() => {
		getPopularShows().then((res) => {
			popularShows = res;
		});
	});

	// Dynamically compute available unique Genres and Networks from tracked shows
	const availableGenres = $derived(
		Array.from(new Set(trackedShowsList.flatMap((s) => s.genres || []))).sort()
	);
	const availableNetworks = $derived(
		Array.from(new Set(trackedShowsList.map((s) => s.network).filter(Boolean) as string[])).sort()
	);

	// Filter and Sort helper
	function processShows(shows: TrackedShow[]) {
		let result = [...shows];

		// Filter by Genre
		if (tracker.filterGenre !== 'all') {
			result = result.filter((s) => (s.genres || []).includes(tracker.filterGenre));
		}

		// Filter by Network
		if (tracker.filterNetwork !== 'all') {
			result = result.filter((s) => s.network === tracker.filterNetwork);
		}

		// Sort
		result.sort((a, b) => {
			if (tracker.sortBy === 'user_rating') {
				return (b.userRating || 0) - (a.userRating || 0);
			}
			if (tracker.sortBy === 'title') {
				return a.name.localeCompare(b.name);
			}
			if (tracker.sortBy === 'year') {
				const fullA = showDetailsCache[a.tvmazeId];
				const fullB = showDetailsCache[b.tvmazeId];
				const yearA = parseInt(fullA?.premiered?.slice(0, 4) || '0', 10);
				const yearB = parseInt(fullB?.premiered?.slice(0, 4) || '0', 10);
				return yearB - yearA;
			}
			if (tracker.sortBy === 'progress') {
				const fullA = showDetailsCache[a.tvmazeId];
				const fullB = showDetailsCache[b.tvmazeId];
				const epsA = fullA?._embedded?.episodes || [];
				const epsB = fullB?._embedded?.episodes || [];
				const wA = watchedEpisodesList.filter((e) => e.tvmazeShowId === a.tvmazeId).length;
				const wB = watchedEpisodesList.filter((e) => e.tvmazeShowId === b.tvmazeId).length;
				const pctA = epsA.length > 0 ? wA / epsA.length : 0;
				const pctB = epsB.length > 0 ? wB / epsB.length : 0;
				return pctB - pctA;
			}
			// Default: last_watched
			const lastA = watchedEpisodesList
				.filter((e) => e.tvmazeShowId === a.tvmazeId)
				.sort((x, y) => new Date(y.watchedAt).getTime() - new Date(x.watchedAt).getTime())[0];
			const lastB = watchedEpisodesList
				.filter((e) => e.tvmazeShowId === b.tvmazeId)
				.sort((x, y) => new Date(y.watchedAt).getTime() - new Date(x.watchedAt).getTime())[0];
			const timeA = lastA ? new Date(lastA.watchedAt).getTime() : new Date(a.addedAt).getTime();
			const timeB = lastB ? new Date(lastB.watchedAt).getTime() : new Date(b.addedAt).getTime();
			return timeB - timeA;
		});

		return result;
	}

	const watchingShows = $derived(processShows(trackedShowsList.filter((s) => s.status === 'watching')));
	const backlogShows = $derived(processShows(trackedShowsList.filter((s) => s.status === 'yet_to_watch')));

	// Binge Pace Modal Show target
	let paceModalShow = $state<TVMazeShow | null>(null);

	async function quickAddShow(show: TVMazeShow, status: 'watching' | 'yet_to_watch') {
		const full = await getShowDetails(show.id);
		await db.shows.put({
			tvmazeId: full.id,
			name: full.name,
			poster: full.image?.medium,
			status,
			rating: full.rating?.average ?? undefined,
			runtime: full.runtime,
			averageRuntime: full.averageRuntime,
			addedAt: new Date(),
			genres: full.genres || [],
			network: full.network?.name || full.webChannel?.name,
			summary: full.summary
		});
		showDetailsCache = { ...showDetailsCache, [full.id]: full };
		await triggerAutoSync();
		tracker.activeTab = status;
	}
</script>

<div class="pb-16 sm:pb-0">
	<!-- Tab 1: Currently Watching Board -->
	{#if tracker.activeTab === 'watching'}
		<div class="space-y-4 sm:space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg sm:text-xl font-black text-stone-900 font-heading tracking-tight">
						Currently Watching ({watchingShows.length})
					</h2>
					<p class="text-[11px] sm:text-xs text-stone-500 font-medium">
						Active series with automated Next Up episode checkoffs and pace warnings.
					</p>
				</div>

				{#if watchingShows.length > 0}
					<button
						onclick={() => (tracker.activeTab = 'discover')}
						class="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1.5 text-xs font-extrabold text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-sm transition-all shrink-0"
					>
						<Plus class="h-4 w-4 stroke-[3]" />
						<span>Add Show</span>
					</button>
				{/if}
			</div>

			<!-- Filter & Sort Controls Bar -->
			{#if trackedShowsList.length > 0}
				<FilterSortBar
					availableGenres={availableGenres}
					availableNetworks={availableNetworks}
				/>
			{/if}

			{#if watchingShows.length > 0}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
					{#each watchingShows as tracked}
						{@const fullShow = showDetailsCache[tracked.tvmazeId]}
						{@const showWatchedIds = watchedEpisodesList
							.filter((ep) => ep.tvmazeShowId === tracked.tvmazeId)
							.map((ep) => ep.tvmazeEpisodeId)}

						<ShowCard
							show={fullShow}
							trackedShow={tracked}
							watchedIds={showWatchedIds}
							userRating={tracked.userRating}
							userReview={tracked.userReview}
							onOpenPaceModal={(s) => (paceModalShow = s)}
						/>
					{/each}
				</div>
			{:else}
				<!-- Empty State for Watching Board -->
				<div class="glass-panel rounded-3xl p-6 sm:p-12 text-center bg-white border border-stone-200 max-w-xl mx-auto my-4 sm:my-8 shadow-sm">
					<div class="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 mb-3 sm:mb-4">
						<Tv class="h-7 w-7 sm:h-8 sm:w-8" />
					</div>
					<h3 class="text-base sm:text-lg font-extrabold text-stone-900 font-heading">No shows match filters</h3>
					<p class="text-xs text-stone-500 mt-1 leading-relaxed font-medium">
						Search for your favorite series or adjust your filters to view tracked shows!
					</p>
					<button
						onclick={() => (tracker.activeTab = 'discover')}
						class="mt-4 sm:mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-stone-950 shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all"
					>
						<Sparkles class="h-4 w-4 text-stone-950" />
						<span>Explore Discover Directory</span>
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Tab 2: Yet to Watch (Backlog Queue) -->
	{#if tracker.activeTab === 'yet_to_watch'}
		<div class="space-y-4 sm:space-y-6">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg sm:text-xl font-black text-stone-900 font-heading tracking-tight">
						Yet to Watch Queue ({backlogShows.length})
					</h2>
					<p class="text-[11px] sm:text-xs text-stone-500 font-medium">
						Series in your queue with total runtime estimates and instant start triggers.
					</p>
				</div>
			</div>

			{#if trackedShowsList.length > 0}
				<FilterSortBar
					availableGenres={availableGenres}
					availableNetworks={availableNetworks}
				/>
			{/if}

			{#if backlogShows.length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					{#each backlogShows as tracked}
						{@const fullShow = showDetailsCache[tracked.tvmazeId]}
						{#if fullShow}
							<YetToWatchCard show={fullShow} />
						{:else}
							<div class="glass-card rounded-2xl p-4 bg-white border border-stone-200 animate-pulse aspect-[16/9] w-full"></div>
						{/if}
					{/each}
				</div>
			{:else}
				<div class="glass-panel rounded-3xl p-6 sm:p-12 text-center bg-white border border-stone-200 max-w-xl mx-auto my-4 sm:my-8 shadow-sm">
					<div class="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 mb-3 sm:mb-4">
						<Bookmark class="h-7 w-7 sm:h-8 sm:w-8" />
					</div>
					<h3 class="text-base sm:text-lg font-extrabold text-stone-900 font-heading">Queue is currently empty</h3>
					<p class="text-xs text-stone-500 mt-1 font-medium">Add shows you intend to watch later to organize your watchlist.</p>
					<button
						onclick={() => (tracker.activeTab = 'discover')}
						class="mt-4 sm:mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-black text-stone-950 shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all"
					>
						<Search class="h-4 w-4 text-stone-950" />
						<span>Search Shows</span>
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Tab 3: Custom Lists -->
	{#if tracker.activeTab === 'lists'}
		<CustomListsView trackedShows={trackedShowsList} />
	{/if}

	<!-- Tab 4: TV Wrapped / Stats Dashboard -->
	{#if tracker.activeTab === 'stats'}
		<StatsDashboard
			trackedShows={trackedShowsList}
			watchedEpisodes={watchedEpisodesList}
		/>
	{/if}

	<!-- Tab 5: Discover & Recommendations -->
	{#if tracker.activeTab === 'discover'}
		<div class="space-y-6 sm:space-y-8">
			<!-- Search Results Grid -->
			{#if tracker.searchResults.length > 0}
				<div>
					<div class="flex items-center justify-between mb-3 sm:mb-4">
						<div class="flex items-center gap-2">
							<Search class="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
							<h2 class="text-base sm:text-lg font-extrabold text-stone-900 font-heading">
								Search Results for "{tracker.searchQuery}" ({tracker.searchResults.length})
							</h2>
						</div>
						<button
							onclick={() => {
								tracker.searchResults = [];
								tracker.searchQuery = '';
							}}
							class="text-xs font-bold text-stone-500 hover:text-stone-800"
						>
							Clear Search
						</button>
					</div>

					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
						{#each tracker.searchResults as show}
							<div class="glass-card group rounded-2xl overflow-hidden bg-white border border-stone-200 flex flex-col justify-between shadow-sm">
								<div class="relative aspect-[2/3] bg-stone-100 overflow-hidden">
									<img
										src={show.image?.medium || show.image?.original || '/placeholder.png'}
										alt={show.name}
										loading="lazy"
										class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									<div class="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent"></div>

									{#if show.rating?.average}
										<div class="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-stone-950 shadow-sm">
											<Star class="h-3 w-3 fill-stone-950 text-stone-950" />
											<span>{show.rating.average}</span>
										</div>
									{/if}

									<div class="absolute bottom-2 left-2 right-2 text-white">
										<h3 class="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors drop-shadow-sm">
											{show.name}
										</h3>
										<p class="text-[10px] text-stone-200 font-medium drop-shadow-sm">
											{show.premiered?.slice(0, 4) || 'TBA'} • {(show.genres || []).slice(0, 2).join(', ')}
										</p>
									</div>
								</div>

								<div class="p-2 flex flex-col sm:flex-row items-center gap-1 bg-white border-t border-stone-100">
									<button
										onclick={() => quickAddShow(show, 'watching')}
										class="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-1 text-[10px] sm:text-[11px] font-extrabold text-stone-950 hover:from-amber-400 hover:to-yellow-400 shadow-sm transition-colors"
									>
										+ Watching
									</button>
									<button
										onclick={() => quickAddShow(show, 'yet_to_watch')}
										class="w-full sm:flex-1 rounded-xl bg-stone-100 py-1 text-[10px] sm:text-[11px] font-bold text-stone-700 hover:bg-stone-200 transition-colors"
									>
										+ Queue
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Jaccard Recommendation Section if user has shows -->
			{#if trackedShowsList.length > 0 && popularShows.length > 0}
				{@const sourceShow = trackedShowsList[0]}
				<SimilarShows
					sourceShow={sourceShow}
					candidates={popularShows}
					onAddShow={quickAddShow}
				/>
			{/if}

			<!-- Popular Directory Grid -->
			<div>
				<div class="flex items-center gap-2 mb-3 sm:mb-4">
					<Sparkles class="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
					<h2 class="text-base sm:text-lg font-extrabold text-stone-900 font-heading">Top Rated Shows</h2>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
					{#each popularShows as show}
						<div class="glass-card group rounded-2xl overflow-hidden bg-white border border-stone-200 flex flex-col justify-between shadow-sm">
							<div class="relative aspect-[2/3] bg-stone-100 overflow-hidden">
								<img
									src={show.image?.medium || '/placeholder.png'}
									alt={show.name}
									loading="lazy"
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
								<div class="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent"></div>

								{#if show.rating?.average}
									<div class="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-stone-950 shadow-sm">
										<Star class="h-3 w-3 fill-stone-950 text-stone-950" />
										<span>{show.rating.average}</span>
									</div>
								{/if}

								<div class="absolute bottom-2 left-2 right-2 text-white">
									<h3 class="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors drop-shadow-sm">
										{show.name}
									</h3>
									<p class="text-[10px] text-stone-200 font-medium drop-shadow-sm">
										{(show.genres || []).slice(0, 2).join(', ')}
									</p>
								</div>
							</div>

							<div class="p-2 flex flex-col sm:flex-row items-center gap-1 bg-white border-t border-stone-100">
								<button
									onclick={() => quickAddShow(show, 'watching')}
									class="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-1 text-[10px] sm:text-[11px] font-extrabold text-stone-950 hover:from-amber-400 hover:to-yellow-400 shadow-sm transition-colors"
								>
									+ Watching
								</button>
								<button
									onclick={() => quickAddShow(show, 'yet_to_watch')}
									class="w-full sm:flex-1 rounded-xl bg-stone-100 py-1 text-[10px] sm:text-[11px] font-bold text-stone-700 hover:bg-stone-200 transition-colors"
								>
									+ Queue
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Binge Pace Modal -->
	{#if paceModalShow}
		{@const paceWatchedIds = watchedEpisodesList
			.filter((ep) => ep.tvmazeShowId === paceModalShow?.id)
			.map((ep) => ep.tvmazeEpisodeId)}
		<BingePaceModal
			show={paceModalShow}
			watchedIds={paceWatchedIds}
			onClose={() => (paceModalShow = null)}
		/>
	{/if}
</div>
