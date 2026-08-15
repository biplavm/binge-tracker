<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import { supabase, signOutUser, syncLocalDexieToSupabase, fetchSupabaseToDexie } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { Film, Search, Eye, EyeOff, Tv, Bookmark, BarChart3, Sparkles, Download, X, User as UserIcon, CloudCheck, LogOut } from '@lucide/svelte';

	let deferredPrompt = $state<any>(null);
	let canInstallPWA = $state<boolean>(false);
	let currentUser = $state<User | null>(null);
	let showAuthModal = $state(false);
	let isSyncing = $state(false);

	if (typeof window !== 'undefined') {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstallPWA = true;
		});

		// Listen to Supabase auth state changes
		supabase.auth.getSession().then((res: any) => {
			currentUser = res?.data?.session?.user ?? null;
			if (currentUser) {
				fetchSupabaseToDexie(currentUser);
			}
		});

		supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
			currentUser = session?.user ?? null;
			if (currentUser) {
				isSyncing = true;
				await syncLocalDexieToSupabase(currentUser);
				await fetchSupabaseToDexie(currentUser);
				isSyncing = false;
			}
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

<!-- Top Sticky Navbar -->
<header class="glass-panel sticky top-0 z-40 w-full border-b border-stone-200/80 px-3 py-2.5 sm:px-6 sm:py-3">
	<div class="mx-auto flex flex-col gap-2.5 max-w-7xl">
		<!-- Top Bar: Brand Logo & Actions -->
		<div class="flex items-center justify-between gap-2">
			<!-- Brand Logo -->
			<button class="flex items-center gap-2.5 text-left focus:outline-none group shrink-0" onclick={() => (tracker.activeTab = 'watching')}>
				<div class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-400 text-stone-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
					<Film class="h-4 w-4 sm:h-5 sm:w-5 text-stone-950" />
				</div>
				<div>
					<div class="flex items-center gap-1.5">
						<h1 class="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 font-heading">
							BingeTrack
						</h1>
						<span class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-amber-900 border border-amber-300">
							PWA
						</span>
					</div>
					<p class="text-[10px] sm:text-xs text-stone-500 hidden sm:block font-medium">TV Tracker & Pace Planner</p>
				</div>
			</button>

			<!-- Desktop & Mobile Actions (PWA Install + Anti-Spoiler Shield Toggle + Auth Profile) -->
			<div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
				{#if canInstallPWA}
					<button
						onclick={installPWA}
						class="flex items-center gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all"
						title="Install BingeTrack PWA"
					>
						<Download class="h-3.5 w-3.5 text-amber-800" />
						<span class="hidden sm:inline">Install</span>
					</button>
				{/if}

				<button
					onclick={() => tracker.toggleSpoilerMode()}
					class={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all ${
						tracker.antiSpoilerMode
							? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
							: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200 hover:text-stone-900'
					}`}
					title="Toggle Anti-Spoiler Shield"
				>
					{#if tracker.antiSpoilerMode}
						<EyeOff class="h-3.5 w-3.5 text-amber-800" />
						<span class="text-[11px] sm:text-xs">Spoiler Shield ON</span>
					{:else}
						<Eye class="h-3.5 w-3.5" />
						<span class="text-[11px] sm:text-xs">Spoiler Shield OFF</span>
					{/if}
				</button>

				<!-- Auth / Cloud Sync User Button -->
				{#if currentUser}
					<div class="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300 shadow-sm">
						<CloudCheck class={`h-3.5 w-3.5 text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
						<span class="text-[11px] font-bold text-stone-800 max-w-[90px] sm:max-w-[140px] truncate">
							{currentUser.email?.split('@')[0]}
						</span>
						<button
							onclick={() => signOutUser()}
							class="text-stone-400 hover:text-red-600 transition-colors ml-1"
							title="Sign Out"
						>
							<LogOut class="h-3.5 w-3.5" />
						</button>
					</div>
				{:else}
					<button
						onclick={() => (showAuthModal = true)}
						class="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
					>
						<UserIcon class="h-3.5 w-3.5 text-stone-950" />
						<span>Sign In</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Search Bar with Year Filter (Responsive Grid/Flex) -->
		<div class="flex items-center gap-1.5 sm:gap-2 w-full">
			<div class="relative flex-1 min-w-0">
				<Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
				<input
					type="text"
					placeholder="Search shows (Severance, Succession)..."
					bind:value={tracker.searchQuery}
					onkeydown={(e) => e.key === 'Enter' && tracker.performSearch()}
					class="w-full rounded-xl bg-white pl-8 pr-7 py-1.5 sm:py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
				/>
				{#if tracker.searchQuery}
					<button
						onclick={() => {
							tracker.searchQuery = '';
							tracker.searchResults = [];
						}}
						class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
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
				class="w-12 sm:w-16 shrink-0 rounded-xl bg-white px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-center text-xs sm:text-sm text-stone-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
			/>

			<button
				onclick={() => tracker.performSearch()}
				disabled={tracker.isSearching}
				class="flex h-8 sm:h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-3 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 active:scale-95 disabled:opacity-50 transition-all"
			>
				{#if tracker.isSearching}
					<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent"></div>
				{:else}
					<Search class="h-3.5 w-3.5 text-stone-950" />
					<span class="hidden sm:inline">Search</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- Navigation Tabs Bar -->
	<nav class="hidden sm:flex mx-auto mt-2.5 max-w-7xl items-center justify-center gap-1.5 border-t border-stone-200/80 pt-2 overflow-x-auto no-scrollbar">
		<button
			onclick={() => (tracker.activeTab = 'watching')}
			class={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
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
			class={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
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
			class={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
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
			class={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
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

<!-- Mobile Bottom Fixed Navigation Bar -->
<div class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 shadow-lg flex items-center justify-around">
	<button
		onclick={() => (tracker.activeTab = 'watching')}
		class={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
			tracker.activeTab === 'watching' ? 'text-amber-800 font-extrabold' : 'text-stone-500'
		}`}
	>
		<Tv class={`h-5 w-5 ${tracker.activeTab === 'watching' ? 'text-amber-600' : 'text-stone-400'}`} />
		<span class="text-[10px]">Watching</span>
	</button>

	<button
		onclick={() => (tracker.activeTab = 'yet_to_watch')}
		class={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
			tracker.activeTab === 'yet_to_watch' ? 'text-amber-800 font-extrabold' : 'text-stone-500'
		}`}
	>
		<Bookmark class={`h-5 w-5 ${tracker.activeTab === 'yet_to_watch' ? 'text-amber-600' : 'text-stone-400'}`} />
		<span class="text-[10px]">Queue</span>
	</button>

	<button
		onclick={() => (tracker.activeTab = 'stats')}
		class={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
			tracker.activeTab === 'stats' ? 'text-amber-800 font-extrabold' : 'text-stone-500'
		}`}
	>
		<BarChart3 class={`h-5 w-5 ${tracker.activeTab === 'stats' ? 'text-amber-600' : 'text-stone-400'}`} />
		<span class="text-[10px]">Wrapped</span>
	</button>

	<button
		onclick={() => (tracker.activeTab = 'discover')}
		class={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
			tracker.activeTab === 'discover' ? 'text-amber-800 font-extrabold' : 'text-stone-500'
		}`}
	>
		<Sparkles class={`h-5 w-5 ${tracker.activeTab === 'discover' ? 'text-amber-600' : 'text-stone-400'}`} />
		<span class="text-[10px]">Discover</span>
	</button>
</div>

<!-- Auth Modal -->
{#if showAuthModal}
	<AuthModal onClose={() => (showAuthModal = false)} />
{/if}
