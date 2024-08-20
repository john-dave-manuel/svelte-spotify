import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SPOTIFY_APP_CLIENT_ID, SPOTIFY_APP_CLIENT_SECRET, BASE_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code') || null;
	const state = url.searchParams.get('state') || null;

	const storedState = cookies.get('spotify_auth_state') || null;
	const storedChallengeVerifier = cookies.get('spotify_auth_challenge_verifier') || null;

	if (state === null || state !== storedState) {
		error(400, 'State Mismatch!');
	}

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(
				`${SPOTIFY_APP_CLIENT_ID}:${SPOTIFY_APP_CLIENT_SECRET}`
			).toString('base64')}`
		},
		body: new URLSearchParams({
			code: code || '',
			redirect_uri: `${BASE_URL}/api/auth/callback`,
			grant_type: 'authorization_code',
			code_verifier: storedChallengeVerifier || '',
			client_id: SPOTIFY_APP_CLIENT_ID
		})
	});
	const responseJSON = await response.json();

	if (responseJSON.error) {
		error(400, responseJSON.error_description);
	}

	/* @migration task: add path argument */ cookies.delete('spotify_auth_state');
	/* @migration task: add path argument */ cookies.delete('spotify_auth_challenge_verifier');
	cookies.set('refresh_token', responseJSON.refresh_token, { path: '/' });
	cookies.set('access_token', responseJSON.access_token, { path: '/' });

	redirect(303, '/');
};
