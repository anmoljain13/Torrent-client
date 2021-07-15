const fs = require('fs');
const net = require('net');
const message = require('./message');
const Pieces = require('./pieces');
const Queue = require('./queue');
const utils = require('./utils');

module.exports = (peers, torrent) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(torrent.filename, 'w');
    peers.forEach((peer) => download(peer, torrent, pieces, file));
    // fs.closeSync(file);
}

function download(peer, torrent, pieces, file) {
    const socket = new net.Socket();
    socket.on('error', () => { });
    socket.connect(peer.port, peer.ip, () => {
        console.log("sending message to peer:" + peer.ip);
        socket.write(message.buildHandshake(torrent));
    });
    const queue = new Queue(torrent);
    onWholeMsg(socket, msg => msgHandler(msg, socket, pieces, queue, torrent, file, peer));
}

function onWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    socket.on('data', recvBuf => {
        // msgLen calculates the length of a whole message
        const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        savedBuf = Buffer.concat([savedBuf, recvBuf]);

        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
            callback(savedBuf.slice(0, msgLen()));
            savedBuf = savedBuf.slice(msgLen());
            handshake = false;
        }
    });
}

function msgHandler(msg, socket, pieces, queue, torrent, file, peer) {
    if (isHandshake(msg)) {
        console.log(" handshake successful with peer: " + peer.ip);
        socket.write(message.buildInterested());
    } else {
        const m = message.parse(msg);

        if (m.id === 0) {
            console.log("chocked by peer: " + peer.ip);
            chokeHandler(socket);
        }
        if (m.id === 1) {
            console.log("unchocked by peer: " + peer.ip);
            unchokeHandler(socket, pieces, queue);
        }
        if (m.id === 4) {
            console.log("peer have the piece with index: " + m.payload + `peer ip add ${peer.ip}`);
            haveHandler(socket, pieces, queue, m.payload);
        }
        if (m.id === 5) {
            console.log("peer have bitfield " + m.payload + `peer ip add ${peer.ip}`);
            bitfieldHandler(socket, pieces, queue, m.payload, peer);
        }
        if (m.id === 7) {
            console.log("peer has delivered piece with index " + m.payload.index + ` and block index = ${m.payload.begin / utils.BLOCK_LEN}` + ` peer ip add ${peer.ip}`);
            pieceHandler(socket, pieces, queue, torrent, file, m.payload);
        }
    }
}

function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 &&
        msg.toString('utf8', 1, 20) === 'BitTorrent protocol';
}

function chokeHandler(socket) {
    socket.end();
}

function unchokeHandler(socket, pieces, queue) {
    queue.choked = false;
    requestPiece(socket, pieces, queue);
}

function haveHandler(socket, pieces, queue, payload) {
    const pieceIndex = payload.readUInt32BE(0);
    const queueEmpty = queue.length === 0;
    queue.queue(pieceIndex);
    if (queueEmpty) requestPiece(socket, pieces, queue);
}


function bitfieldHandler(socket, pieces, queue, payload, peer) {
    const queueEmpty = queue.length === 0;
    payload.forEach((byte, i) => {
        for (let j = 0; j < 8; j++) {
            if (byte % 2) queue.queue(i * 8 + 7 - j);
            byte = Math.floor(byte / 2);
        }
    });
    if (queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
    pieces.printPercentDone();

    pieces.addReceived(pieceResp);

    const offset = pieceResp.index * torrent.peiceLength + pieceResp.begin;
    fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {
        // console.log("piece index is: " + pieceResp.index + " block index is: " + pieceResp.begin / utils.BLOCK_LEN);
    });

    if (pieces.isDone()) {
        console.log('DONE!');
        console.log(pieces._received);
        socket.end();
        //   try { fs.closeSync(file); } catch(e) {}
    } else {
        requestPiece(socket, pieces, queue);
    }
}


function requestPiece(socket, pieces, queue) {
    if (queue.choked) return null;

    while (queue.length()) {
        const pieceBlock = queue.deque();
        if (pieces.needed(pieceBlock)) {
            socket.write(message.buildRequest(pieceBlock));
            pieces.addRequested(pieceBlock);
            break;
        }
    }
}
