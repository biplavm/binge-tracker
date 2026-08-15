<script lang="ts">
	import { WifiOff } from '@lucide/svelte';

	let isOffline = $state<boolean>(false);

	if (typeof window !== 'undefined') {
		isOffline = !navigator.onLine;
		window.addEventListener('offline', () => (isOffline = true));
		window.addEventListener('online', () => (isOffline = false));
	}
</script>

{#if isOffline}
	<div class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-amber-500 text-stone-950 px-4 py-3 backdrop-blur-md shadow-xl flex items-center gap-3 border border-amber-300 font-bold animate-bounce">
		<WifiOff class="h-5 w-5 shrink-0 text-stone-950" />
		<div>
			<h4 class="text-xs font-black font-heading">Working Offline</h4>
			<p class="text-[11px] text-stone-900 font-medium leading-tight">
				BingeTrack is running local-first using IndexedDB. Changes are saved locally!
			</p>
		</div>
	</div>
{/if}
