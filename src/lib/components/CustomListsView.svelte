<script lang="ts">
	import type { UserList, UserListItem, TrackedShow } from '$lib/db';
	import { db } from '$lib/db';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { liveQuery } from 'dexie';
	import { ListPlus, Share2, Trash2, Plus, Film, Check, Copy, ExternalLink, BookmarkCheck, X } from '@lucide/svelte';

	let { trackedShows = [] }: { trackedShows: TrackedShow[] } = $props();

	// Dexie live queries for custom lists and list items
	let userLists = $state<UserList[]>([]);
	let userListItems = $state<UserListItem[]>([]);

	$effect(() => {
		const subLists = liveQuery(() => db.userLists.toArray()).subscribe((val) => {
			userLists = val || [];
		});
		const subItems = liveQuery(() => db.userListItems.toArray()).subscribe((val) => {
			userListItems = val || [];
		});
		return () => {
			subLists.unsubscribe();
			subItems.unsubscribe();
		};
	});

	// New List Form State
	let showCreateModal = $state(false);
	let newListName = $state('');
	let newListDescription = $state('');

	async function handleCreateList() {
		if (!newListName.trim()) return;
		await tracker.createCustomList(newListName.trim(), newListDescription.trim());
		newListName = '';
		newListDescription = '';
		showCreateModal = false;
	}

	// Add Shows to List Modal State
	let activeListForAdd = $state<UserList | null>(null);

	async function toggleShowInList(listId: number, show: TrackedShow) {
		const existing = userListItems.find(
			(item) => item.listId === listId && item.tvmazeId === show.tvmazeId
		);
		if (existing && existing.id) {
			await tracker.removeFromList(existing.id);
		} else {
			await tracker.addToList(listId, {
				tvmazeId: show.tvmazeId,
				name: show.name,
				poster: show.poster
			});
		}
	}

	// Share Link Modal State
	let activeShareList = $state<{ list: UserList; items: UserListItem[] } | null>(null);
	let copiedLink = $state(false);

	function openShareModal(list: UserList) {
		const items = userListItems.filter((i) => i.listId === list.id);
		activeShareList = { list, items };
		copiedLink = false;
	}

	function copyShareLink() {
		if (!activeShareList) return;
		const url = `${window.location.origin}/?list=${activeShareList.list.id}`;
		navigator.clipboard.writeText(url);
		copiedLink = true;
		setTimeout(() => (copiedLink = false), 2000);
	}
