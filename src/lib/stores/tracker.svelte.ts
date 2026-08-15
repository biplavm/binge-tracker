import { db, type TrackedShow } from '$lib/db';
import type { TVMazeShow, TVMazeEpisode } from '$lib/services/tvmaze';
import { searchShows } from '$lib/services/tvmaze';

class TrackerStore {
	antiSpoilerMode = $state<boolean>(true);
	selectedShowIdForModal = $state<number | null>(null);
	activeTab = $state<string>('watching');
	searchResults = $state<TVMazeShow[]>([]);
	isSearching = $state<boolean>(false);
	searchQuery = $state<string>('');
	searchYear = $state<string>('');

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
	}

	async unmarkEpisode(tvmazeShowId: number, tvmazeEpisodeId: number) {
		await db.watchedEpisodes
			.where({ tvmazeShowId, tvmazeEpisodeId })
			.delete();
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
	}

	async updateShowStatus(show: TrackedShow) {
		await db.shows.put(show);
	}

	async removeShow(tvmazeShowId: number) {
		await db.shows.delete(tvmazeShowId);
		await db.watchedEpisodes.where({ tvmazeShowId }).delete();
	}
}

export const tracker = new TrackerStore();
