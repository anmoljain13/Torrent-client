const blocksPerPiece = require('./utils').blocksPerPiece;

module.exports = class {
    constructor(torrent) {
        function buildPiecesArray() {
            const nPieces = torrent.pieceCount;
            const arr = new Array(nPieces).fill(null);
            return arr.map((_, i) => new Array(tp.blocksPerPiece(torrent, i)).fill(false));
        }

        this._requested = buildPiecesArray();
        this._received = buildPiecesArray();
    }

    addRequested(pieceBlock) {
        const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
        this._requested[pieceBlock.index][blockIndex] = true;
    }

    addReceived(pieceBlock) {
        const blockIndex = pieceBlock.begin / tp.BLOCK_LEN;
        this._received[pieceBlock.index][blockIndex] = true;
    }
}