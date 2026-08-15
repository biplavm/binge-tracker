import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { TrackedShow, WatchedEpisode } from '$lib/db';
import { db } from '$lib/db';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://demo-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhY2Nlc3NfdG9rZW4iOiJkZW1vLWtleSJ9';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
	if (typeof window === 'undefined') return null;
	if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('demo-project')) {
		console.warn('Supabase URL not configured in .env (VITE_SUPABASE_URL)');
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

export async function signOutUser() {
	const client = getSupabase();
	if (!client) return;
	return await client.auth.signOut();
}

// Bi-directional Cloud Sync with local Dexie IndexedDB
export async function syncLocalDexieToSupabase(user: User) {
	const client = getSupabase();
	if (!client) return;

	try {
		const localShows = await db.shows.toArray();
		const localEpisodes = await db.watchedEpisodes.toArray();

		if (localShows.length > 0) {
			const showsToUpsert = localShows.map((s) => ({
				user_id: user.id,
				tvmaze_id: s.tvmazeId,
				name: s.name,
				poster: s.poster || null,
				status: s.status,
				rating: s.rating || null,
				user_rating: s.userRating || null,
				user_review: s.userReview || null,
				genres: s.genres || [],
				network: s.network || null
			}));

			await client.from('user_shows').upsert(showsToUpsert, { onConflict: 'user_id,tvmaze_id' });
		}

		if (localEpisodes.length > 0) {
			const epToUpsert = localEpisodes.map((e) => ({
				user_id: user.id,
				tvmaze_show_id: e.tvmazeShowId,
				tvmaze_episode_id: e.tvmazeEpisodeId,
				season: e.season,
				episode_number: e.episodeNumber
			}));

			await client
				.from('user_watched_episodes')
				.upsert(epToUpsert, { onConflict: 'user_id,tvmaze_show_id,tvmaze_episode_id' });
		}
	} catch (err) {
		console.warn('Supabase cloud sync notification:', err);
	}
}

export async function fetchSupabaseToDexie(user: User) {
	const client = getSupabase();
	if (!client) return;

	try {
		const { data: cloudShows } = await client
			.from('user_shows')
			.select('*')
			.eq('user_id', user.id);

		if (cloudShows && cloudShows.length > 0) {
			for (const cs of cloudShows) {
				const existing = await db.shows.get(cs.tvmaze_id);
				await db.shows.put({
					tvmazeId: cs.tvmaze_id,
					name: cs.name,
					poster: cs.poster,
					status: cs.status,
					rating: cs.rating,
					userRating: cs.user_rating || existing?.userRating,
					userReview: cs.user_review || existing?.userReview,
					genres: cs.genres || [],
					network: cs.network,
					addedAt: existing?.addedAt || new Date(cs.added_at)
				});
			}
		}

		const { data: cloudEps } = await client
			.from('user_watched_episodes')
			.select('*')
			.eq('user_id', user.id);

		if (cloudEps && cloudEps.length > 0) {
			for (const ce of cloudEps) {
				const existing = await db.watchedEpisodes
					.where('[tvmazeShowId+tvmazeEpisodeId]')
					.equals([ce.tvmaze_show_id, ce.tvmaze_episode_id])
					.first();

				if (!existing) {
					await db.watchedEpisodes.add({
						tvmazeShowId: ce.tvmaze_show_id,
						tvmazeEpisodeId: ce.tvmaze_episode_id,
						season: ce.season,
						episodeNumber: ce.episode_number,
						watchedAt: new Date(ce.watched_at)
					});
				}
			}
		}
	} catch (err) {
		console.warn('Fetch Supabase data notification:', err);
	}
}
