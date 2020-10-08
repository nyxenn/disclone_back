import express from "express";
import Request from '../models/request.schema.js';
import User from '../models/user.schema.js';
import mongoose from 'mongoose';

const router = express.Router();

export function getRequestByUser(res, uid) {
    console.log("Requests for:", uid);
    Request.find({ $or: [{'receiver': uid}, {'sender': uid}] }).populate("receiver sender", "username").exec(function(err, reqs) {
        if (err) return res.status(400).send(err);

        const oid = mongoose.Types.ObjectId(uid);
        
        if (reqs) {
            reqs = reqs.map(r => {
                return {
                    "_id": r._id,
                    "type": r.receiver._id.equals(oid) ? "incoming" : "outgoing",
                    "user": r.receiver._id.equals(oid) ? r.sender : r.receiver,
                    "timestamp": r.timestamp
                }
            });

            return res.status(200).json(reqs);
        }

    });
}

router.get('/all/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = req.params.uid;
    getRequestByUser(res, uid);
});

export async function deleteRequest(rid) {
    if (!rid) return {error: "No id"};

    const delQuery = Request.findOneAndDelete({_id: rid});
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

        fuid = doc._id;
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
        _id: req._id,
        type: "outgoing",
        user: {_id: friendsCheck.fuid, username: friendname},
        timestamp: req.timestamp
    };

    const receiverReq = {
        _id: req._id,
        type: "incoming",
        user: {_id: uid, username},
        timestamp: req.timestamp
    };

    return {error: false, sender: senderReq, receiver: receiverReq};
}

export default router;