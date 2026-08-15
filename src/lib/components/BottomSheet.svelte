<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		onClose,
		children
	}: {
		onClose: () => void;
		children: import('svelte').Snippet;
	} = $props();

	// Lifecycle & animation state
	let mounted = $state(false);
	let isClosing = $state(false);

	// Drag state
	let dragY = $state(0);
	let isDragging = $state(false);
	let startClientY = 0;
	let lastClientY = 0;
	let lastTimestamp = 0;
	let currentVelocity = 0; // px/ms

	// History handling flag
	let historyPushed = false;

	// Backdrop opacity follows drag & closing state
	const backdropOpacity = $derived(
		isClosing
			? 0
			: isDragging || dragY > 0
			? Math.max(0, 0.6 - (dragY / 450) * 0.6)
			: mounted
			? 0.6
			: 0
	);

	// Sheet translation
	const sheetTransform = $derived(
		isClosing
			? 'translateY(105%)'
			: !mounted
			? 'translateY(100%)'
			: `translateY(${dragY}px)`
	);

	const sheetTransition = $derived(
		isDragging
			? 'none'
			: isClosing
			? 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
			: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
	);

	function handleDragStart(clientY: number) {
		if (isClosing) return;
		isDragging = true;
		startClientY = clientY;
		lastClientY = clientY;
		lastTimestamp = performance.now();
		currentVelocity = 0;

		// Attach global move/up listeners
		window.addEventListener('pointermove', onGlobalPointerMove, { passive: false });
		window.addEventListener('pointerup', onGlobalPointerEnd);
		window.addEventListener('pointercancel', onGlobalPointerEnd);
		window.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
		window.addEventListener('touchend', onGlobalTouchEnd);
		window.addEventListener('touchcancel', onGlobalTouchEnd);
	}

	function handleDragMove(clientY: number) {
		if (!isDragging) return;
		const now = performance.now();
		const dt = now - lastTimestamp;
		if (dt > 0) {
			currentVelocity = (clientY - lastClientY) / dt;
		}
		lastClientY = clientY;
		lastTimestamp = now;

		const delta = clientY - startClientY;
		if (delta < 0) {
			// Rubber-band resistance when pulling up
			dragY = delta * 0.25;
		} else {
			dragY = delta;
		}
	}

	function handleDragEnd() {
		if (!isDragging) return;
		isDragging = false;

		// Clean up global listeners
		removeGlobalListeners();

		// Dismiss if dragged down > 90px OR flicked downward fast enough
		const shouldDismiss = dragY > 90 || (dragY > 20 && currentVelocity > 0.4);
		if (shouldDismiss) {
			dismiss();
		} else {
			// Snap back
			dragY = 0;
		}
	}

	function removeGlobalListeners() {
		window.removeEventListener('pointermove', onGlobalPointerMove);
		window.removeEventListener('pointerup', onGlobalPointerEnd);
		window.removeEventListener('pointercancel', onGlobalPointerEnd);
		window.removeEventListener('touchmove', onGlobalTouchMove);
		window.removeEventListener('touchend', onGlobalTouchEnd);
		window.removeEventListener('touchcancel', onGlobalTouchEnd);
	}

	// Pointer events
	function onPointerDown(e: PointerEvent) {
		// Only primary button / single touch
		if (e.button !== 0) return;
		e.preventDefault();
		handleDragStart(e.clientY);
	}

	function onGlobalPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		e.preventDefault();
		handleDragMove(e.clientY);
	}

	function onGlobalPointerEnd() {
		handleDragEnd();
	}

	// Touch events fallback for mobile browsers
	function onTouchStart(e: TouchEvent) {
		if (e.touches.length > 0) {
			handleDragStart(e.touches[0].clientY);
		}
	}

	function onGlobalTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		if (e.touches.length > 0) {
			e.preventDefault();
			handleDragMove(e.touches[0].clientY);
		}
	}

	function onGlobalTouchEnd() {
		handleDragEnd();
	}

	export function dismiss() {
		if (isClosing) return;
		isClosing = true;

		if (historyPushed) {
			historyPushed = false;
			history.back();
		}

		setTimeout(() => {
			onClose();
		}, 260);
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			dismiss();
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dismiss();
		}
	}

	function onPopState() {
		if (!isClosing) {
			isClosing = true;
			historyPushed = false;
			setTimeout(() => {
				onClose();
			}, 260);
		}
	}

	onMount(() => {
		try {
			history.pushState({ bottomSheet: true }, '');
			historyPushed = true;
			window.addEventListener('popstate', onPopState);
		} catch (e) {
			// ignore history state errors in restricted environments
		}

		// Smooth mount slide-in
		const raf = requestAnimationFrame(() => {
			mounted = true;
		});

		return () => {
			cancelAnimationFrame(raf);
			removeGlobalListeners();
		};
	});

	onDestroy(() => {
		removeGlobalListeners();
		window.removeEventListener('popstate', onPopState);
	});
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center"
	onclick={onBackdropClick}
	style="background: rgba(28,25,23,{backdropOpacity}); transition: background 0.25s ease;"
>
	<!-- Sheet / Dialog container -->
	<div
		class="relative flex flex-col bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl overflow-hidden border border-stone-200 shadow-2xl sm:max-h-[85vh] max-h-[92vh]"
		style="transform: {sheetTransform}; transition: {sheetTransition}; will-change: transform; touch-action: pan-y;"
	>
		<!-- Drag handle bar (prominent hit area on mobile) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="sm:hidden flex-shrink-0 pt-3 pb-2.5 px-6 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none w-full bg-white active:bg-stone-50 transition-colors"
			style="touch-action: none;"
			onpointerdown={onPointerDown}
			ontouchstart={onTouchStart}
		>
			<div
				class="rounded-full transition-all duration-150"
				style="height: 5px; width: {isDragging ? '52px' : '40px'}; background: {isDragging ? 'rgb(120,113,108)' : 'rgb(200,195,190)'};"
			></div>
		</div>

		<!-- Content -->
		{@render children()}
	</div>
</div>
