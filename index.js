const torrentParser = require('./lib/torrent_parser'); //contains code to get information out of a torrent file
const tracker = require('./lib/tracker');
const torrent = torrentParser.parse(process.argv[2]);
const download = require('./lib/download');
const utils = require('./lib/utils');
console.log(torrent);
console.log(utils.pieceLen(torrent,9));
console.log(utils.blockLen(torrent,9,0));
const getPeers = tracker.getPeers(torrent,(peers)=>{
    console.log(peers);
    download(peers, torrent);
});
