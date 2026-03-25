const parseTorrent = require('parse-torrent');
const {
	ifElse,
	filter,
	pipe,
	map,
	pathOr,
	pathEq,
	propOr,
	addIndex,
} = require('ramda');
const { encode } = require('base-64');


//const Magnet2torrent = require('magnet2torrent-js');
const magnetToTorrent = require('magnet-to-torrent');
var itorrents = function (hash) {
	return `http://itorrents.net/torrent/${hash}.torrent`;
};

magnetToTorrent.addService(itorrents);
magnetToTorrent.addService((hash) => `https://torrage.info/torrent.php?h=${hash}`);
magnetToTorrent.addService((hash) => `https://btcache.me/torrent/${hash}`);

const episodeParser = require('episode-parser');
const isVideo = require('is-video');
const { parseId, getId } = require('./tools');

const mapIndexed = addIndex(map);

//const m2t = new Magnet2torrent({timeout: 120});
const urlExist = require('url-exist');
const anyPass = require('ramda/src/anyPass');
const propEq = require('ramda/src/propEq');

const FALLBACK_LOGO =
	'https://www.stremio.com/website/stremio-purple-small.png';
const FALLBACK_BACKGROUND =
	'https://blog.stremio.com/wp-content/uploads/2021/07/tech-update-july-2021.jpg';

const shouldShowSearch = anyPass([
	propEq('season', 0),
	pathEq(['extra', 'id'], 'Porn'),
]);

const fetchTorrentData = async (url) => {
	try {
		const res = await fetch(url);
		const arrayBuffer = await res.arrayBuffer();

		return parseTorrent(Buffer.from(arrayBuffer));
	} catch (e) {
		console.error("Error al obtener el torrent:", e);
		return null;
	}
};

const getVideoArray = async (data) => {
	let { args, torrent, magnetLink, seeders, parsedName, size, extra, infoHash } = data;
	let oldTorrent = "";

	if (typeof torrent === 'string' && torrent.startsWith('http')) {
		oldTorrent = torrent;
		torrent = await fetchTorrentData(torrent);
	}

	const files = torrent?.files || [];

	const videoFiles = files.filter(file => isVideo(file.name));

	return videoFiles.map((file, index) => {

		const episodeParsed = episodeParser(file.name || '');
		const season = episodeParsed?.season || 0;
		const episode = episodeParsed?.episode ?? index;
		const title = file.name.replace(/\.[^/.]+$/, "").replace(/[._]/g, " ").trim();
		const thumb = `https://placehold.co/256x144/b584cf/fff/png?text=${episode}`;

		const parameters = {
			magnetLink,
			parsedName: parsedName?.trim(),
			size,
			seeders,
			index,
			extra,
			infoHash,
		};


		const firstAired = shouldShowSearch({ season, extra })
			? ''
			: '2002-01-31T22:00:00.000Z';
		return {
			name: title,
			//title,
			season,
			number: episode,
			firstAired,
			id: `${getId(args)}:${season}:${episode}:${encode(JSON.stringify(parameters))}`,
			episode,
			thumbnail: thumb,
		};
	});
};

const metaHandler = async args => {
	const {
		magnetLink,
		seeders,
		parsedName,
		size,
		poster,
		extra,
		infoHash,
	} = parseId(args);

	//const torrent = await m2t.getTorrent(magnetLink);
	const torrent = await magnetToTorrent.getLink(magnetLink);
	//console.log(`torrent: ${torrent}`);

	const videos = await getVideoArray({
		args,
		torrent,
		magnetLink,
		seeders,
		parsedName,
		size,
		poster,
		extra,
		infoHash,
	});

	//console.log(videos);

	const logoUrl = poster.replace('/poster/', '/logo/');
	const backgroundUrl = poster.replace('/poster/', '/background/');
	const [logo, background] = await Promise.all([
		urlExist(logoUrl),
		urlExist(backgroundUrl),
	]);
	const metaObject = {
		id: args.id,
		name: parsedName,
		background: background ? backgroundUrl : FALLBACK_BACKGROUND,
		logo: logo ? logoUrl : FALLBACK_LOGO,
		posterShape: 'regular',
		type: args.type,
		videos,
		description: parsedName.toUpperCase(),
	};

	return Promise.resolve({ meta: metaObject });
};

module.exports = metaHandler;
