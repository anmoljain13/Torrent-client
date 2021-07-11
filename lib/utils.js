const crypto = require('crypto');


module.exports.genId = () => {
    let id = null;
    if (!id) {
        id = crypto.randomBytes(20);
        Buffer.from('-AT0001-').copy(id, 0);
    }
    return id;
};