import express from "express";
import Conversation from '../models/conversation.schema.js';
import app from "../app.js";

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
    if (!req.params.dmid) {
        console.log("No id specified");
        return res.status(400).send("No id");
    }

    const dmid = req.params.dmid;

    Conversation.findOne({dmid}, "history -_id", function(err, history) {
        if(err) {
            console.log(err);
            return res.status(400).send(err);
        }

        return res.status(200).json(history);
    });
});

export async function sendMessage(msg, dmid) {
    if (!msg || !dmid) {
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

    const convQuery = Conversation.findOne({dmid}, (err, conv) => {
        if (err || !conv) {
            console.log(err);
            return false;
        }

        const historyLength = conv.history.length;
        message.mid = historyLength ? conv.history[historyLength - 1].mid + 1 : 1;
        conv.history.push(message);

        conv.history.sort(function(x, y) {
            return x.timestamp - y.timestamp
        });

        conv.save(function(saveErr) { if(saveErr) console.log("Save error ", saveErr) });
        return message.mid;
    });
    const convResult = await convQuery.exec();

    return message;
}

router.post('/msg', function(req, res) {
    setTimeout(() => {
        if (!req.body.msg || !req.body.socket) {
            console.log("No body");
            return res.status(400).send("No body");
        }
        const {msg, socket} = req.body;
    
        if (!msg.dmid || !msg.message || !msg.user) {
            console.log("No message");
            return res.status(400).send("No message");
        }
        const message = {
            mid: null,
            user: msg.user,
            message: msg.message,
            timestamp: msg.timestamp
        }
    
        Conversation.findOne({dmid: msg.dmid}, function(err, conv) {
            if (err || !conv) {
                console.log(err);
                return res.status(400).send(err);
            }
            const historyLength = conv.history.length;
            message.mid = historyLength ? conv.history[historyLength - 1].mid + 1 : 1;
            conv.history.push(message);
    
            conv.history.sort(function(x, y) {
                return x.timestamp - y.timestamp
            });
    
            conv.save(function(saveErr) { if(saveErr) console.log("Save error ", saveErr) });
            socket.broadcast.emit('newMessage', message);
            return res.status(200);
        });
    }, 1000);
    
});

export default router;