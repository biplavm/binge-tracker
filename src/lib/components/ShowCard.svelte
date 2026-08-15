<script lang="ts">
	import type { TVMazeShow, TVMazeEpisode } from '$lib/services/tvmaze';
	import { calculateBingePace, formatLongDate, getDaysUntil } from '$lib/services/tvmaze';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { Check, Flame, Star, List, Calendar, Trash2, ChevronRight, Clock } from '@lucide/svelte';

	let {
		show,
		watchedIds = [],
		onOpenPaceModal
	}: {
		show: TVMazeShow;
		watchedIds: number[];
		onOpenPaceModal?: (show: TVMazeShow) => void;
	} = $props();

	const episodes = $derived(show._embedded?.episodes ?? []);
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
	const nextAirdate = $derived(show._embedded?.nextepisode?.airdate);
	const bingePlan = $derived(
		nextAirdate && episodes.length > watchedCount
			? calculateBingePace(episodes.length - watchedCount, nextAirdate, show.averageRuntime || 45)
			: null
	);
</script>

<div class="glass-card group relative overflow-hidden rounded-2xl flex flex-row bg-white border border-stone-200 shadow-sm">
	<!-- Left: Poster Image (Compact horizontal side-by-side on mobile) -->
	<div class="relative w-28 sm:w-44 shrink-0 aspect-[2/3] bg-stone-100 overflow-hidden">
		<img
			src={show.image?.medium || show.image?.original || '/placeholder.png'}
			alt={show.name}
			loading="lazy"
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent"></div>

		<!-- Rating Badge -->
		{#if show.rating?.average}
			<div class="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-50/95 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-amber-900 backdrop-blur-md border border-amber-300 shadow-sm">
				<Star class="h-3 w-3 fill-amber-500 text-amber-500" />
				<span>{show.rating.average}</span>
			</div>
		{/if}

		<!-- Network Badge -->
		{#if show.network?.name || show.webChannel?.name}
			<div class="absolute bottom-2 left-2 hidden sm:block rounded-md bg-stone-900/80 px-2 py-0.5 text-[10px] font-bold text-amber-200 backdrop-blur-md">
				{show.network?.name || show.webChannel?.name}
			</div>
		{/if}
	</div>

	<!-- Right: Content Details -->
	<div class="flex-1 p-3 sm:p-5 flex flex-col justify-between gap-2.5 min-w-0">
		<div>
			<!-- Title & Genres -->
			<div class="flex items-start justify-between gap-1.5">
				<div class="min-w-0 flex-1">
					<h3 class="text-sm sm:text-lg font-extrabold text-stone-900 tracking-tight font-heading group-hover:text-amber-600 transition-colors truncate">
						{show.name}
					</h3>
					<p class="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
						{show.premiered?.slice(0, 4) || 'TBA'} • {(show.genres || []).slice(0, 2).join(', ')}
					</p>
				</div>

				<div class="flex items-center gap-1 shrink-0">
					<button
						onclick={() => tracker.openShowModal(show.id)}
						class="rounded-xl bg-stone-100 p-1.5 sm:p-2 text-stone-600 hover:bg-amber-100 hover:text-amber-900 transition-colors"
						title="Full Episode Breakdown"
					>
						<List class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
					</button>
					<button
						onclick={() => tracker.removeShow(show.id)}
						class="rounded-xl bg-stone-100 p-1.5 sm:p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
						title="Remove from Library"
					>
						<Trash2 class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
					</button>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mt-2.5 sm:mt-3.5">
				<div class="flex items-center justify-between text-[10px] sm:text-xs text-stone-500 font-semibold mb-1">
					<span>Progress</span>
					<span class="text-stone-800 font-extrabold">{watchedCount} / {episodes.length} eps ({progressPercent}%)</span>
				</div>
				<div class="h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200/60">
					<div
						class="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
						style={`width: ${progressPercent}%`}
					></div>
				</div>
			</div>

			<!-- Next Up Episode Box -->
			{#if nextEpisode && isNextEpisodeAired}
				{@const daysAgo = getDaysUntil(nextEpisode.airdate)}
				<div class="mt-2.5 sm:mt-3.5 rounded-xl bg-amber-500/5 p-2.5 sm:p-3.5 border border-amber-200/80">
					<div class="flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-amber-900 tracking-wider uppercase mb-0.5">
						<span>Next Up: S{nextEpisode.season} E{nextEpisode.number}</span>
						{#if nextEpisode.airdate}
							<span class="text-stone-500 font-medium normal-case flex items-center gap-1">
								<span class="hidden sm:inline">{formatLongDate(nextEpisode.airdate)}</span>
								{#if daysAgo !== null}
									<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] text-amber-900 font-bold border border-amber-300">
										{daysAgo === 0 ? 'Aired Today' : `${Math.abs(daysAgo)}d ago`}
									</span>
								{/if}
							</span>
						{/if}
					</div>

					<h4 class={`text-xs sm:text-sm font-bold text-stone-900 truncate ${tracker.antiSpoilerMode ? 'spoiler-blur' : ''}`}>
						{nextEpisode.name}
					</h4>

					{#if nextEpisode.summary}
						<p class={`mt-0.5 text-[11px] sm:text-xs text-stone-600 line-clamp-2 leading-relaxed ${tracker.antiSpoilerMode ? 'spoiler-blur' : ''}`}>
							{nextEpisode.summary.replace(/<[^>]*>?/gm, '')}
						</p>
					{/if}

					<button
						onclick={() => tracker.markEpisodeWatched(show.id, nextEpisode)}
						class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-98 transition-all"
					>
						<Check class="h-3.5 w-3.5 text-stone-950" />
						<span>Mark S{nextEpisode.season}E{nextEpisode.number} Watched</span>
					</button>
				</div>
			{:else if nextEpisode && !isNextEpisodeAired}
				{@const daysLeft = getDaysUntil(nextEpisode.airdate)}
				<div class="mt-2.5 sm:mt-3.5 rounded-xl bg-amber-50/80 p-2.5 sm:p-3.5 border border-amber-200">
					<div class="flex items-center justify-between gap-1.5 mb-1">
						<span class="text-[11px] sm:text-xs font-bold text-amber-900 truncate">🎉 All caught up on aired episodes!</span>
						{#if daysLeft !== null}
							<span class="flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-950 border border-amber-300 shrink-0">
								<Clock class="h-3 w-3 text-amber-800 animate-pulse" />
								<span>
									{#if daysLeft === 0}
										Airing Today!
									{:else if daysLeft === 1}
										1 Day Left
									{:else}
										{daysLeft} Days Left
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
				<div class="mt-2.5 sm:mt-3.5 rounded-xl bg-amber-50 p-2.5 text-center border border-amber-200">
					<p class="text-[11px] sm:text-xs font-bold text-amber-900">🎉 All caught up!</p>
					<p class="text-[10px] sm:text-[11px] text-stone-500 mt-0.5">Waiting for next season release.</p>
				</div>
			{:else}
				<div class="mt-2.5 sm:mt-3.5 rounded-xl bg-stone-100 p-2.5 text-center border border-stone-200">
					<p class="text-[11px] text-stone-500">Schedule pending update on TVMaze.</p>
				</div>
			{/if}
		</div>

		<!-- Bottom Binge Pace Banner -->
		{#if bingePlan}
			<div class="flex items-center justify-between rounded-xl bg-amber-100/70 px-2.5 py-1.5 border border-amber-300/80 text-[11px] text-amber-950 font-semibold">
				<div class="flex items-center gap-1.5 truncate">
					<Flame class="h-3.5 w-3.5 text-amber-600 shrink-0" />
					<span class="font-bold text-[10px] sm:text-[11px] truncate">{bingePlan.formattedPlan}</span>
				</div>
				{#if onOpenPaceModal}
					<button
						onclick={() => onOpenPaceModal(show)}
						class="text-[10px] sm:text-[11px] font-extrabold text-amber-900 underline hover:text-amber-700 ml-1.5 shrink-0"
					>
						Pace
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
