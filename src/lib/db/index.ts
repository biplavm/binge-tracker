import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'new' | 'synced' | 'deleted';

export interface TrackedShow {
	tvmazeId: number;
	name: string;
	poster?: string;
	status: 'watching' | 'yet_to_watch' | 'completed' | 'dropped';
	rating?: number;
	userRating?: number; // Personal 1-10 star score
	userReview?: string; // Optional personal notes
	runtime?: number;
	averageRuntime?: number;
	addedAt: Date;
	genres: string[];
	network?: string;
	summary?: string;
	_syncStatus?: SyncStatus;
}

export interface WatchedEpisode {
	id?: number;
	tvmazeShowId: number;
	tvmazeEpisodeId: number;
	season: number;
	episodeNumber: number;
	watchedAt: Date;
	_syncStatus?: SyncStatus;
}

export interface UserList {
	id?: number;
	name: string;
	description?: string;
	isPublic?: boolean;
	createdAt: Date;
	_syncStatus?: SyncStatus;
}

export interface UserListItem {
	id?: number;
	listId: number;
	tvmazeId: number;
	showName: string;
	poster?: string;
	addedAt: Date;
	_syncStatus?: SyncStatus;
}

class TrackerDatabase extends Dexie {
	shows!: Table<TrackedShow, number>;
	watchedEpisodes!: Table<WatchedEpisode, number>;
	userLists!: Table<UserList, number>;
	userListItems!: Table<UserListItem, number>;

	constructor() {
		super('BingeTrackDB');
		this.version(3).stores({
			shows: 'tvmazeId, status, addedAt, userRating, _syncStatus',
			watchedEpisodes: '++id, tvmazeShowId, tvmazeEpisodeId, [tvmazeShowId+tvmazeEpisodeId], _syncStatus',
			userLists: '++id, name, createdAt, _syncStatus',
			userListItems: '++id, listId, tvmazeId, [listId+tvmazeId], _syncStatus'
		});
	}
}

export const db = new TrackerDatabase();
