<script lang="ts">
	import type { TVMazeShow, TVMazeEpisode } from '$lib/services/tvmaze';
	import type { TrackedShow } from '$lib/db';
	import { formatLongDate, getDaysUntil, formatRelativeTime } from '$lib/services/tvmaze';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { getSupabase } from '$lib/supabase';
	import { db } from '$lib/db';
	import { Check, Flame, Star, List, Calendar, Trash2, ChevronRight, Clock, BookmarkPlus, MessageSquare, CloudCheck, HardDrive, Undo2 } from '@lucide/svelte';

	let {
		show = null,
		trackedShow = null,
		watchedIds = [],
		userRating = 0,
		userReview = ''
	}: {
		show?: TVMazeShow | null;
		trackedShow?: TrackedShow | null;
		watchedIds: number[];
		userRating?: number;
		userReview?: string;
	} = $props();

	// Check if user is signed in to render cloud vs local storage badge
	let isUserSignedIn = $state(false);
	if (typeof window !== 'undefined') {
		const sb = getSupabase();
		if (sb) {
			sb.auth.getSession().then((res: any) => {
				isUserSignedIn = !!res?.data?.session?.user;
			});
			sb.auth.onAuthStateChange((_event: string, session: any) => {
				isUserSignedIn = !!session?.user;
			});
		}
	}

	const showId = $derived(show?.id || trackedShow?.tvmazeId || 0);
	const showName = $derived(show?.name || trackedShow?.name || 'Loading Show...');
	const showPoster = $derived(show?.image?.medium || show?.image?.original || trackedShow?.poster || '/placeholder.png');
	const showRatingAverage = $derived(show?.rating?.average ?? trackedShow?.rating);
	const showNetworkName = $derived(show?.network?.name || show?.webChannel?.name || trackedShow?.network);
	const showGenres = $derived(show?.genres || trackedShow?.genres || []);
	const showPremieredYear = $derived(show?.premiered?.slice(0, 4));
	const showSummary = $derived(show?.summary || trackedShow?.summary);

	const episodes = $derived(show?._embedded?.episodes ?? []);
	const watchedCount = $derived(episodes.filter((ep) => watchedIds.includes(ep.id)).length);
	const progressPercent = $derived(
		episodes.length > 0 ? Math.round((watchedCount / episodes.length) * 100) : 0
	);

	// Find the earliest unwatched episode
	const nowStr = new Date().toISOString().split('T')[0];
	const nextEpisode = $derived(
		episodes.find((ep) => !watchedIds.includes(ep.id))
	);

	const isNextEpisodeAired = $derived(
		nextEpisode ? !nextEpisode.airdate || nextEpisode.airdate <= nowStr : false
	);

	// Next scheduled upcoming release date from embedded payload
	const nextAirdate = $derived(show?._embedded?.nextepisode?.airdate);

	// Compute seasons and watched status
	const seasonStats = $derived.by(() => {
		const map = new Map<number, { total: number; watched: number }>();
		for (const ep of episodes) {
			const s = map.get(ep.season) || { total: 0, watched: 0 };
			s.total += 1;
			if (watchedIds.includes(ep.id)) {
				s.watched += 1;
			}
			map.set(ep.season, s);
		}
		return Array.from(map.entries())
			.map(([season, stats]) => ({ season, ...stats }))
			.sort((a, b) => a.season - b.season);
	});

	// Personal Rating State
	let showReviewInput = $state(false);
	let currentRating = $state(userRating ?? 0);
	let hoveredStar = $state(0);

	async function setPersonalRating(rating: number) {
		// Toggle off if clicking the active rating
		const newRating = rating === currentRating ? 0 : rating;
		currentRating = newRating;
		hoveredStar = 0;
		if (showId) {
			await tracker.updateUserRating(showId, newRating, '');
		}
		showReviewInput = false;
	}
</script>