</script>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg sm:text-xl font-black text-stone-900 font-heading tracking-tight">
				Custom Lists ({userLists.length})
			</h2>
			<p class="text-[11px] sm:text-xs text-stone-500 font-medium">
				Create curated collections to share with friends or organize themed watches.
			</p>
		</div>

		<button
			onclick={() => (showCreateModal = true)}
			class="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all shrink-0"
		>
			<ListPlus class="h-4 w-4 text-stone-950" />
			<span>Create List</span>
		</button>
	</div>

	<!-- Custom Lists Grid -->
	{#if userLists.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each userLists as list}
				{@const items = userListItems.filter((item) => item.listId === list.id)}
				<div class="glass-card rounded-2xl p-5 bg-white border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
					<div>
						<div class="flex items-start justify-between gap-2">
							<div>
								<h3 class="text-base font-extrabold text-stone-900 font-heading">{list.name}</h3>
								{#if list.description}
									<p class="text-xs text-stone-600 mt-0.5">{list.description}</p>
								{/if}
							</div>
							<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900 border border-amber-300 shrink-0">
								{items.length} Shows
							</span>
						</div>

						<!-- List Shows Preview Posters -->
						<div class="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
							{#each items as item}
								<div class="relative h-20 w-14 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 group/poster">
									<img src={item.poster || '/placeholder.png'} alt={item.showName} class="h-full w-full object-cover" />
									<button
										onclick={() => item.id && tracker.removeFromList(item.id)}
										class="absolute inset-0 bg-stone-950/70 text-white flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity"
										title="Remove from List"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{:else}
								<p class="text-xs text-stone-400 py-3 italic">No shows added yet to this list.</p>
							{/each}
						</div>
					</div>

					<!-- List Actions -->
					<div class="flex items-center justify-between border-t border-stone-100 pt-3">
						<div class="flex items-center gap-2">
							<button
								onclick={() => (activeListForAdd = list)}
								class="flex min-h-10 items-center gap-1.5 rounded-xl bg-stone-100 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors"
							>
								<Plus class="h-4 w-4" />
								<span>Add Shows</span>
							</button>

							<button
								onclick={() => openShareModal(list)}
								class="flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-xs font-extrabold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
							>
								<Share2 class="h-4 w-4 text-amber-800" />
								<span>Share List</span>
							</button>
						</div>

						<button
							onclick={() => list.id && tracker.deleteList(list.id)}
							class="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
							title="Delete List"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="glass-panel rounded-2xl p-6 sm:p-10 text-center bg-white border border-stone-200 max-w-xl mx-auto my-6 shadow-sm">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 mb-4">
				<ListPlus class="h-8 w-8" />
			</div>
			<h3 class="text-lg font-extrabold text-stone-900 font-heading">No custom lists created yet</h3>
			<p class="text-xs text-stone-500 mt-1 font-medium leading-relaxed">
				Create custom lists to group your favorite series, plan weekend binges, or share recommendations with friends!
			</p>
			<button
				onclick={() => (showCreateModal = true)}
				class="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 text-xs font-black text-stone-950 shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all"
			>
				<Plus class="h-4 w-4 text-stone-950" />
				<span>Create First List</span>
			</button>
		</div>
	{/if}
</div>

<!-- Create List Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
		<div class="glass-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 space-y-4">
			<h3 class="text-base font-extrabold text-stone-900 font-heading">Create New Custom List</h3>
			
			<div class="space-y-3">
				<div>
					<label for="list-name" class="block text-xs font-bold text-stone-700 mb-1">List Name</label>
					<input
						id="list-name"
						type="text"
						placeholder="e.g. Top Sci-Fi 2026, Weekend Binge..."
						bind:value={newListName}
						class="w-full rounded-xl bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 border border-stone-300 focus:border-amber-500 focus:outline-none min-h-11"
					/>
				</div>

				<div>
					<label for="list-desc" class="block text-xs font-bold text-stone-700 mb-1">Description (Optional)</label>
					<textarea
						id="list-desc"
						placeholder="Add a brief theme or recommendation note..."
						rows="2"
						bind:value={newListDescription}
						class="w-full rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs text-stone-900 border border-stone-300 focus:border-amber-500 focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				<button
					onclick={() => (showCreateModal = false)}
					class="flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleCreateList}
					class="flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
				>
					Create List
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Shows to List Modal -->
{#if activeListForAdd && activeListForAdd.id}
	{@const currentListId = activeListForAdd.id}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
		<div class="glass-panel relative flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-5 space-y-4">
			<div class="flex items-center justify-between border-b border-stone-200 pb-3">
				<div>
					<h3 class="text-base font-extrabold text-stone-900 font-heading">Add Shows to "{activeListForAdd.name}"</h3>
					<p class="text-xs text-stone-500">Tap shows in your library to toggle inclusion</p>
				</div>
				<button onclick={() => (activeListForAdd = null)} class="flex h-11 w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 transition-colors" title="Close">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto space-y-2 pr-1">
				{#each trackedShows as show}
					{@const isInList = userListItems.some(
						(i) => i.listId === currentListId && i.tvmazeId === show.tvmazeId
					)}
					<div class="flex items-center justify-between rounded-xl bg-stone-50 p-2.5 border border-stone-200">
						<div class="flex items-center gap-3">
							<img src={show.poster || '/placeholder.png'} alt={show.name} class="h-10 w-8 rounded object-cover" />
							<div>
								<h4 class="text-xs font-bold text-stone-900">{show.name}</h4>
								<p class="text-[10px] text-stone-500">{(show.genres || []).slice(0, 2).join(', ')}</p>
							</div>
						</div>

						<button
							onclick={() => toggleShowInList(currentListId, show)}
							class={`flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
								isInList
									? 'bg-amber-500 text-stone-950 shadow-sm'
									: 'bg-stone-200 text-stone-700 hover:bg-stone-300'
							}`}
						>
							{#if isInList}
								<Check class="h-3.5 w-3.5 stroke-[3]" /> Added
							{:else}
								<Plus class="h-3.5 w-3.5" /> Add
							{/if}
						</button>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- Share List Link Modal -->
{#if activeShareList}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
		<div class="glass-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-stone-200 pb-3">
				<div class="flex items-center gap-2">
					<Share2 class="h-5 w-5 text-amber-700" />
					<h3 class="text-base font-extrabold text-stone-900 font-heading">Share "{activeShareList.list.name}"</h3>
				</div>
				<button onclick={() => (activeShareList = null)} class="flex h-11 w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 transition-colors" title="Close">
					<X class="h-5 w-5" />
				</button>
			</div>

			<p class="text-xs text-stone-600">
				Anyone with this link can view your list and 1-click import all {activeShareList.items.length} shows into their personal watchlist!
			</p>

			<div class="rounded-2xl bg-amber-50 p-3 border border-amber-200 flex items-center justify-between gap-2">
				<span class="text-xs font-bold text-amber-900 truncate">
					{typeof window !== 'undefined' ? `${window.location.origin}/?list=${activeShareList.list.id}` : ''}
				</span>
				<button
					onclick={copyShareLink}
					class="flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-stone-950 shadow-sm hover:bg-amber-400 shrink-0 transition-colors"
				>
					{#if copiedLink}
						<Check class="h-3.5 w-3.5 stroke-[3]" /> Copied!
					{:else}
						<Copy class="h-3.5 w-3.5" /> Copy Link
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
