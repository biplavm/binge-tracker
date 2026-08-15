<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import { getSupabase, signOutUser, syncLocalDexieToSupabase, fetchSupabaseToDexie } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { Film, Search, Eye, EyeOff, Tv, Bookmark, BarChart3, Sparkles, Download, X, User as UserIcon, CloudCheck, LogOut, Share, PlusSquare, Smartphone } from '@lucide/svelte';

	let deferredPrompt = $state<any>(null);
	let canInstallPWA = $state<boolean>(true);
	let showPwaModal = $state(false);
	let currentUser = $state<User | null>(null);
	let showAuthModal = $state(false);
	let isSyncing = $state(false);

	if (typeof window !== 'undefined') {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			canInstallPWA = true;
		});

		const sb = getSupabase();
		if (sb) {
			sb.auth.getSession().then((res: any) => {
				currentUser = res?.data?.session?.user ?? null;
				if (currentUser) {
					fetchSupabaseToDexie(currentUser);
				}
			});

			sb.auth.onAuthStateChange(async (_event: string, session: any) => {
				currentUser = session?.user ?? null;
				if (currentUser) {
					isSyncing = true;
					await syncLocalDexieToSupabase(currentUser);
					await fetchSupabaseToDexie(currentUser);
					isSyncing = false;
				}
			});
		}
	}

	async function handleInstallPWA() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === 'accepted') {
				deferredPrompt = null;
			}
		} else {
			showPwaModal = true;
		}
	}
</script>

<!-- Top Sticky Navbar -->
<header class="glass-panel sticky top-0 z-40 w-full border-b border-stone-200/80 px-3 py-2.5 sm:px-6 sm:py-3">
	<div class="mx-auto flex flex-col gap-2.5 max-w-7xl">
		<!-- Top Bar: Brand Logo & Icon Action Buttons -->
		<div class="flex items-center justify-between gap-2">
			<!-- Brand Logo -->
			<button class="flex items-center gap-2.5 text-left focus:outline-none group shrink-0" onclick={() => (tracker.activeTab = 'watching')}>
				<div class="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-400 text-stone-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
					<Film class="h-4 w-4 sm:h-5 sm:w-5 text-stone-950" />
				</div>
				<div>
					<h1 class="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 font-heading">
						BingeTrack
					</h1>
					<p class="text-[10px] sm:text-xs text-stone-500 hidden sm:block font-medium">TV Tracker & Pace Planner</p>
				</div>
			</button>

			<!-- Desktop & Mobile Icon-Only Action Buttons -->
			<div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
				<!-- Install PWA Icon Button -->
				<button
					onclick={handleInstallPWA}
					class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-sm transition-all"
					title="Install BingeTrack PWA App"
				>
					<Download class="h-4 w-4 text-amber-800" />
				</button>

				<!-- Anti-Spoiler Shield Icon Button -->
				<button
					onclick={() => tracker.toggleSpoilerMode()}
					class={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all ${
						tracker.antiSpoilerMode
							? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
							: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200 hover:text-stone-900'
					}`}
					title={tracker.antiSpoilerMode ? 'Spoiler Shield ON' : 'Spoiler Shield OFF'}
				>
					{#if tracker.antiSpoilerMode}
						<EyeOff class="h-4 w-4 text-amber-800" />
					{:else}
						<Eye class="h-4 w-4 text-stone-600" />
					{/if}
				</button>

				<!-- Auth / Cloud Sync User Icon Button -->
				{#if currentUser}
					<div class="flex items-center gap-1 bg-amber-50 p-1 sm:p-1.5 rounded-xl border border-amber-300 shadow-sm" title={`Signed in as ${currentUser.email}`}>
						<CloudCheck class={`h-4 w-4 text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
						<button
							onclick={() => signOutUser()}
							class="text-stone-400 hover:text-red-600 transition-colors p-0.5"
							title="Sign Out"
						>
							<LogOut class="h-3.5 w-3.5" />
						</button>
					</div>
				{:else}
					<button
						onclick={() => (showAuthModal = true)}
						class="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
						title="Sign In / Account"
					>
						<UserIcon class="h-4 w-4 text-stone-950" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Search Bar with Year Filter -->
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

<!-- PWA Install Guide Modal -->
{#if showPwaModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
		<div class="glass-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-stone-200 pb-3">
				<div class="flex items-center gap-2.5">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
						<Smartphone class="h-5 w-5 text-amber-800" />
					</div>
					<div>
						<h3 class="text-base font-extrabold text-stone-900 font-heading">Install BingeTrack PWA</h3>
						<p class="text-xs text-stone-500 font-medium">Add to Home Screen for standalone app access</p>
					</div>
				</div>
				<button onclick={() => (showPwaModal = false)} class="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="space-y-3 text-xs text-stone-700">
				<div class="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 space-y-2">
					<h4 class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
						<Share class="h-4 w-4 text-amber-700" /> iOS (iPhone / iPad Safari):
					</h4>
					<ol class="list-decimal list-inside space-y-1 text-[11px] text-stone-700 leading-relaxed font-medium">
						<li>Tap the <strong>Share</strong> icon in Safari's bottom toolbar.</li>
						<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
						<li>Tap <strong>Add</strong> in the top right corner.</li>
					</ol>
				</div>

				<div class="rounded-2xl bg-stone-50 p-3.5 border border-stone-200 space-y-2">
					<h4 class="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
						<PlusSquare class="h-4 w-4 text-amber-600" /> Android / Chrome / Edge / Desktop:
					</h4>
					<ol class="list-decimal list-inside space-y-1 text-[11px] text-stone-700 leading-relaxed font-medium">
						<li>Click the <strong>Install Icon</strong> in your browser address bar.</li>
						<li>Or tap the 3 dots menu ➔ <strong>Install App</strong> or <strong>Add to Home screen</strong>.</li>
					</ol>
				</div>
			</div>

			<button
				onclick={() => (showPwaModal = false)}
				class="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
			>
				Got it!
			</button>
		</div>
	</div>
{/if}
