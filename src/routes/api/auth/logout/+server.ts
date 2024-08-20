import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies, request }) => {
	cookies.delete('refresh_token', { path: '/' });
	cookies.delete('access_token', { path: '/' });

	// CHECK IF CALLED VIA ON SUBMIT (JS IS ENABLED)
	if (request.headers.get('accept') === 'application/json') {
		return json({ success: true });
	}
	redirect(303, '/login');
};
