import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { TrackedShow, WatchedEpisode } from '$lib/db';
import { db } from '$lib/db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://demo-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhY2Nlc3NfdG9rZW4iOiJkZW1vLWtleSJ9';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (typeof window === 'undefined') return null;
	if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('demo-project')) {
		return null;
	}
	if (!_supabase) {
		_supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				persistSession: true
			}
		});
	}
	return _supabase;
}

export async function getCurrentUser(): Promise<User | null> {
	const client = getSupabase();
	if (!client) return null;
	const { data } = await client.auth.getSession();
	return data?.session?.user ?? null;
}

export async function signUpWithEmail(email: string, pass: string) {
	const client = getSupabase();
	if (!client) return { error: { message: 'Client unavailable' } };
	return await client.auth.signUp({ email, password: pass });
}

export async function signInWithEmail(email: string, pass: string) {
	const client = getSupabase();
	if (!client) return { error: { message: 'Client unavailable' } };
	return await client.auth.signInWithPassword({ email, password: pass });
}

export async function signInWithOAuth(provider: 'google' | 'github') {
	const client = getSupabase();
	if (!client) return { error: { message: 'Client unavailable' } };
	return await client.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
		}
	});
}

export async function signOutUser(user?: User | null) {
	console.log('signOutUser called');
	const client = getSupabase();
	console.log('client:', !!client);
	if (!client) return;

	// auth.signOut fires in background — don't await it
	client.auth.signOut().catch((err) => console.warn('auth.signOut failed:', err));

	// Clear localStorage tokens immediately
	if (typeof window !== 'undefined') {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
				localStorage.removeItem(key);
			}
		}
	}

	// Wipe local DB and reload immediately — optimistic
	await Promise.all([
		db.shows.clear(),
		db.watchedEpisodes.clear(),
		db.userLists.clear(),
		db.userListItems.clear()
	]);

	console.log('DB wiped. Reloading.');
	if (typeof window !== 'undefined') {
		window.location.reload();
	}
}

