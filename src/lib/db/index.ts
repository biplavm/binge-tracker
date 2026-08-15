import Dexie, { type Table } from 'dexie';

export interface TrackedShow {
	tvmazeId: number;
	name: string;
	poster?: string;
	status: 'watching' | 'yet_to_watch' | 'completed' | 'dropped';
	rating?: number;
	runtime?: number;
	averageRuntime?: number;
	addedAt: Date;
	genres: string[];
	network?: string;
	summary?: string;
}

export interface WatchedEpisode {
	id?: number;
	tvmazeShowId: number;
	tvmazeEpisodeId: number;
	season: number;
	episodeNumber: number;
	watchedAt: Date;
}

class TrackerDatabase extends Dexie {
	shows!: Table<TrackedShow, number>;
	watchedEpisodes!: Table<WatchedEpisode, number>;

	constructor() {
		super('BingeTrackDB');
		this.version(1).stores({
			shows: 'tvmazeId, status, addedAt',
			watchedEpisodes: '++id, tvmazeShowId, tvmazeEpisodeId, [tvmazeShowId+tvmazeEpisodeId]'
		});
	}
}

export const db = new TrackerDatabase();
