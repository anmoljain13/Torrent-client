const torrentParser = require('./lib/torrent_parser'); //contains code to get information out of a torrent file

const torrent = torrentParser.parse(process.argv[2]);
console.log(torrent);