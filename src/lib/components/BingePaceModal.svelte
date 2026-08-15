<script lang="ts">
	import type { TVMazeShow } from '$lib/services/tvmaze';
	import { calculateBingePace, formatLongDate } from '$lib/services/tvmaze';
	import { X, Flame, Calendar, Download, ExternalLink, Clock } from '@lucide/svelte';

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
	const unwatchedCount = $derived(episodes.filter((ep) => !watchedIds.includes(ep.id)).length);

	const defaultAirdate = $derived(
		show._embedded?.nextepisode?.airdate ||
			new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	);

	let targetDate = $state<string>('');

	$effect(() => {
		if (defaultAirdate && !targetDate) {
			targetDate = defaultAirdate;
		}
	});

	const pace = $derived(
		calculateBingePace(unwatchedCount, targetDate, show.averageRuntime || 45)
	);

	// Generate iCal (.ics) file download
	function downloadICS() {
		if (!pace || !targetDate) return;
		const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BingeTrack//TV Pace Planner//EN
BEGIN:VEVENT
SUMMARY:Catch up on ${show.name} (${pace.episodesPerDay} eps/day)
DESCRIPTION:Watch ${pace.episodesPerDay} episodes per day (~${pace.minutesPerDay} mins/day) to complete ${show.name} before the premiere!
DTSTART:${targetDate.replace(/-/g, '')}T090000Z
DTEND:${targetDate.replace(/-/g, '')}T100000Z
END:VEVENT
END:VCALENDAR`;

		const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', `${show.name.replace(/\s+/g, '_')}_BingePace.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Generate Google Calendar Link
	const googleCalendarUrl = $derived(() => {
		if (!pace || !targetDate) return '#';
		const dateStr = targetDate.replace(/-/g, '');
		const title = encodeURIComponent(`Catch up on ${show.name}`);
		const details = encodeURIComponent(
			`Binge Pace: Watch ${pace.episodesPerDay} eps/day (~${pace.minutesPerDay} mins/day) to finish before the premiere!`
		);
		return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dateStr}T090000Z/${dateStr}T100000Z`;
	});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
	<div class="glass-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-stone-200 pb-3">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
					<Flame class="h-5 w-5 text-amber-800" />
				</div>
				<div>
					<h3 class="text-base font-extrabold text-stone-900 font-heading">Binge Pace Planner</h3>
					<p class="text-xs text-stone-500 font-medium">{show.name}</p>
				</div>
			</div>
			<button onclick={onClose} class="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Form Controls -->
		<div class="space-y-3">
			<div>
				<label for="target-date" class="block text-xs font-bold text-stone-700 mb-1">Target Deadline Date</label>
				<input
					id="target-date"
					type="date"
					bind:value={targetDate}
					class="w-full rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-900 border border-stone-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
				/>
			</div>

			<div class="rounded-2xl bg-stone-50 p-4 border border-stone-200 space-y-2">
				<div class="flex justify-between text-xs text-stone-600">
					<span>Unwatched Episodes:</span>
					<span class="font-bold text-stone-900">{unwatchedCount} episodes</span>
				</div>
				{#if pace}
					<div class="flex justify-between text-xs text-stone-600">
						<span>Days Remaining:</span>
						<span class="font-bold text-stone-900">{pace.daysRemaining} days</span>
					</div>
					<div class="flex justify-between text-xs text-stone-600">
						<span>Required Pace:</span>
						<span class="font-extrabold text-amber-700">{pace.episodesPerDay} eps/day</span>
					</div>
					<div class="flex justify-between text-xs text-stone-600">
						<span>Estimated Daily Screen Time:</span>
						<span class="font-extrabold text-amber-900">~{pace.minutesPerDay} mins/day</span>
					</div>
				{/if}
			</div>

			{#if pace}
				<div class="rounded-2xl bg-amber-100/70 p-3.5 text-xs font-bold text-amber-950 border border-amber-300">
					💡 {pace.formattedPlan}
				</div>
			{/if}
		</div>

		<!-- Action Buttons (Calendar Sync) -->
		<div class="flex items-center gap-2 pt-2">
			<button
				onclick={downloadICS}
				class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 py-2.5 text-xs font-bold text-stone-800 border border-stone-300 hover:bg-stone-200 transition-all"
			>
				<Download class="h-3.5 w-3.5" />
				<span>Download iCal (.ics)</span>
			</button>

			<a
				href={googleCalendarUrl()}
				target="_blank"
				rel="noopener noreferrer"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
			>
				<ExternalLink class="h-3.5 w-3.5 text-stone-950" />
				<span>Google Calendar</span>
			</a>
		</div>
	</div>
</div>
