import { db, type TrackedShow, type UserList, type UserListItem } from '$lib/db';
import type { TVMazeShow, TVMazeEpisode } from '$lib/services/tvmaze';
import { searchShows } from '$lib/services/tvmaze';
import { triggerAutoSync, getCurrentUser, removeShowFromSupabase } from '$lib/supabase';

export type SortOption = 'last_watched' | 'user_rating' | 'progress' | 'title' | 'year';

class TrackerStore {
	antiSpoilerMode = $state<boolean>(true);
	selectedShowIdForModal = $state<number | null>(null);
	activeTab = $state<string>('watching'); // 'watching' | 'yet_to_watch' | 'lists' | 'stats' | 'discover'
	searchResults = $state<TVMazeShow[]>([]);
	isSearching = $state<boolean>(false);
	searchQuery = $state<string>('');
	searchYear = $state<string>('');

	// Filter & Sort State
	sortBy = $state<SortOption>('last_watched');
	filterGenre = $state<string>('all');
	filterNetwork = $state<string>('all');

	constructor() {
		if (typeof window !== 'undefined' && window.localStorage) {
			const saved = localStorage.getItem('bingetrack_anti_spoiler');
			if (saved !== null) {
				this.antiSpoilerMode = saved === 'true';
			}
		}
	}

	toggleSpoilerMode() {
		this.antiSpoilerMode = !this.antiSpoilerMode;
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.setItem('bingetrack_anti_spoiler', String(this.antiSpoilerMode));
		}
	}

	async performSearch() {
		if (!this.searchQuery.trim()) {
			this.searchResults = [];
			return;
		}
		this.isSearching = true;
		try {
			this.searchResults = await searchShows(this.searchQuery, this.searchYear);
			this.activeTab = 'discover';
		} catch (err) {
			console.error(err);
		} finally {
			this.isSearching = false;
		}
	}

	openShowModal(tvmazeId: number) {
		this.selectedShowIdForModal = tvmazeId;
	}

	closeShowModal() {
		this.selectedShowIdForModal = null;
	}

	async markEpisodeWatched(tvmazeShowId: number, episode: { id: number; season: number; number: number }) {
		await db.watchedEpisodes.put({
			tvmazeShowId,
			tvmazeEpisodeId: episode.id,
			season: episode.season,
			episodeNumber: episode.number,
			watchedAt: new Date()
		});
		await triggerAutoSync();
	}

	async unmarkEpisode(tvmazeShowId: number, tvmazeEpisodeId: number) {
		await db.watchedEpisodes
			.where({ tvmazeShowId, tvmazeEpisodeId })
			.delete();
		await triggerAutoSync();
	}

	async markSeasonWatched(tvmazeShowId: number, episodes: TVMazeEpisode[]) {
		const records = episodes.map((ep) => ({
			tvmazeShowId,
			tvmazeEpisodeId: ep.id,
			season: ep.season,
			episodeNumber: ep.number,
			watchedAt: new Date()
		}));
		await db.watchedEpisodes.bulkPut(records);
		await triggerAutoSync();
	}

	async updateShowStatus(show: TrackedShow) {
		await db.shows.put(show);
		await triggerAutoSync();
	}

	async updateUserRating(tvmazeId: number, userRating: number, userReview?: string) {
		const show = await db.shows.get(tvmazeId);
		if (show) {
			await db.shows.update(tvmazeId, { userRating, userReview });
			await triggerAutoSync();
		}
	}

	async removeShow(tvmazeShowId: number) {
		await db.shows.delete(tvmazeShowId);
		await db.watchedEpisodes.where({ tvmazeShowId }).delete();
		const user = await getCurrentUser();
		if (user) {
			await removeShowFromSupabase(user, tvmazeShowId);
		}
	}

	// Custom List Management
	async createCustomList(name: string, description?: string) {
		return await db.userLists.add({
			name,
			description,
			isPublic: true,
			createdAt: new Date()
		});
	}

	async addToList(listId: number, show: { tvmazeId: number; name: string; poster?: string }) {
		const existing = await db.userListItems
			.where('[listId+tvmazeId]')
			.equals([listId, show.tvmazeId])
			.first();

		if (!existing) {
			await db.userListItems.add({
				listId,
				tvmazeId: show.tvmazeId,
				showName: show.name,
				poster: show.poster,
				addedAt: new Date()
			});
		}
	}

	async removeFromList(itemId: number) {
		await db.userListItems.delete(itemId);
	}

	async deleteList(listId: number) {
		await db.userLists.delete(listId);
		await db.userListItems.where({ listId }).delete();
	}
}

export const tracker = new TrackerStore();
