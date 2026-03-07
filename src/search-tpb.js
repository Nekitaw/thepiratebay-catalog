const request = require('request-promise');
const {map, isEmpty} = require('ramda');
const delay = require('delay');
const baseUrl = 'https://apibay.org';
const timeout = 5000;
const userAgents = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.7632.160 Mobile Safari/537.36",
];

const getUserAgent = () => {
	return userAgents[Math.floor(Math.random() * userAgents.length)];
}



const _request = async endpoint => {
	const url = `${baseUrl}/${endpoint}`;
	
	console.log(`Requesting: ${url}`);

	/*return request
		.get(url, {timeout})
		.then(data => JSON.parse(data))
		.then(map(toTorrent));
		*/
	let headers = new Headers({    
	    "User-Agent"   : getUserAgent(),
	});
	return fetch(url, {headers:headers})
		.then(data => data.json())
		.then(map(toTorrent));

};

const searchCategory = (category, retry = true) => {
	const url =
		category === '600' ? `q.php?q=category:500` : `q.php?q=+&cat=${category}`;

	let ret = _request(url).catch(() => {
		if (retry) {
			return delay(timeout).then(() => searchCategory(category, false));
		}
		return [];
	});
	return ret;
};

const search = async (query, category, retry = true) => {
	const queryParsed = query.trim().split(' ').join('+');
	let catgry = category == "600" || category == "500" ? category : "200";
	return _request(`q.php?q=${queryParsed}&cat=${category}`).catch((e) => {
		if (retry) {
			console.log(`retry: ${e}`);
			return delay(timeout).then(() => search(query, category, false));
		}

		return [];
	});
	/*
	const queryParsed = query.trim().split(' ').join('+');
	return _request(`q.php?q=${queryParsed}&cat=${category}`).catch(() => {
		if (retry) {
			return delay(timeout).then(() => search(query, category, false));
		}

		return [];
	});*/
};

const toTorrent = result => {
	const infoHash = result.info_hash.toLowerCase();
	console.log(result);
	return {
		name: result.name,
		size: result.size,
		seeders: result.seeders,
		leechers: result.leechers,
		uploader: result.username,
		imdb: isEmpty(result.imdb) ? 'tt1234567890' : result.imdb,
		infoHash,
		magnetLink: `magnet:?xt=urn:btih:${infoHash}`,
	};
};

module.exports = {searchCategory, search};
