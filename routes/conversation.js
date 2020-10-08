import express from "express";
import Conversation from '../models/conversation.schema.js';

const router = express.Router();

router.get('/simple/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = req.params.uid;

    Conversation.find({members: uid}).select('-history').populate('members', 'username').exec(function(err, convs) {
        if (err) {
            console.log(err);
            return res.status(400).send(err);
        }
        
        
        return res.status(200).json(convs);
    });
});

router.get('/history/:dmid', function(req, res) {
    if (!req.params.dmid) {
        console.log("No id specified");
        return res.status(400).send("No id");
    }

    const dmid = req.params.dmid;

    Conversation.findOne({_id: dmid}, "history", function(err, history) {
        if(err) {
            console.log(err);
            return res.status(400).send(err);
        }

        return res.status(200).json(history);
    });
});

async function getDM(uid, fuid) {
    const convQuery = Conversation.findOne({group: false, $or: [{'members': [uid, fuid]}, {'members': [fuid, uid]}]}).populate('members', 'username');
    return convQuery.exec();
}

async function createDM(uid, fuid) {
    let newConv = new Conversation({members: [uid, fuid]});
    newConv = await newConv.save();
    await Conversation.populate(newConv, {path: "members", select: "username"});
    return newConv;
}

router.post('/open', async function(req, res) {
    if (!req.body.uid || !req.body.fuid) {
        console.log("No user ids");
        return res.status(400).send("No ids");
    }

    const {uid, fuid} = req.body;

    let conv = await getDM(uid, fuid);

    if (!conv) {
        console.log("No conversation found, creating");
        conv = await createDM(uid, fuid);
        for (let u of conv.members) {
            req.io.in(u.username).emit("new-dm", {dmid: conv.dmid, members: conv.members, "date-created": conv["date-created"]});
        }
    }

    const returnConv = {
        dmid: conv.dmid,
        history: conv.history,
        members: conv.members,
        "date-created": conv["date-created"]
    }

    return res.status(200).json(returnConv);
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

    const convQuery = Conversation.findOne({_id: dmid}, (err, conv) => {
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

export default router;