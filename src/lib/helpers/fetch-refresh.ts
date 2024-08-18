import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';

export default async function fetchRefresh(
	fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>,
	path: string
) {
	const req = fetch(path);
	if (!browser) return req;
	const res = await req;
	if (res.status === 401) {
		// REFRESH TOKEN ONCE AND STORE IT IN A WINDOW VARIABLE
		if (!window.refreshPromise) {
			window.refreshPromise = fetch('/api/auth/refresh').finally(() => {
				// Once the refresh token request is completed, window.refreshPromise is set to null so that future 
				// requests can correctly identify when no refresh request is in progress. 
				// Without this reset, window.refreshPromise would continue to hold the previous promise, 
				// and subsequent 401 errors would not trigger a new refresh token request.
				window.refreshPromise = null;
			});
		}
		const refreshRes = await window.refreshPromise;
		if (!refreshRes.ok) throw error(401, 'Session Expired!');
		return fetch(path);
	} else {
		return res;
	}
}
