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
            return res.sendStatus(400);
        }

        console.log(`Getting servers for user #${userid}`);
        return res.status(200).json(servers);
    });
}

router.get('/u/:userid', function(req, res) {
    const {userid} = req.params;
    if (!userid) return res.sendStatus(400);

    return findServersByUser(userid, res);
});

router.post('/new', function(req, res) {
    const {name, userid} = req.body;
    if (!name || !userid) return res.sendStatus(400);

    const members = [userid];
    const defChannel = [{
        cid: 1,
        name: "general",
        default: true,
    }];

    const newServer = new Server({name, members, channels: defChannel });
    newServer.save(function(err, server) {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }

        return findServersByUser(userid, res);
    });
});

router.post('/join', function(req, res) {
    const {serverid, userid} = req.body;
    if (!serverid || !userid) return res.sendStatus(400);

    Server.findOne({sid: serverid}, function (err, server) {
        if (err) {
            console.log(err);
            return res.sendStatus(400);
        }

        if (server.members.includes(userid)) return res.sendStatus(200);
        server.members.push(userid);
        server.save(function (err, svr) {
            if (err) {
                console.log(err);
                return res.sendStatus(400);
            }
            
            return findServersByUser(userid, res);
        });
    });
})

export default router;