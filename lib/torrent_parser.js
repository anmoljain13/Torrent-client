const bencode = require('bencode');
const crypto = require('crypto');
const fs = require('fs'); //To read the torrent file



module.exports.parse = (torrentFilePath) => {
    const torrentFile = fs.readFileSync(torrentFilePath);

    const torrent = bencode.decode(torrentFile);
    let torrentParsed = new Object();

    torrentParsed.announce = torrent.announce.toString('utf8');

    torrentParsed.announceList = new Array();
    if (torrent['announce-list'])
        torrent['announce-list'].forEach(element => {
            torrentParsed.announceList.push(element.toString('utf8'));
        });

    if (torrent['created by']) torrentParsed.created_by = torrent['created by'].toString('utf8');

    torrentParsed.creation_date = torrent['creation date'];

    const info = bencode.encode(torrent.info);
    torrentParsed.infoHash = crypto.createHash('sha1').update(info).digest();

    //if only 1 file, then t_size=torrent.info.length, else we iterate over all files and sum the length
    torrentParsed.size = torrent.info.files ?
        torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
        torrent.info.length;

    //torrent.info.pieces is a buffer with all pieces stacked one after other (SHA1 hashed => 20 bytes each).
    torrentParsed.pieceCount = torrent.info.pieces.length / 20;
    // Individual piece hashes; stored as concatenated 20 Byte array in the metainfo file info.pieces property;
    // Required to verify the integrity of the downloaded piece
    torrentParsed.pieceHash = new Array();
    for (let i = 0; i < torrentParsed.pieceCount; i++) {
        torrentParsed.pieceHash.push(torrent.info.pieces.slice(i * 20, (i + 1) * 20));
    }

    //piece length is the length in bytes of that piece
    torrentParsed.pieceLength = torrent.info['piece length'];

    torrentParsed.filename = torrent.info.name.toString('utf8');
    if (torrent.info.files) {
        torrentParsed.files = new Array();
        torrent.info.files.forEach((file) => {
            torrentParsed.files.push({ size: file.length, path: file.path.toString('utf8').split(',').join('/') });
        })
    }

    torrentParsed.md5 = crypto.createHash('md5').update(torrentParsed.infoHash).digest().toString('hex');

    return torrentParsed;
}