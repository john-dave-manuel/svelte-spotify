import { fetchRefresh } from '$helpers';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch: _fetch, url, depends, route }) => {
	const fetch = (path: string) => fetchRefresh(_fetch, path);

	depends(`app:${route.id}`);

	const { list, rest } = params;

	const limit = 18;
	const page = url.searchParams.get('page');

	const searchParams = new URLSearchParams({
		limit: `${limit}`,
		offset: page ? `${limit * (Number(page) - 1)}` : '0'
	}).toString();

	let request;
	let title;

	// section/new-releases
	if (list === 'section' && rest === 'new-releases') {
		request = fetch(`/api/spotify/browse/new-releases?${searchParams}`);
		title = 'New Releases';
	// section/featured-playlists
	} else if (list === 'section' && rest === 'featured-playlists') {
		request = fetch(`/api/spotify/browse/featured-playlists?${searchParams}`);
		title = 'Featured Playlists';
	// category/[id]
	} else if (list === 'category') {
		request = fetch(`/api/spotify/browse/categories/${rest}/playlists?${searchParams}`);
		const catInfo = await fetch(`/api/spotify/browse/categories/${rest}`);
		const catInfoJSON: SpotifyApi.CategoryObject = catInfo.ok ? await catInfo.json() : undefined;
		title = catInfoJSON ? `${catInfoJSON.name} Playlists` : 'Playlists';
	// profile/following
	} else if (list === 'profile' && rest === 'following') {
		request = await fetch(`/api/spotify/me/following?type=artist&${searchParams}`);
		title = 'Following';
	// artist/[id]/albums
	// artist/[id]/appears-on
	// artist/[id]/related-artists
	} else if (list === 'artist') {
		const artistID = rest.split('/')[0];
		const dataType = rest.split('/')[1];
		if (!artistID || !['albums', 'appears-on', 'related-artists'].includes(dataType)) {
			error(404, { message: 'Page not found!' });
		}
		const artistInfo = await fetch(`/api/spotify/artists/${artistID}`);
		const artistInfoJSON: SpotifyApi.SingleArtistResponse = artistInfo.ok
			? await artistInfo.json()
			: undefined;

		if (dataType === 'albums') {
			request = fetch(
				`/api/spotify/artists/${artistID}/albums?include_groups=album,single&${searchParams}`
			);
			title = artistInfoJSON ? `${artistInfoJSON.name} Albums` : 'Albums';
		}
		if (dataType === 'appears-on') {
			request = fetch(
				`/api/spotify/artists/${artistID}/albums?include_groups=appears_on&${searchParams}`
			);
			title = artistInfoJSON ? `${artistInfoJSON.name} Appearances` : 'Appearances';
		}
		if (dataType === 'related-artists') {
			request = fetch(`/api/spotify/artists/${artistID}/related-artists`);
			title = artistInfoJSON ? `Related to ${artistInfoJSON.name}` : 'Related Artists';
		}
	}

	if (!request) {
		error(404, 'Page Not Found!');
	}

	const res = await request;

	if (!res.ok) {
		error(res.status, 'Failed to Load Data!');
	}

	const resJSON:
		| SpotifyApi.ListOfNewReleasesResponse
		| SpotifyApi.ListOfFeaturedPlaylistsResponse
		| SpotifyApi.CategoryPlaylistsResponse
		| SpotifyApi.UsersFollowedArtistsResponse
		| SpotifyApi.ArtistsAlbumsResponse
		| SpotifyApi.ArtistsRelatedArtistsResponse = await res.json();

	const getData = () => {
		if ('items' in resJSON) return resJSON;
		if ('playlists' in resJSON) return resJSON.playlists;
		if ('albums' in resJSON) return resJSON.albums;
		if ('artists' in resJSON) {
			if ('items' in resJSON.artists) {
				return resJSON.artists;
			} else {
				// related-artists (has no pagination)
				return { items: resJSON.artists };
			}
		}
	};

	console.group("List route");
	console.log("🚀 ~ load:PageLoad= ~ list:", list)
	console.log("🚀 ~ load:PageLoad= ~ rest:", rest)
	console.log("🚀 ~ load:PageLoad= ~ resJSON:", resJSON)
	console.log("🚀 ~ getData:", getData())
	console.groupEnd();

	return {
		data: getData(),
		title
	};
};
	

