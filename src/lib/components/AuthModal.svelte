<script lang="ts">
	import { signUpWithEmail, signInWithEmail, signInWithOAuth, signOutUser } from '$lib/supabase';
	import type { User } from '@supabase/supabase-js';
	import { X, Lock, Mail, LogIn, UserPlus, AlertCircle, CheckCircle2, Download, LogOut, CloudCheck } from '@lucide/svelte';

	let {
		currentUser = null,
		onClose,
		onOpenInstallGuide
	}: {
		currentUser?: User | null;
		onClose: () => void;
		onOpenInstallGuide?: () => void;
	} = $props();

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	async function handleSubmit() {
		if (!email || !password) {
			errorMsg = 'Please enter both email and password';
			return;
		}

		isLoading = true;
		errorMsg = null;
		successMsg = null;

		if (mode === 'login') {
			const { error } = await signInWithEmail(email, password);
			if (error) {
				errorMsg = error.message;
			} else {
				successMsg = 'Successfully signed in!';
				setTimeout(onClose, 600);
			}
		} else {
			const { error } = await signUpWithEmail(email, password);
			if (error) {
				errorMsg = error.message;
			} else {
				successMsg = 'Account created! Check your email to confirm.';
				setTimeout(onClose, 1200);
			}
		}
		isLoading = false;
	}

	async function handleOAuth(provider: 'google' | 'github') {
		isLoading = true;
		errorMsg = null;
		try {
			const res = await signInWithOAuth(provider);
			if (res?.error) {
				if (res.error.message?.includes('Client unavailable')) {
					errorMsg = 'Supabase Project URL & Anon Key missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
				} else {
					errorMsg = `${provider.toUpperCase()} Auth: ${res.error.message}. Make sure Google OAuth is enabled in your Supabase dashboard.`;
				}
				isLoading = false;
			}
		} catch (err: any) {
			errorMsg = err.message || 'OAuth error occurred.';
			isLoading = false;
		}
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
	<div class="glass-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-stone-200 pb-3">
			<div class="flex items-center gap-2.5">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
					<Lock class="h-5 w-5 text-amber-800" />
				</div>
				<div>
					<h3 class="text-base font-extrabold text-stone-900 font-heading">
						{currentUser ? 'Account & Settings' : mode === 'login' ? 'Sign In to BingeTrack' : 'Create an Account'}
					</h3>
					<p class="text-xs text-stone-500 font-medium">
						{currentUser ? currentUser.email : 'Sync your TV watch history across devices'}
					</p>
				</div>
			</div>
			<button onclick={onClose} class="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Feedback Banners -->
		{#if errorMsg}
			<div class="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
				<AlertCircle class="h-4 w-4 shrink-0 text-red-600" />
				<span class="leading-relaxed">{errorMsg}</span>
			</div>
		{/if}

		{#if successMsg}
			<div class="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
				<CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" />
				<span>{successMsg}</span>
			</div>
		{/if}

		<!-- If Signed In: Account Profile Details & Actions -->
		{#if currentUser}
			<div class="space-y-3 py-2">
				<div class="rounded-2xl bg-amber-50 p-4 border border-amber-200 flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<CloudCheck class="h-5 w-5 text-amber-700 shrink-0" />
						<div>
							<h4 class="text-xs font-extrabold text-stone-900">Cloud Sync Active</h4>
							<p class="text-[11px] text-stone-600">{currentUser.email}</p>
						</div>
					</div>
					<span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
						Connected
					</span>
				</div>

				<!-- Install App Action inside Account Settings -->
				{#if onOpenInstallGuide}
					<button
						onclick={() => { onClose(); onOpenInstallGuide(); }}
						class="flex w-full items-center justify-between rounded-2xl bg-stone-50 p-3.5 border border-stone-200 hover:bg-stone-100 transition-colors text-left"
					>
						<div class="flex items-center gap-2.5">
							<Download class="h-4 w-4 text-amber-700 shrink-0" />
							<div>
								<h5 class="text-xs font-bold text-stone-900">Install BingeTrack App</h5>
								<p class="text-[10px] text-stone-500">Add to Home Screen for offline standalone access</p>
							</div>
						</div>
						<span class="text-xs font-bold text-amber-900">Install ➔</span>
					</button>
				{/if}

				<button
					onclick={async () => { await signOutUser(); onClose(); }}
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-700 border border-red-200 hover:bg-red-100 transition-all mt-4"
				>
					<LogOut class="h-4 w-4" />
					<span>Sign Out</span>
				</button>
			</div>
		{:else}
			<!-- If Signed Out: Install App Trigger Option -->
			{#if onOpenInstallGuide}
				<button
					onclick={() => { onClose(); onOpenInstallGuide(); }}
					class="flex w-full items-center justify-between rounded-2xl bg-amber-50 p-3 border border-amber-200 hover:bg-amber-100 transition-colors text-left"
				>
					<div class="flex items-center gap-2">
						<Download class="h-4 w-4 text-amber-700 shrink-0" />
						<span class="text-xs font-bold text-amber-900">Install BingeTrack App to Home Screen</span>
					</div>
					<span class="text-xs font-extrabold text-amber-900">Install ➔</span>
				</button>
			{/if}

			<!-- OAuth Provider Buttons -->
			<div class="space-y-2">
				<button
					onclick={() => handleOAuth('google')}
					disabled={isLoading}
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-100 py-2.5 text-xs font-bold text-stone-800 border border-stone-300 hover:bg-stone-200 transition-all"
				>
					<svg class="h-4 w-4" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
					</svg>
					<span>Continue with Google</span>
				</button>
			</div>

			<div class="relative flex items-center justify-center">
				<div class="w-full border-t border-stone-200"></div>
				<span class="absolute bg-white px-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">or with email</span>
			</div>

			<!-- Email/Password Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-3">
				<div>
					<label for="auth-email" class="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
						<input
							id="auth-email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							class="w-full rounded-xl bg-stone-50 pl-9 pr-3 py-2 text-sm text-stone-900 border border-stone-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
						/>
					</div>
				</div>

				<div>
					<label for="auth-pass" class="block text-xs font-bold text-stone-700 mb-1">Password</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
						<input
							id="auth-pass"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							class="w-full rounded-xl bg-stone-50 pl-9 pr-3 py-2 text-sm text-stone-900 border border-stone-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 text-xs font-extrabold text-stone-950 shadow-sm hover:from-amber-400 hover:to-yellow-400 transition-all disabled:opacity-50"
				>
					{#if isLoading}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-stone-950 border-t-transparent"></div>
					{:else if mode === 'login'}
						<LogIn class="h-4 w-4 text-stone-950" />
						<span>Sign In</span>
					{:else}
						<UserPlus class="h-4 w-4 text-stone-950" />
						<span>Create Account</span>
					{/if}
				</button>
			</form>

			<!-- Toggle Login / Signup Mode -->
			<div class="text-center pt-1 border-t border-stone-200">
				<button
					onclick={() => (mode = mode === 'login' ? 'signup' : 'login')}
					class="text-xs font-bold text-amber-900 underline hover:text-amber-700"
				>
					{mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
				</button>
			</div>
		{/if}
	</div>
</div>
