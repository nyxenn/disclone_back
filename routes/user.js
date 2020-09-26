import express from "express";
import User from '../models/user.schema.js';
import Request from '../models/request.schema.js';
import bcrypt from 'bcrypt';
import {deleteRequest} from './request.js';

const router = express.Router();
const saltRounds = 10;

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

router.get('/u/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = parseInt(req.params.uid);

    User.findOne({uid}, function(err, user) {
        if (err) {
            console.error(err);
            return res.status(400).send(err);
        }

        return res.status(200).json({uid: user.uid, username: user.username});
    });
})

router.post('/register', function(req, res) {
    if (!req.body.username || !req.body.password) return res.status(400).send("No data");
    const username = req.body.username.toLowerCase();
    const password = bcrypt.hashSync(req.body.password, saltRounds);
    const user = new User({username, password});

    user.save(function (err, user) {
        if (err) {
            console.error("Regisration error: ", err.message);
            return res.status(400).send(err.message);
        }

        console.log(`Registererd user ${username}`);
        return res.status(200).json({uid: user.uid, username: user.username, friends: user.friends});
    })
});

router.post('/login', function(req, res) {
    if (!req.body.username || !req.body.password) return res.status(400).send("No data");
    const {username, password} = req.body;

    User.findOne({username: username.toLowerCase()}, '-_id -__v', function(err, user) {
        if (err) return res.status(400).send(err);
        if (!user) return res.status(400).send("No user");
        if (!bcrypt.compareSync(password, user.password)) return res.status(400).send("Invalid password");

        user.password = undefined;
        console.log(`User ${username.toLowerCase()} logged in`);
        return res.status(200).json(user);
    })
});

router.post('/members', function(req, res) {
    const {members, server} = req.body;
    if (!members || !server) return res.status(400).send("No data");
    
    User.find({uid: members}).select("username uid -_id").exec(function(err, users) {
        if (err) {
            console.error(err);
            return res.status(400).send(err);
        }

        console.log(`Getting members for "${server}"`);
        return res.status(200).json(users);
    })
});

router.post('/friends', function(req, res) {
    const {friends} = req.body;
    if (!friends) return res.status(400).send("No data");

    User.find({uid: friends}, 'username uid -_id', function(err, users) {
        if (err) return res.status(400).send(err);

        return res.status(200).json(users);
    });
});

async function checkIfFriends(uid, fuid) {
    const uQuery = User.findOne({uid});
    const uRes = await uQuery.exec();

    if (!uRes) return {error: "No user"};
    if (uRes.friends.indexOf(fuid) >= 0) return {error: "Already friends"};
    return {error: false}
}

export async function addFriends(uid, fuid) {
    if (!uid || !fuid) return { error: "No user ids" };

    uid = parseInt(uid);
    fuid = parseInt(fuid);
    if (isNaN(uid) || isNaN(fuid)) return { error: "No valid user ids" };

    const friendsCheck = await checkIfFriends(uid, fuid);
    if (friendsCheck.error) return friendsCheck;

    const rQuery = User.findOneAndUpdate({uid}, { $push: { friends: fuid} });
    const sQuery = User.findOneAndUpdate({uid: fuid}, { $push: { friends: uid} });
    const rRes = await rQuery.exec();
    const sRes = await sQuery.exec();

    if (!rRes.friends.includes(fuid)) rRes.friends.push(fuid);
    if (!sRes.friends.includes(uid)) sRes.friends.push(uid);
    
    return { error: false, receiver: {uid: sRes.uid, username: sRes.username}, sender: {uid: rRes.uid, username: rRes.username} };
}



export default router;