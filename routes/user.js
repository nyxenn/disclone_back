import express from "express";
import User from '../models/user.schema.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const saltRounds = 10;

router.get('/u/:uid', function(req, res) {
    if (!req.params.uid) return res.status(400).send("No id");
    const uid = req.params.uid;

    User.findOne({_id: uid}, function(err, user) {
        if (err) {
            console.error(err);
            return res.status(400).send(err);
        }

        return res.status(200).json({_id: user._id, username: user.username});
    });
})

router.post('/register', function(req, res) {
    if (!req.body.username || !req.body.password) return res.status(400).send("No data");
    const username = req.body.username.toLowerCase();
    const password = bcrypt.hashSync(req.body.password, saltRounds);
    const user = new User({username, password, friends: []});

    user.save(function (err, user) {
        if (err) {
            console.error("Regisration error: ", err.message);
            return res.status(400).send(err.message);
        }

        console.log(`Registererd user ${username}`);
        return res.status(200).json({_id: user._id, username: user.username, friends: user.friends});
    })
});

router.post('/login', function(req, res) {
    if (!req.body.username || !req.body.password) return res.status(400).send("No data");
    const {username, password} = req.body;

    User.findOne({username: username.toLowerCase()}, '-__v', function(err, user) {
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
    
    User.find({_id: members}).select("username").exec(function(err, users) {
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

    User.find({_id: friends}, 'username', function(err, users) {
        if (err) return res.status(400).send(err);
        console.log(users);
        return res.status(200).json(users);
    });
});

async function checkIfFriends(uid, fuid) {
    const uQuery = User.findOne({_id: uid});
    const uRes = await uQuery.exec();

    if (!uRes) return {error: "No user"};
    if (uRes.friends.indexOf(fuid) >= 0) return {error: "Already friends"};
    return {error: false}
}

export async function addFriends(uid, fuid) {
    if (!uid || !fuid) return { error: "No user ids" };

    const friendsCheck = await checkIfFriends(uid, fuid);
    if (friendsCheck.error) return friendsCheck;

    const rQuery = User.findOneAndUpdate({_id: uid}, { $push: { friends: fuid} });
    const sQuery = User.findOneAndUpdate({_id: fuid}, { $push: { friends: uid} });
    const rRes = await rQuery.exec();
    const sRes = await sQuery.exec();

    if (!rRes.friends.includes(fuid)) rRes.friends.push(fuid);
    if (!sRes.friends.includes(uid)) sRes.friends.push(uid);
    
    return { error: false, receiver: {_id: sRes._id, username: sRes.username}, sender: {_id: rRes._id, username: rRes.username} };
}

export async function deleteFriend(uid, fuid) {
    if (!uid || !fuid) return { error: "No user ids" };

    const userQuery = User.updateMany({_id: [uid, fuid]}, {$pullAll: {friends: [uid, fuid]}});
    const userRes = await userQuery.exec();

    return userRes;
}


export default router;