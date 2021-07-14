const torrentParser = require('./lib/torrent_parser'); //contains code to get information out of a torrent file
const tracker = require('./lib/tracker');
const torrent = torrentParser.parse(process.argv[2]);
const download = require('./lib/download')
// console.log(torrent);

const getPeers = tracker.getPeers(torrent,(peers)=>{
    download(peers, torrent);
});
