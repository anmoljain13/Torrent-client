const fs = require('fs');
const parser = require('./torrent_parser').parse;
const piecelen = require('./utils').pieceLen;
const torrent = parser(process.argv[2]);
const Buffer = require('buffer').Buffer;
const crypto = require('crypto');

const file = fs.openSync(torrent.filename, 'r');
console.log(torrent);

for(let i = 0; i<torrent.pieceCount; i++){
    let offset = i * torrent.peiceLength;
    const buf = Buffer.alloc(piecelen(torrent,i))
    fs.read(file, buf, 0, piecelen(torrent,i), offset, (err) => {
        if(err) console.log(err);
        console.log(Buffer.from(crypto.createHash('sha1').update(buf).digest()));
    });
}

