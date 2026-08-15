import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'development',
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			manifest: {
				name: 'BingeTrack - TV & Episode Tracker',
				short_name: 'BingeTrack',
				description: 'Personal TV tracker, pace planner, anti-spoiler shield, and hiatus radar',
				theme_color: '#0b0f19',
				background_color: '#0b0f19',
				display: 'standalone',
				icons: [
					{
						src: '/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\.tvmaze\.com\/.*/i,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'tvmaze-api-cache',
							expiration: {
								maxEntries: 300,
								maxAgeSeconds: 60 * 60 * 24 // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/static\.tvmaze\.com\/uploads\/images\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'tvmaze-image-cache',
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			}
		})
	]
});
