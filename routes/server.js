import express from "express";
import Server from '../models/server.schema.js';

const router = express.Router();

function getTimeWithLeadingZeros() {
    const d = new Date();
    const hours = (d.getHours() > 10 ? '' : '0') + d.getHours();
    const minutes = (d.getMinutes() > 10 ? '' : '0') + d.getMinutes();
    const seconds = (d.getSeconds() > 10 ? '' : '0') + d.getSeconds();
    return `${hours}:${minutes}:${seconds}`;
}

router.use(function (req, res, next) {
    const date = getTimeWithLeadingZeros();
    const host = req.headers.host;
    const method = req.method;
    const url = req.originalUrl;
    const request = `${host} ${method} ${url}`;
    console.log(`[${date}]: ${request}`);
    next();
});

function findServersByUser(userid, res) {
    Server.find({members: userid}).select("-_id").exec(function (err, servers) {
        if (err) {
            console.error(err);
            return res.status(400).send(err);
        }

        console.log(`Getting servers for user #${userid}`);
        return res.status(200).json(servers);
    });
}

router.get('/u/:userid', function(req, res) {
    const {userid} = req.params;
    if (!userid) return res.status(400).send("No id");

    return findServersByUser(userid, res);
});

router.post('/new', function(req, res) {
    const {name, userid} = req.body;
    if (!name || !userid) return res.status(400).send("No data");

    const members = [userid];
    const defChannel = [{
        cid: 1,
        name: "general",
        default: true,
    }];

    const newServer = new Server({name, members, channels: defChannel });
    newServer.save(function(err, server) {
        if (err || !server) {
            console.error(err);
            return res.status(400).send(err);
        }

        return findServersByUser(userid, res);
    });
});

router.post('/join', function(req, res) {
    const {serverid, userid} = req.body;
    if (!serverid || !userid) return res.status(400).send("No data");

    Server.findOne({sid: serverid}, function (err, server) {
        if (err || !server) {
            console.log(err);
            return res.status(400).send("Could not find");
        }

        if (server.members.includes(userid)) return res.status(400).send("Already joined");
        server.members.push(userid);
        server.save(function (err, svr) {
            if (err) {
                console.log(err);
                return res.status(400).send(err);
            }
            
            return findServersByUser(userid, res);
        });
    });
});

export async function sendChannelMessage(msg, sid, cid) {
    if (!msg || !sid || !cid) {
        console.log("No body");
        return false;
    }

    if (!msg.user || !msg.message) {
        console.log("No message");
        return false;
    }

    const message = {
        mid: null,
        user: msg.user,
        message: msg.message,
        timestamp: msg.timestamp
    }

    const srvQuery = Server.findOne({sid}, async (err, srv) => {
        if (err || !srv) {
            console.log("Srv err: ", err);
            return false;
        }

        const channel = srv.channels.find(c => c.cid === cid);
        if (!channel) {
            console.log("No matching channel");
            return false;
        }

        const channelIndex = srv.channels.indexOf(channel);
        console.log(channelIndex);
        const historyLength = channel.history.length;
        message.mid = historyLength ? channel.history[historyLength - 1].mid + 1 : 1;
        channel.history.push(message);
        channel.history.sort(function(x, y) {
            return x.timestamp - y.timestamp
        });

        srv.channels[channelIndex] = channel;
        srv.markModified("channels"); // Needed for mongoose to properly save the nested object
        srv.save( function (saveErr) { if (saveErr) console.log("Save error ", saveErr) });
    });
    const srvResult = await srvQuery.exec();

    return message;
}

export default router;