const crypto = require('crypto');

module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.genId = () => {
    let id = null;
    if (!id) {
        id = crypto.randomBytes(20);
        Buffer.from('-AT0001-').copy(id, 0);
    }
    return id;
};

//piece length is constant, but for last piece, it might change
module.exports.pieceLen = (torrent, pieceIndex) => {
    const totalLength = torrent.size;
    const pieceLength = torrent.pieceLength;

    const lastPieceLength = totalLength % pieceLength;
    const lastPieceIndex = Math.floor((totalLength) / pieceLength);

    return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

//returns total number of blocks for a piece
module.exports.blocksPerPiece = (torrent, pieceIndex) => {
    let pieceLength = this.pieceLen(torrent, pieceIndex);

    return Math.ceil(pieceLength / this.BLOCK_LEN);
}

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
    const pieceLength = this.pieceLen(torrent, pieceIndex);

    const lastBlockLength = pieceLength % this.BLOCK_LEN;
    const lastBlockIndex = Math.floor((pieceLength) / this.BLOCK_LEN);

    return blockIndex === lastBlockIndex ? lastBlockLength : this.BLOCK_LEN;
};