<div class="glass-card group relative overflow-hidden rounded-2xl flex flex-col bg-white border border-stone-200 shadow-sm p-4 sm:p-5 gap-4 sm:gap-5">
	<!-- Top: Poster & Details -->
	<div class="flex flex-row gap-3 sm:gap-5 items-stretch">
		<!-- Left: Poster Image -->
	<div class="relative w-28 sm:w-32 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 shadow-sm self-start">
		<img
			src={showPoster}
			alt={showName}
			loading="lazy"
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent"></div>

		<!-- TVMaze Rating Badge -->
		{#if showRatingAverage}
			<div class="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-50/95 px-2 py-0.5 text-[10px] font-bold text-amber-900 backdrop-blur-md border border-amber-300 shadow-sm">
				<Star class="h-3 w-3 fill-amber-500 text-amber-500" />
				<span>{showRatingAverage}</span>
			</div>
		{/if}

		<!-- Storage Location Indicator Badge -->
		<div class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-stone-950/70 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
			{#if isUserSignedIn}
				<CloudCheck class="h-3 w-3 text-amber-300" />
				<span class="hidden sm:inline">Cloud</span>
			{:else}
				<HardDrive class="h-3 w-3 text-stone-300" />
				<span class="hidden sm:inline">Local</span>
			{/if}
		</div>

		<!-- Network Badge -->
		{#if showNetworkName}
			<div class="absolute bottom-2 left-2 hidden sm:block rounded-md bg-stone-900/80 px-2 py-0.5 text-[10px] font-bold text-amber-200 backdrop-blur-md">
				{showNetworkName}
			</div>
		{/if}
	</div>

	<!-- Right: Content Details -->
	<div class="flex-1 flex flex-col justify-between gap-2 min-w-0">
		<div class="flex flex-col gap-2">
			<!-- Title & Action Triggers -->
			<div class="flex items-start justify-between gap-1.5">
				<div class="min-w-0 flex-1">
					<h3 class="text-sm sm:text-lg font-extrabold text-stone-900 tracking-tight font-heading group-hover:text-amber-600 transition-colors truncate">
						{showName}
					</h3>
					<p class="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
						{showPremieredYear || 'TBA'} • {showGenres.slice(0, 2).join(', ')}
					</p>
				</div>

				<div class="flex items-center gap-1 shrink-0">
					<button
						onclick={() => (showReviewInput = !showReviewInput)}
						class={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
							currentRating > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
						}`}
						title="Personal Rating"
					>
						<Star class="h-4 w-4" />
					</button>

					<button
						onclick={() => showId && tracker.openShowModal(showId)}
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-900 transition-colors"
						title="Full Episode Breakdown"
					>
						<List class="h-4 w-4" />
					</button>
					<button
						onclick={() => {
							if (showId && confirm(`Are you sure you want to remove "${showName}" from your tracked shows?`)) {
								tracker.removeShow(showId);
							}
						}}
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
						title="Remove from Library"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- Inline Rating Input -->
			{#if showReviewInput}
				<div class="mt-2 space-y-3 rounded-xl bg-stone-50 p-3 border border-stone-200">
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-bold text-stone-500 uppercase tracking-wider">My Score</span>
						<div class="flex items-center gap-1">
							<div class="flex items-center gap-0.5">
							{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as star}
								<button
									type="button"
									onclick={() => setPersonalRating(star)}
									onmouseenter={() => { hoveredStar = star; }}
									onmouseleave={() => { hoveredStar = 0; }}
									class="flex h-8 w-8 items-center justify-center rounded-lg p-1 focus:outline-none"
									title={star === currentRating ? 'Click to clear rating' : `Rate ${star}/10`}
								>
									<Star
										class={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${
											(hoveredStar > 0 ? star <= hoveredStar : star <= currentRating)
												? 'fill-amber-500 text-amber-500'
												: hoveredStar > 0
													? 'text-stone-200'
													: 'text-stone-300'
										}`}
									/>
								</button>
							{/each}
							</div>
							<!-- Live score label -->
							<span class="ml-1 min-w-[2.5rem] text-xs font-black text-amber-900 transition-all">
								{#if hoveredStar > 0}
									{hoveredStar}/10
								{:else if currentRating > 0}
									{currentRating}/10
								{/if}
							</span>
						</div>
					</div>
				</div>
			{:else if currentRating > 0}
				<div class="mt-2 flex flex-col gap-1.5 rounded-xl bg-amber-50/80 p-3 border border-amber-200/60">
					<div class="flex items-center gap-1">
						<Star class="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
						<span class="text-[11px] font-black text-amber-900 tracking-wide uppercase">My Score: {currentRating}/10</span>
					</div>
				</div>
			{/if}

			<!-- Next Up Episode Box -->
			{#if nextEpisode && isNextEpisodeAired}
				{@const daysAgo = getDaysUntil(nextEpisode.airdate)}
				<div class="mt-1 rounded-xl bg-amber-500/5 p-2.5 sm:p-3 border border-amber-200/80">
					<div class="flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-amber-900 tracking-wider uppercase mb-0.5">
						<span>Next Up: S{nextEpisode.season} E{nextEpisode.number}</span>
						{#if nextEpisode.airdate}
							<span class="text-stone-500 font-medium normal-case flex items-center gap-1">
								<span class="hidden sm:inline">{formatLongDate(nextEpisode.airdate)}</span>
								{#if daysAgo !== null}
									<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-amber-900 font-bold border border-amber-300">
										{daysAgo === 0 ? 'Aired Today' : `${formatRelativeTime(daysAgo)} ago`}
									</span>
								{/if}
							</span>
						{/if}
					</div>

					<h4 class="text-xs sm:text-sm font-bold text-stone-900 truncate">
						{nextEpisode.name}
					</h4>
				</div>
			{:else if nextEpisode && !isNextEpisodeAired}
				{@const daysLeft = getDaysUntil(nextEpisode.airdate)}
				<div class="mt-1 rounded-xl bg-amber-50/80 p-2.5 sm:p-3 border border-amber-200">
					<div class="flex items-center justify-between gap-1.5 mb-1">
						<span class="text-[11px] sm:text-xs font-bold text-amber-900 truncate">🎉 All caught up on aired episodes!</span>
						{#if daysLeft !== null}
							<span class="flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-950 border border-amber-300 shrink-0">
								<Clock class="h-3 w-3 text-amber-800 animate-pulse" />
								<span>
									{#if daysLeft === 0}
										Airing Today!
									{:else}
										{formatRelativeTime(daysLeft)} Left
									{/if}
								</span>
							</span>
						{/if}
					</div>
					<p class="text-[10px] sm:text-[11px] text-stone-700 leading-relaxed">
						Next episode: <strong class="text-stone-900">S{nextEpisode.season} E{nextEpisode.number} ({nextEpisode.name})</strong> airs on <span class="text-amber-900 font-extrabold">{formatLongDate(nextEpisode.airdate)}</span>.
					</p>
				</div>
			{:else if episodes.length > 0 && watchedCount >= episodes.length}
				<div class="mt-1 rounded-xl bg-amber-50 p-2.5 sm:p-3 text-center border border-amber-200">
					<p class="text-[11px] sm:text-xs font-bold text-amber-900">🎉 All caught up!</p>
					<p class="text-[10px] sm:text-[11px] text-stone-500 mt-0.5">Waiting for next season release.</p>
				</div>
			{:else}
				<div class="mt-1 rounded-xl bg-stone-100 p-2.5 sm:p-3 text-center border border-stone-200">
					<p class="text-[11px] text-stone-500">Updating episode schedule...</p>
				</div>
			{/if}

			<!-- Seasons Checklist Underneath Next Up -->
			{#if seasonStats.length > 0}
				<div class="flex flex-wrap gap-1 mt-1">
					{#each seasonStats as s}
						<div class={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold border ${s.watched >= s.total && s.total > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
							<span>S{s.season}</span>
							{#if s.watched >= s.total && s.total > 0}
								<Check class="h-2.5 w-2.5" />
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Bottom Section: Progress, Checklists, and CTA -->
<div class="flex flex-col gap-3 pt-3 sm:pt-4 border-t border-stone-100">
	<!-- Progress Bar -->
	<div>
		<div class="flex items-center justify-between text-[10px] sm:text-xs text-stone-500 font-semibold mb-1">
			<span>Progress</span>
			<span class="text-stone-800 font-extrabold">
				{#if episodes.length > 0}
					{watchedCount} / {episodes.length} eps ({progressPercent}%)
				{:else}
					Updating episode schedule...
				{/if}
			</span>
		</div>
		<div class="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/60">
			<div
				class="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
				style={`width: ${progressPercent}%`}
			></div>
		</div>
	</div>

	<!-- Bottom: Call to Action -->
	{#if nextEpisode && isNextEpisodeAired}
		<div class="flex items-center gap-2">
			<button
				onclick={() => showId && tracker.markEpisodeWatched(showId, nextEpisode)}
				class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 text-xs sm:text-sm font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-98 transition-all"
			>
				<Check class="h-4 w-4 sm:h-5 sm:w-5 text-stone-950" />
				<span>Mark S{nextEpisode.season}E{nextEpisode.number} Watched</span>
			</button>
			{#if watchedCount > 0}
				<button
					onclick={() => showId && tracker.unmarkLastEpisode(showId)}
					class="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors shrink-0"
					title="Undo last watched episode"
				>
					<Undo2 class="h-4 w-4 sm:h-5 sm:w-5" />
				</button>
			{/if}
		</div>
	{/if}
</div>
</div>
