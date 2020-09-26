import express from "express";
import Request from '../models/request.schema.js';
import User from '../models/user.schema.js';

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

export function getRequestByUser(res, uid) {
    Request.find({ $or: [{'receiver': uid}, {'sender': uid}] }).select('-_id -__v').populate("receiverName senderName", "username uid -_id").exec(function(err, reqs) {
        if (err) return res.status(400).send(err);

        uid = parseInt(uid);
        if (isNaN(uid)) return res.status(400).send("Invalid id");

        if (reqs) {
            reqs = reqs.map(r => {
                return {
                    "rid": r.rid,
                    "type": r.receiver === uid ? "incoming" : "outgoing",
                    "user": r.receiver === uid ? r.senderName : r.receiverName,
                    "timestamp": r.timestamp
                }
            });

            return res.status(200).json(reqs);
        }

    });
}

router.get('/all/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = parseInt(req.params.uid);

    if (isNaN(uid)) return res.status(400).send("Invalid id");
    getRequestByUser(res, uid);
});

router.delete('/r/:rid&:uid', function(req, res) {
    if (!req.params.rid || !req.params.uid) return res.status(400).send("No id");
    const rid = parseInt(req.params.rid);
    const uid = parseInt(req.params.uid);

    if (isNaN(rid) || isNaN(uid)) return res.status(400).send("Invalid id");
    deleteRequest(res, rid, uid);
});

export async function deleteRequest(rid) {
    if (!rid) return {error: "No id"};

    rid = parseInt(rid);
    if(isNaN(rid)) return {error: "Parsing error"};

    const delQuery = Request.findOneAndDelete({rid});
    const delRes = await delQuery.exec();

    return {error: false};
}

async function checkIfFriends(uid, friendname) {
    let error = null;
    let fuid = null;

    const userQuery = User.findOne({username: friendname}, function (err, doc) {
        if (err) {
            console.log("Error");
            error = err
            return;
        }

        if (!doc) {
            error = "No user found";
            return;
        }

        if (doc.friends.find(id => id === uid)) {
            error = "Already friends";
            return;
        }

        fuid = doc.uid;
    });
    const userRes = await userQuery.exec();

    return {error, fuid};
}

async function checkIfRequestExists(uid, fuid) {
    const reqQuery = Request.findOne({$or: [{sender: uid, receiver: fuid}, {sender: fuid, receiver: uid}]});
    const reqResult = await reqQuery.exec();
    if (!reqResult) return { error: false };
    return { error: "Request already exists" };
}

export async function sendRequest(uid, username, friendname) {
    const friendsCheck = await checkIfFriends(uid, friendname);
    if (friendsCheck.error || !friendsCheck.fuid) return friendsCheck;

    const requestCheck = await checkIfRequestExists(uid, friendsCheck.fuid);
    if (requestCheck.error) return requestCheck;

    const req = new Request({sender: uid, receiver: friendsCheck.fuid, timestamp: Date.now() / 1000 });
    await req.save();

    const senderReq = {
        rid: req.rid,
        type: "outgoing",
        user: {uid: friendsCheck.fuid, username: friendname},
        timestamp: req.timestamp
    };

    const receiverReq = {
        rid: req.rid,
        type: "incoming",
        user: {uid, username},
        timestamp: req.timestamp
    };

    return {error: false, sender: senderReq, receiver: receiverReq};
}

export default router;