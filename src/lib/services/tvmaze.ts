import type { TrackedShow, WatchedEpisode } from '$lib/db';

export interface TVMazeEpisode {
	id: number;
	name: string;
	season: number;
	number: number;
	airdate: string;
	runtime?: number;
	image?: { medium: string; original?: string };
	summary?: string;
}

export interface TVMazeShow {
	id: number;
	name: string;
	genres: string[];
	status: string;
	runtime?: number;
	averageRuntime?: number;
	premiered?: string;
	rating: { average: number | null };
	image?: { medium?: string; original?: string };
	summary?: string;
	network?: { name: string };
	webChannel?: { name: string };
	_embedded?: {
		episodes?: TVMazeEpisode[];
		nextepisode?: TVMazeEpisode;
		cast?: Array<{ person: { name: string } }>;
	};
}

export function formatLongDate(dateString?: string): string {
	if (!dateString) return 'TBA';
	const parts = dateString.split('-');
	if (parts.length === 3) {
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const date = new Date(year, month, day);
		if (!isNaN(date.getTime())) {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		}
	}
	return dateString;
}

export function getDaysUntil(dateString?: string): number | null {
	if (!dateString) return null;
	const parts = dateString.split('-');
	if (parts.length === 3) {
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const targetDate = new Date(year, month, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diffMs = targetDate.getTime() - today.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	}
	return null;
}

const BASE_URL = 'https://api.tvmaze.com';

// 1. Search shows with title query and optional release year filter
export async function searchShows(query: string, year?: string): Promise<TVMazeShow[]> {
	if (!query.trim()) return [];
	const res = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
	if (!res.ok) throw new Error('Failed to search shows');
	const data: Array<{ show: TVMazeShow }> = await res.json();
	let results = data.map((item) => item.show);

	if (year && year.trim()) {
		results = results.filter((s) => s.premiered && s.premiered.startsWith(year.trim()));
	}

	return results.sort((a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0));
}

// 2. Fetch full show details with embedded episodes, next episode, and cast
export async function getShowDetails(id: number): Promise<TVMazeShow> {
	const res = await fetch(
		`${BASE_URL}/shows/${id}?embed[]=episodes&embed[]=nextepisode&embed[]=cast`
	);
	if (!res.ok) throw new Error(`Show with ID ${id} not found`);
	return res.json();
}

// 3. Fetch top popular shows for discovery
export async function getPopularShows(): Promise<TVMazeShow[]> {
	try {
		const res = await fetch(`${BASE_URL}/shows?page=0`);
		if (!res.ok) return [];
		const shows: TVMazeShow[] = await res.json();
		return shows
			.filter((s) => (s.rating?.average ?? 0) >= 8.0 && s.image?.medium)
			.slice(0, 15);
	} catch {
		return [];
	}
}

// 4. Jaccard similarity recommendation engine
export function calculateSimilarity(
	source: { genres: string[]; network?: string },
	candidate: TVMazeShow
): number {
	let score = 0;

	// 1. 50% Weight: Genre Jaccard Similarity
	const sourceGenres = source.genres || [];
	const candidateGenres = candidate.genres || [];
	const sharedGenres = candidateGenres.filter((g) => sourceGenres.includes(g));
	const totalGenres = new Set([...sourceGenres, ...candidateGenres]);

	if (totalGenres.size > 0) {
		score += (sharedGenres.length / totalGenres.size) * 50;
	}

	// 2. 30% Weight: Distribution Network / Streaming Platform match
	const candidateDistributor = candidate.network?.name || candidate.webChannel?.name;
	if (source.network && candidateDistributor && source.network === candidateDistributor) {
		score += 30;
	}

	// 3. 20% Weight: Rating strength
	if (candidate.rating?.average) {
		score += (candidate.rating.average / 10) * 20;
	}

	return Math.round(score);
}

// 5. Portfolio Differentiator: Binge Pace Calculator
export interface BingePaceResult {
	daysRemaining: number;
	episodesPerDay: number;
	minutesPerDay: number;
	formattedPlan: string;
}

export function calculateBingePace(
	unwatchedEpisodesCount: number,
	targetDateString: string,
	avgRuntimeMinutes: number = 45
): BingePaceResult | null {
	if (unwatchedEpisodesCount <= 0 || !targetDateString) return null;
	const targetDate = new Date(targetDateString);
	const today = new Date();
	const diffTime = targetDate.getTime() - today.getTime();
	const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

	const episodesPerDay = parseFloat((unwatchedEpisodesCount / diffDays).toFixed(1));
	const minutesPerDay = Math.round((unwatchedEpisodesCount * avgRuntimeMinutes) / diffDays);

	return {
		daysRemaining: diffDays,
		episodesPerDay,
		minutesPerDay,
		formattedPlan: `Watch ${episodesPerDay} eps/day (~${minutesPerDay} mins/day) to catch up by ${formatLongDate(targetDateString)}`
	};
}

// 6. Portfolio Differentiator: Lifetime Watch Stats ("TV Wrapped")
export interface LifetimeStats {
	totalWatchedEpisodes: number;
	totalMinutes: number;
	days: number;
	hours: number;
	minutes: number;
	formattedDuration: string;
	topGenres: Array<{ name: string; count: number; percentage: number }>;
	networkAffinity: Array<{ name: string; count: number }>;
	totalShowsTracked: number;
	watchingCount: number;
	backlogCount: number;
	completedCount: number;
}

export function calculateLifetimeStats(
	trackedShows: TrackedShow[],
	watchedEpisodes: WatchedEpisode[]
): LifetimeStats {
	const totalWatchedEpisodes = watchedEpisodes.length;

	// Build map of show tvmazeId -> TrackedShow for runtime and genre lookup
	const showMap = new Map<number, TrackedShow>();
	trackedShows.forEach((s) => showMap.set(s.tvmazeId, s));

	let totalMinutes = 0;
	const genreCounts: Record<string, number> = {};
	const networkCounts: Record<string, number> = {};

	watchedEpisodes.forEach((ep) => {
		const show = showMap.get(ep.tvmazeShowId);
		const runtime = show?.averageRuntime || show?.runtime || 45;
		totalMinutes += runtime;

		if (show) {
			show.genres.forEach((g) => {
				genreCounts[g] = (genreCounts[g] || 0) + 1;
			});
			if (show.network) {
				networkCounts[show.network] = (networkCounts[show.network] || 0) + 1;
			}
		}
	});

	const days = Math.floor(totalMinutes / (24 * 60));
	const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
	const minutes = totalMinutes % 60;

	const formattedDuration = `${days}d ${hours}h ${minutes}m`;

	// Top genres sorted by count
	const genreTotalCount = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
	const topGenres = Object.entries(genreCounts)
		.map(([name, count]) => ({
			name,
			count,
			percentage: Math.round((count / genreTotalCount) * 100)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	// Network affinity
	const networkAffinity = Object.entries(networkCounts)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	const watchingCount = trackedShows.filter((s) => s.status === 'watching').length;
	const backlogCount = trackedShows.filter((s) => s.status === 'yet_to_watch').length;
	const completedCount = trackedShows.filter((s) => s.status === 'completed').length;

	return {
		totalWatchedEpisodes,
		totalMinutes,
		days,
		hours,
		minutes,
		formattedDuration,
		topGenres,
		networkAffinity,
		totalShowsTracked: trackedShows.length,
		watchingCount,
		backlogCount,
		completedCount
	};
}
