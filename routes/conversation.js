import express from "express";
import Conversation from '../models/conversation.schema.js';

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

router.get('/simple/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = parseInt(req.params.uid);

    Conversation.find({members: uid}).select('-_id -__v -history').populate('memberdetails', 'uid username -_id').exec(function(err, convs) {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }
        
        convs = convs.map(c => {
            c.members = undefined;
            return c;
        })
        return res.status(200).json(convs);
    });
});

router.get('/history/:dmid', function(req, res) {
    if (!req.params.dmid) return res.status(400).send("No id");
    const dmid = req.params.dmid;

    Conversation.findOne({dmid}, "history -_id", function(err, history) {
        if(err) {
            console.log(err);
            return res.status(400).send(err);
        }

        return res.status(200).json(history);
    });
})

export default router;