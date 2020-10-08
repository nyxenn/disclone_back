import express from "express";
import usg from "unique-string-generator";
import Server from '../models/server.schema.js';
import Channel from '../models/channel.schema.js';

const router = express.Router();

async function findServersByUser(uid, res) {
    Server.find({members: uid}).populate("channels", "history name").exec(function (err, servers) {
        if (err) {
            console.error(err);
            return res.status(400).send(err);
        }

        console.log(`Getting servers for user #${uid}`);
        return res.status(200).json(servers);
    });
}

router.get('/u/:uid', function(req, res) {
    const {uid} = req.params;
    if (!uid) return res.status(400).send("No id");

    return findServersByUser(uid, res);
});

router.post('/new', function(req, res) {
    const {name, uid} = req.body;
    if (!name || !uid) return res.status(400).send("No data");

    const members = [uid];
    const gen =  new Channel({name: "general"});
    const wel = new Channel({name: "welcome"});

    const newServer = new Server({name, members, creator: uid, channels: [gen, wel], invite: usg() });
    newServer.save(function(err, server) {
        if (err || !server) {
            console.error(err);
            return res.status(400).send(err);
        }

        return findServersByUser(uid, res);
    });
});

router.post("/channel/new", function(req, res) {
    const {name, sid} = req.body;
    if (!name) {
        console.log("No channel/server");
        return res.status(400).send("No channel/server");
    }

    Server.findOne({_id: sid}, (err, srv) => {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }

        if (!srv) {
            console.log("No server");
            return res.status(404).send("No server");
        }

        const channel = new Channel({name});

        srv.channels.push(channel);
        srv.markModified("channels");
        srv.save(saveErr => { if (saveErr) return console.log(saveErr) });

        req.io.in(sid).emit("ch-added", sid, channel);
        return res.status(200).send("Succesfully added");
    });
})

router.post('/join', function(req, res) {
    const {invite, uid, username} = req.body;

    if (!invite || !uid) return res.status(400).send("No data");

    Server.findOne({invite}, function (err, server) {
        if (err || !server) {
            console.log(err);
            return res.status(400).send("Could not find");
        }

        if (server.members.includes(uid)) return res.status(400).send("Already joined");
        server.members.push(uid);
        server.save(function (err2, svr) {
            if (err2) {
                console.log(err2);
                return res.status(400).send(err2);
            }
            
            req.io.in(server._id).emit("srv-joined", uid, username);
            return findServersByUser(uid, res);
        });
    });
});

router.delete('/:sid', function(req, res) {
    const {sid} = req.params;
    if (!sid) return res.status(400).send("No server provided");

    Server.findOneAndDelete({_id: sid}).exec((err, srv) => {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }

        return req.io.in(sid).emit("srv-deleted", sid);
    });
});

router.post('/delChannel', function(req, res) {
    const {sid, cid} = req.body;
    if (!sid || !cid) return res.status(400).send("No id provided");
    
    Server.findOne({_id: sid}, (err, srv) => {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }

        if (!srv) {
            console.log("No server");
            return res.status(400).send("No server");
        }

        if (srv.channels.length <= 1) return res.status(400).send("Can't delete last channel");
        const channel = srv.channels.find(c => c.cid === cid);
        const index = srv.channels.indexOf(channel);
        srv.channels.splice(index, 1);
        srv.markModified("channels"); // Needed for mongoose to properly save the nested object
        srv.save();

        return req.io.in(sid).emit("ch-deleted", sid, cid);
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

    const srvQuery = Server.findOne({_id: sid}, async (err, srv) => {
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