// Upload local IndexedDB shows and watched episodes to Supabase Cloud
export async function syncLocalDexieToSupabase(user: User) {
	const client = getSupabase();
	if (!client) throw new Error('Supabase client unavailable');

	// 1. Shows
	const newShows = await db.shows.filter((s) => s._syncStatus === 'new').toArray();
	if (newShows.length > 0) {
		const showsToUpsert = newShows.map((s) => ({
			user_id: user.id,
			tvmaze_id: s.tvmazeId,
			name: s.name,
			poster: s.poster || null,
			status: s.status,
			rating: s.rating || null,
			user_rating: s.userRating ?? null,
			user_review: s.userReview || null,
			genres: s.genres || [],
			network: s.network || null,
			added_at: s.addedAt ? s.addedAt.toISOString() : new Date().toISOString()
		}));
		const { error } = await client.from('user_shows').upsert(showsToUpsert, { onConflict: 'user_id,tvmaze_id' });
		if (!error) {
			const updates = newShows.map((s) => ({ key: s.tvmazeId, changes: { _syncStatus: 'synced' as const } }));
			await db.shows.bulkUpdate(updates);
		} else {
			console.error('Supabase user_shows upsert error:', error.message);
		}
	}

	const deletedShows = await db.shows.filter((s) => s._syncStatus === 'deleted').toArray();
	if (deletedShows.length > 0) {
		const ids = deletedShows.map((s) => s.tvmazeId);
		const { error } = await client.from('user_shows').delete().eq('user_id', user.id).in('tvmaze_id', ids);
		if (!error) await db.shows.bulkDelete(ids);
	}

	// 2. Watched Episodes
	const newEps = await db.watchedEpisodes.filter((e) => e._syncStatus === 'new').toArray();
	if (newEps.length > 0) {
		const epToUpsert = newEps.map((e) => ({
			user_id: user.id,
			tvmaze_show_id: e.tvmazeShowId,
			tvmaze_episode_id: e.tvmazeEpisodeId,
			season: e.season,
			episode_number: e.episodeNumber,
			watched_at: e.watchedAt ? e.watchedAt.toISOString() : new Date().toISOString()
		}));
		const { error } = await client.from('user_watched_episodes').upsert(epToUpsert, { onConflict: 'user_id,tvmaze_show_id,tvmaze_episode_id' });
		if (!error) {
			const updates = newEps.filter((e) => e.id).map((e) => ({ key: e.id!, changes: { _syncStatus: 'synced' as const } }));
			await db.watchedEpisodes.bulkUpdate(updates);
		} else {
			console.error('Supabase user_watched_episodes upsert error:', error.message);
		}
	}

	const deletedEps = await db.watchedEpisodes.filter((e) => e._syncStatus === 'deleted').toArray();
	if (deletedEps.length > 0) {
		// Batch by show — one network call per show instead of one per episode
		const byShow = new Map<number, typeof deletedEps>();
		for (const ep of deletedEps) {
			if (!byShow.has(ep.tvmazeShowId)) byShow.set(ep.tvmazeShowId, []);
			byShow.get(ep.tvmazeShowId)!.push(ep);
		}
		for (const [showId, eps] of byShow) {
			const epIds = eps.map((e) => e.tvmazeEpisodeId);
			const { error } = await client
				.from('user_watched_episodes')
				.delete()
				.eq('user_id', user.id)
				.eq('tvmaze_show_id', showId)
				.in('tvmaze_episode_id', epIds);
			if (!error) {
				const localIds = eps.filter((e) => e.id).map((e) => e.id!);
				if (localIds.length) await db.watchedEpisodes.bulkDelete(localIds);
			}
		}
	}

	// 3. Custom Lists
	const newLists = await db.userLists.filter((l) => l._syncStatus === 'new').toArray();
	for (const list of newLists) {
		const { data, error } = await client.from('user_lists').insert({
			user_id: user.id,
			name: list.name,
			description: list.description || null,
			is_public: list.isPublic ?? true,
			created_at: list.createdAt ? list.createdAt.toISOString() : new Date().toISOString()
		}).select('id').single();
		
		if (!error && data && list.id) {
			const oldId = list.id;
			const newId = data.id;
			await db.userLists.delete(oldId);
			await db.userLists.add({ ...list, id: newId, _syncStatus: 'synced' });
			await db.userListItems.where({ listId: oldId }).modify({ listId: newId });
		}
	}

	const deletedLists = await db.userLists.filter((l) => l._syncStatus === 'deleted').toArray();
	if (deletedLists.length > 0) {
		const ids = deletedLists.map((l) => l.id!).filter(Boolean);
		if (ids.length > 0) {
			const { error } = await client.from('user_lists').delete().eq('user_id', user.id).in('id', ids);
			if (!error) await db.userLists.bulkDelete(ids);
		}
	}

	// 4. Custom List Items
	const newItems = await db.userListItems.filter((i) => i._syncStatus === 'new').toArray();
	if (newItems.length > 0) {
		const itemsToUpsert = newItems.map((i) => ({
			user_id: user.id,
			list_id: i.listId,
			tvmaze_id: i.tvmazeId,
			show_name: i.showName,
			poster: i.poster || null,
			added_at: i.addedAt ? i.addedAt.toISOString() : new Date().toISOString()
		}));
		const { error } = await client.from('user_list_items').upsert(itemsToUpsert, { onConflict: 'user_id,list_id,tvmaze_id' });
		if (!error) {
			const updates = newItems.filter((i) => i.id).map((i) => ({ key: i.id!, changes: { _syncStatus: 'synced' as const } }));
			await db.userListItems.bulkUpdate(updates);
		}
	}

	const deletedItems = await db.userListItems.filter((i) => i._syncStatus === 'deleted').toArray();
	if (deletedItems.length > 0) {
		const itemsByList = new Map<number, typeof deletedItems>();
		for (const item of deletedItems) {
			if (!itemsByList.has(item.listId)) itemsByList.set(item.listId, []);
			itemsByList.get(item.listId)!.push(item);
		}
		for (const [listId, items] of itemsByList) {
			const tvmazeIds = items.map((i) => i.tvmazeId);
			const { error } = await client
				.from('user_list_items')
				.delete()
				.eq('user_id', user.id)
				.eq('list_id', listId)
				.in('tvmaze_id', tvmazeIds);
			if (!error) {
				const localIds = items.filter((i) => i.id).map((i) => i.id!);
				if (localIds.length) await db.userListItems.bulkDelete(localIds);
			}
		}
	}
}

