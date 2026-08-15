<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		onClose,
		title = '',
		children
	}: {
		onClose: () => void;
		title?: string;
		children: import('svelte').Snippet;
	} = $props();

	let sheetEl: HTMLDivElement;
	let dragY = $state(0);
	let isDragging = $state(false);
	let startY = 0;

	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		startY = e.clientY;
		sheetEl.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		dragY = Math.max(0, e.clientY - startY);
	}

	function onPointerUp() {
		isDragging = false;
		// If dragged more than 120px down, dismiss
		if (dragY > 120) {
			onClose();
		} else {
			dragY = 0;
		}
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-stone-900/60 backdrop-blur-sm"
	onclick={onBackdropClick}
	style="animation: fadeIn 0.15s ease"
>
	<!-- Sheet / Dialog -->
	<div
		bind:this={sheetEl}
		class="relative flex flex-col bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl overflow-hidden border border-stone-200 shadow-2xl
		       sm:h-[85vh] max-h-[92vh]"
		style="transform: translateY({dragY}px); transition: {isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'}"
	>
		<!-- Drag handle (mobile only) -->
		<div
			class="sm:hidden flex-shrink-0 pt-3 pb-1 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
		>
			<div class="h-1 w-10 rounded-full bg-stone-300"></div>
		</div>

		<!-- Slot for full custom content -->
		{@render children()}
	</div>
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
