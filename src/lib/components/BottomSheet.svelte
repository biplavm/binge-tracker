<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		onClose,
		children
	}: {
		onClose: () => void;
		children: import('svelte').Snippet;
	} = $props();

	let sheetEl: HTMLDivElement;
	let handleEl: HTMLDivElement;

	// Drag state
	let dragY = $state(0);
	let isDragging = $state(false);
	let isClosing = $state(false);

	let startY = 0;
	let lastY = 0;
	let lastTime = 0;
	let velocity = 0; // px/ms

	// How much the backdrop fades as you drag (0 = full, 1 = transparent)
	const backdropOpacity = $derived(
		isDragging || dragY > 0
			? Math.max(0, 0.6 - dragY / 400)
			: isClosing
			? 0
			: 0.6
	);

	function startDrag(e: PointerEvent) {
		isDragging = true;
		startY = e.clientY;
		lastY = e.clientY;
		lastTime = performance.now();
		velocity = 0;
		handleEl.setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function moveDrag(e: PointerEvent) {
		if (!isDragging) return;
		const now = performance.now();
		const dt = now - lastTime;
		if (dt > 0) {
			velocity = (e.clientY - lastY) / dt; // px/ms
		}
		lastY = e.clientY;
		lastTime = now;
		dragY = Math.max(0, e.clientY - startY);
	}

	function endDrag() {
		if (!isDragging) return;
		isDragging = false;

		// Dismiss if dragged far enough OR flicked fast enough downward
		const shouldDismiss = dragY > 120 || velocity > 0.8;
		if (shouldDismiss) {
			dismiss();
		} else {
			// Spring back
			dragY = 0;
		}
	}

	function dismiss() {
		if (isClosing) return;
		isClosing = true;
		// Pop the history state we pushed — this is a no-op on desktop
		// but prevents back-button double-fire on mobile
		history.back();
		setTimeout(() => onClose(), 280);
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) dismiss();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}

	// Handle the Android/browser back button
	function onPopState() {
		if (!isClosing) {
			isClosing = true;
			setTimeout(() => onClose(), 280);
		}
	}

	onMount(() => {
		// Push a state so back button has something to pop
		history.pushState({ bottomSheet: true }, '');
		window.addEventListener('popstate', onPopState);
	});

	onDestroy(() => {
		window.removeEventListener('popstate', onPopState);
	});

	// Compute sheet transform: slide in on mount, then follow drag
	const sheetTransform = $derived(
		isClosing
			? 'translateY(110%)'
			: `translateY(${dragY}px)`
	);

	const sheetTransition = $derived(
		isDragging
			? 'none'
			: isClosing
			? 'transform 0.28s cubic-bezier(0.4, 0, 1, 1)'
			: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
	);
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center backdrop-blur-sm"
	onclick={onBackdropClick}
	style="background: rgba(28,25,23,{backdropOpacity}); transition: background 0.2s ease;"
>
	<!-- Sheet / Dialog -->
	<div
		bind:this={sheetEl}
		class="relative flex flex-col bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl overflow-hidden border border-stone-200 shadow-2xl sm:h-[85vh] max-h-[92vh] sheet-enter"
		style="transform: {sheetTransform}; transition: {sheetTransition};"
	>
		<!-- Drag handle — mobile only, this is the drag target -->
		<div
			bind:this={handleEl}
			class="sm:hidden flex-shrink-0 py-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
			onpointerdown={startDrag}
			onpointermove={moveDrag}
			onpointerup={endDrag}
			onpointercancel={endDrag}
		>
			<!-- Handle pill — grows slightly when dragging -->
			<div
				class="rounded-full bg-stone-300 transition-all duration-150"
				style="height: 4px; width: {isDragging ? '48px' : '36px'}; background: {isDragging ? 'rgb(120,113,108)' : 'rgb(214,211,209)'};"
			></div>
		</div>

		<!-- Content -->
		{@render children()}
	</div>
</div>

<style>
	.sheet-enter {
		animation: sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) both;
	}

	@keyframes sheetSlideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	/* On desktop, fade in instead of slide up */
	@media (min-width: 640px) {
		.sheet-enter {
			animation: dialogFadeIn 0.2s ease both;
		}
	}

	@keyframes dialogFadeIn {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