// Download cloud shows and watched episodes from Supabase to local IndexedDB
export async function fetchSupabaseToDexie(user: User) {
	const client = getSupabase();
	if (!client) throw new Error('Supabase client unavailable');

	let showsCount = 0;
	let episodesCount = 0;

	// Fetch Cloud Shows
	const { data: cloudShows, error: showErr } = await client.from('user_shows').select('*').eq('user_id', user.id);
	if (showErr) throw new Error(`Fetch user_shows failed: ${showErr.message}`);

	const cloudShowIds = new Set(cloudShows?.map((s) => s.tvmaze_id) || []);

	if (cloudShows) {
		showsCount = cloudShows.length;
		for (const cs of cloudShows) {
			const existing = await db.shows.get(cs.tvmaze_id);
			if (!existing || existing._syncStatus === 'synced') {
				await db.shows.put({
					tvmazeId: cs.tvmaze_id,
					name: cs.name,
					poster: cs.poster,
					status: cs.status,
					rating: cs.rating,
					userRating: cs.user_rating ?? undefined,
					userReview: cs.user_review ?? undefined,
					genres: cs.genres || [],
					network: cs.network,
					addedAt: new Date(cs.added_at),
					_syncStatus: 'synced'
				});
			}
		}
	}

	const localSyncedShows = await db.shows.filter((s) => s._syncStatus === 'synced').toArray();
	for (const ls of localSyncedShows) {
		if (!cloudShowIds.has(ls.tvmazeId)) {
			await db.shows.delete(ls.tvmazeId);
		}
	}

	// Fetch Cloud Episodes
	const { data: cloudEps, error: epErr } = await client.from('user_watched_episodes').select('*').eq('user_id', user.id);
	if (epErr) throw new Error(`Fetch user_watched_episodes failed: ${epErr.message}`);

	const cloudEpKeys = new Set(cloudEps?.map((e) => `${e.tvmaze_show_id}-${e.tvmaze_episode_id}`) || []);

	if (cloudEps) {
		episodesCount = cloudEps.length;
		for (const ce of cloudEps) {
			const existing = await db.watchedEpisodes
				.where('[tvmazeShowId+tvmazeEpisodeId]')
				.equals([ce.tvmaze_show_id, ce.tvmaze_episode_id])
				.first();

			if (!existing || existing._syncStatus === 'synced') {
				if (existing && existing.id) {
					await db.watchedEpisodes.update(existing.id, {
						watchedAt: new Date(ce.watched_at),
						_syncStatus: 'synced'
					});
				} else {
					await db.watchedEpisodes.add({
						tvmazeShowId: ce.tvmaze_show_id,
						tvmazeEpisodeId: ce.tvmaze_episode_id,
						season: ce.season,
						episodeNumber: ce.episode_number,
						watchedAt: new Date(ce.watched_at),
						_syncStatus: 'synced'
					});
				}
			}
		}
	}

	const localSyncedEps = await db.watchedEpisodes.filter((e) => e._syncStatus === 'synced').toArray();
	for (const le of localSyncedEps) {
		if (!cloudEpKeys.has(`${le.tvmazeShowId}-${le.tvmazeEpisodeId}`) && le.id) {
			await db.watchedEpisodes.delete(le.id);
		}
	}

	// Fetch Cloud Lists
	const { data: cloudLists } = await client.from('user_lists').select('*').eq('user_id', user.id);
	const cloudListIds = new Set(cloudLists?.map((l) => l.id) || []);
	
	if (cloudLists) {
		for (const cl of cloudLists) {
			const existing = await db.userLists.get(cl.id);
			if (!existing || existing._syncStatus === 'synced') {
				await db.userLists.put({
					id: cl.id,
					name: cl.name,
					description: cl.description ?? undefined,
					isPublic: cl.is_public,
					createdAt: new Date(cl.created_at),
					_syncStatus: 'synced'
				});
			}
		}
	}
	
	const localSyncedLists = await db.userLists.filter((l) => l._syncStatus === 'synced').toArray();
	for (const ll of localSyncedLists) {
		if (ll.id && !cloudListIds.has(ll.id)) {
			await db.userLists.delete(ll.id);
		}
	}

	// Fetch Cloud List Items
	const { data: cloudItems } = await client.from('user_list_items').select('*').eq('user_id', user.id);
	const cloudItemKeys = new Set(cloudItems?.map((i) => `${i.list_id}-${i.tvmaze_id}`) || []);
	
	if (cloudItems) {
		for (const ci of cloudItems) {
			const existing = await db.userListItems
				.where('[listId+tvmazeId]')
				.equals([ci.list_id, ci.tvmaze_id])
				.first();

			if (!existing || existing._syncStatus === 'synced') {
				if (existing && existing.id) {
					await db.userListItems.update(existing.id, { _syncStatus: 'synced' });
				} else {
					await db.userListItems.add({
						listId: ci.list_id,
						tvmazeId: ci.tvmaze_id,
						showName: ci.show_name,
						poster: ci.poster ?? undefined,
						addedAt: new Date(ci.added_at),
						_syncStatus: 'synced'
					});
				}
			}
		}
	}
	
	const localSyncedItems = await db.userListItems.filter((i) => i._syncStatus === 'synced').toArray();
	for (const li of localSyncedItems) {
		if (li.id && !cloudItemKeys.has(`${li.listId}-${li.tvmazeId}`)) {
			await db.userListItems.delete(li.id);
		}
	}

	return { showsCount, episodesCount };
}

// Full 2-Way Sync helper (Upload local additions -> Download & merge cloud master)
export async function performFullSync(user: User) {
	await syncLocalDexieToSupabase(user);
	const stats = await fetchSupabaseToDexie(user);
	return stats;
}

// Auto sync helper triggered on store mutations
// Accepts an optional user to skip getSession() and prevent deadlocks
let _syncInProgress = false;
export async function triggerAutoSync(user?: User | null) {
	if (_syncInProgress) return; // debounce concurrent calls
	_syncInProgress = true;
	try {
		const resolvedUser = user ?? await getCurrentUser();
		if (resolvedUser) {
			await syncLocalDexieToSupabase(resolvedUser);
		}
	} catch (err) {
		console.warn('Auto sync warning:', err);
	} finally {
		_syncInProgress = false;
	}
}
