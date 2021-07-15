const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const crypto=require('crypto');
const utils = require('./utils');
// const bignum = require('bignum');

module.exports.getPeers = (torrent, cb) =>{
    // creating a udp server
    const socket = dgram.createSocket('udp4');
    // listing to request on port 6888
    socket.bind(6888);
    
    const AnnounceMessage = buildConnectionMessage();
    // see if the transaction id is needed
    

    //We are sending connection request to all the trackers 
    torrent['announceList'].forEach(announceUrl =>{
        sendUdpReq(AnnounceMessage, announceUrl, socket, ()=>{
            console.log("connecting to tracker with url: ", announceUrl);
        });
    });

    socket.on('message', (response,sender) =>{

        const senderUrl='udp://'+ sender.address+':'+sender.port;
        const action = response.readUInt32BE(0);
        
        // action 0 means response to connect req
        if(action == 0){
            const connResp = parseConnectionResponse(response);

            // Build and send announce request to the tracker; tracker will send peer list as response 
            const announceReq = buildAnnounceRequest(connResp.connID,torrent);
            sendUdpReq(announceReq, senderUrl, socket, ()=>{console.log("announcing to tracker with url: ", senderUrl)});
        }
        else if(action == 1){  //action 1 means response to announce request
            console.log('announce to ' + senderUrl +' successful!');
            // parse the response and invoke the callback with peer list 
            const announceResp = parseAnnounceResponse(response);
            cb(announceResp.peers);
            socket.close();
        }
        
    });

};

function sendUdpReq(message, rawUrl, socket, cb){
    // parses the url string into an object 
    const url = new URL(rawUrl);
    if(url.protocol=='udp:'){
        socket.send(message, 0, message.length, url.port, url.hostname, cb);
    } 
}

function buildConnectionMessage(){
    const buf = Buffer.alloc(16);
    buf.writeUInt32BE(0x417, 0);
    buf.writeUInt32BE(0x27101980, 4);
    buf.writeUInt32BE(0,8);
    crypto.randomBytes(4).copy(buf,12);
    return buf;
}

function parseConnectionResponse(resp){
    return{
        action : resp.readUInt32BE(0),
        transID : resp.slice(4,8),
        connID : resp.slice(8)
    }
}

function buildAnnounceRequest(connID,torrent, port = 6881){
    const buf = Buffer.alloc(98);
    //connection ID 64bit
    connID.copy(buf,0);
    //action 32bit (1=announce)
    buf.writeUInt32BE(1, 8);
    //transaction ID 32bit 
    crypto.randomBytes(4).copy(buf,12);
    //infoHash 20 bytes
    torrent.infoHash.copy(buf,16);
    //peerID 20 bytes
    utils.genId().copy(buf,36);
    //downloaded 64bits (0 for now)
    Buffer.alloc(8).copy(buf, 56);
    // left
    buf.writeBigInt64BE(BigInt(torrent.size), 64);
    // uploaded
    Buffer.alloc(8).copy(buf, 72);
    //event 32 bits (0:none)
    buf.writeUInt32BE(0,80);
    //IP address 32bit (0:default)
    buf.writeUInt32BE(0,84);
    //key 32bit
    crypto.randomBytes(4).copy(buf, 88);
    //num_want 32bit (-1:default)
    buf.writeUInt32BE(50,92);
    //port 16bit
    buf.writeUInt16BE(port,96);
    return buf;
}

function parseAnnounceResponse(resp) {
    function group(iterable, groupSize) {
      let groups = [];
      for (let i = 0; i < iterable.length; i += groupSize) {
        groups.push(iterable.slice(i, i + groupSize));
      }
      return groups;
    }
  
    return {
      action: resp.readUInt32BE(0),
      transactionId: resp.readUInt32BE(4),
      leechers: resp.readUInt32BE(8),
      seeders: resp.readUInt32BE(12),
      peers: group(resp.slice(20), 6).map(address => {
        return {
          ip: address.slice(0, 4).join('.'),
          port: address.readUInt16BE(4)
        }
      })
    }
  }