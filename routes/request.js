import express from "express";
import Request from '../models/request.schema.js';

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
    Request.find({ $or: [{'receiver': uid}, {'sender': uid}] }).select('-_id -__v').populate("receiverName senderName", "username -_id").exec(function(err, reqs) {
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

export function deleteRequest(res, rid, uid) {
    Request.deleteOne({rid}, (err) => {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }

        getRequestByUser(res, uid);
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
}) 

export default router;