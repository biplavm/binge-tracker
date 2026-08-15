<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import PWAOfflineNotice from '$lib/components/PWAOfflineNotice.svelte';
	import EpisodeListModal from '$lib/components/EpisodeListModal.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { searchShows, getShowDetails, type TVMazeShow } from '$lib/services/tvmaze';
	import { db, type TrackedShow, type WatchedEpisode } from '$lib/db';
	import { liveQuery } from 'dexie';
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();

	// Dexie live queries for tracked shows and watched episodes
	let trackedShowsList = $state<TrackedShow[]>([]);
	let watchedEpisodesList = $state<WatchedEpisode[]>([]);

	$effect(() => {
		const subShows = liveQuery(() => db.shows.filter(s => s._syncStatus !== 'deleted').toArray()).subscribe((val) => {
			trackedShowsList = val || [];
		});
		const subEps = liveQuery(() => db.watchedEpisodes.filter(e => e._syncStatus !== 'deleted').toArray()).subscribe((val) => {
			watchedEpisodesList = val || [];
		});
		return () => {
			subShows.unsubscribe();
			subEps.unsubscribe();
		};
	});

	// Currently selected show for episode list modal
	let modalShowDetails = $state<TVMazeShow | null>(null);
	let isLoadingModal = $state(false);

	$effect(() => {
		const id = tracker.selectedShowIdForModal;
		if (id) {
			isLoadingModal = true;
			getShowDetails(id)
				.then((details) => {
					modalShowDetails = details;
				})
				.finally(() => {
					isLoadingModal = false;
				});
		} else {
			modalShowDetails = null;
		}
	});

</script>

<svelte:head>
	{@html pwaInfo?.webManifest?.linkTag ?? ''}
</svelte:head>

<div class="min-h-screen flex flex-col bg-[#fcfbf7] text-stone-900 selection:bg-amber-400 selection:text-stone-950">
	<Header />

	<main class="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-stone-200 bg-stone-100/80 py-4 text-center text-xs text-stone-500 font-medium hidden sm:block">
		<div class="mx-auto max-w-7xl px-4 flex items-center justify-center gap-6 text-stone-600 font-semibold">
			<span>Anti-Spoiler Shield: <strong class="text-amber-800 font-extrabold">{tracker.antiSpoilerMode ? 'Active' : 'Disabled'}</strong></span>
			<span>IndexedDB: <strong class="text-amber-900 font-extrabold">{trackedShowsList.length} Shows Saved</strong></span>
		</div>
	</footer>

	<PWAOfflineNotice />

	<!-- Global Episode Breakdown Modal -->
	{#if tracker.selectedShowIdForModal}
		{#if isLoadingModal}
			<BottomSheet onClose={() => tracker.closeShowModal()}>
				<div class="flex items-center justify-center py-16 gap-3">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
					<span class="text-sm font-extrabold text-stone-900">Loading episodes...</span>
				</div>
			</BottomSheet>
		{:else if modalShowDetails}
			{@const showWatchedIds = watchedEpisodesList
				.filter((ep) => ep.tvmazeShowId === modalShowDetails?.id)
				.map((ep) => ep.tvmazeEpisodeId)}
			<EpisodeListModal
				show={modalShowDetails}
				watchedIds={showWatchedIds}
				onClose={() => tracker.closeShowModal()}
			/>
		{/if}
	{/if}

</div>
