<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import { Film, Search, Eye, EyeOff, Tv, Bookmark, BarChart3, Sparkles, Download, X } from '@lucide/svelte';

	let deferredPrompt = $state<any>(null);
	let canInstallPWA = $state<boolean>(false);

	if (typeof window !== 'undefined') {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstallPWA = true;
		});
	}

	async function installPWA() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			canInstallPWA = false;
		}
		deferredPrompt = null;
	}
</script>

<header class="glass-panel sticky top-0 z-40 w-full border-b border-stone-200/80 px-4 py-3 sm:px-6">
	<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
		<!-- Brand Logo -->
		<button class="flex items-center gap-3 text-left focus:outline-none group" onclick={() => (tracker.activeTab = 'watching')}>
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-400 text-stone-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
				<Film class="h-5 w-5 text-stone-950" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-extrabold tracking-tight text-stone-900 font-heading">
						BingeTrack
					</h1>
					<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
						PWA
					</span>
				</div>
				<p class="text-xs text-stone-500 hidden sm:block font-medium">TV Tracker & Pace Planner</p>
			</div>
		</button>

		<!-- Search Bar with Year Filter -->
		<div class="flex flex-1 items-center gap-2 max-w-md min-w-[280px]">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
				<input
					type="text"
					placeholder="Search shows (Severance, Succession)..."
					bind:value={tracker.searchQuery}
					onkeydown={(e) => e.key === 'Enter' && tracker.performSearch()}
					class="w-full rounded-xl bg-white pl-9 pr-8 py-2 text-sm text-stone-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
				/>
				{#if tracker.searchQuery}
					<button
						onclick={() => {
							tracker.searchQuery = '';
							tracker.searchResults = [];
						}}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
					>
						<X class="h-3.5 w-3.5" />
					</button>
				{/if}
			</div>

			<input
				type="text"
				placeholder="Year"
				maxlength="4"
				bind:value={tracker.searchYear}
				onkeydown={(e) => e.key === 'Enter' && tracker.performSearch()}
				class="w-16 rounded-xl bg-white px-2.5 py-2 text-center text-sm text-stone-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
			/>

			<button
				onclick={() => tracker.performSearch()}
				disabled={tracker.isSearching}
				class="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-95 disabled:opacity-50 transition-all"
			>
				{#if tracker.isSearching}
					<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent"></div>
				{:else}
					<Search class="h-3.5 w-3.5 text-stone-950" />
					<span class="hidden sm:inline">Search</span>
				{/if}
			</button>
		</div>

		<!-- Actions (PWA Install + Anti-Spoiler Shield Toggle) -->
		<div class="flex items-center gap-2">
			{#if canInstallPWA}
				<button
					onclick={installPWA}
					class="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all"
					title="Install BingeTrack PWA"
				>
					<Download class="h-3.5 w-3.5 text-amber-800" />
					<span class="hidden md:inline">Install App</span>
				</button>
			{/if}

			<button
				onclick={() => tracker.toggleSpoilerMode()}
				class={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${
					tracker.antiSpoilerMode
						? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
						: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200 hover:text-stone-900'
				}`}
				title="Toggle Anti-Spoiler Shield"
			>
				{#if tracker.antiSpoilerMode}
					<EyeOff class="h-3.5 w-3.5 text-amber-800" />
					<span class="hidden sm:inline">Spoiler Shield ON</span>
				{:else}
					<Eye class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Spoiler Shield OFF</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Navigation Tabs Bar -->
	<nav class="mx-auto mt-3 flex max-w-7xl items-center justify-center gap-1 sm:gap-2 border-t border-stone-200/80 pt-2.5">
		<button
			onclick={() => (tracker.activeTab = 'watching')}
			class={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
				tracker.activeTab === 'watching'
					? 'bg-amber-500/15 text-amber-900 border border-amber-400/50 shadow-sm'
					: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
			}`}
		>
			<Tv class="h-4 w-4 text-amber-600" />
			<span>Currently Watching</span>
		</button>

		<button
			onclick={() => (tracker.activeTab = 'yet_to_watch')}
			class={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
				tracker.activeTab === 'yet_to_watch'
					? 'bg-amber-500/15 text-amber-900 border border-amber-400/50 shadow-sm'
					: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
			}`}
		>
			<Bookmark class="h-4 w-4 text-amber-600" />
			<span>Yet to Watch</span>
		</button>

		<button
			onclick={() => (tracker.activeTab = 'stats')}
			class={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
				tracker.activeTab === 'stats'
					? 'bg-amber-500/15 text-amber-900 border border-amber-400/50 shadow-sm'
					: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
			}`}
		>
			<BarChart3 class="h-4 w-4 text-amber-600" />
			<span>TV Wrapped</span>
		</button>

		<button
			onclick={() => (tracker.activeTab = 'discover')}
			class={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
				tracker.activeTab === 'discover'
					? 'bg-amber-500/15 text-amber-900 border border-amber-400/50 shadow-sm'
					: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
			}`}
		>
			<Sparkles class="h-4 w-4 text-amber-600" />
			<span>Discover</span>
		</button>
	</nav>
</header>
