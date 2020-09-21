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

router.post('/add', async function(req, res) {
    let {uid, fuid, rid} = req.body;
    if (!uid || !fuid || !rid) return res.status(400).send("No data");

    uid = parseInt(uid);
    fuid = parseInt(fuid);
    rid = parseInt(rid);
    if (isNaN(uid) || isNaN(fuid) || isNaN(rid)) return res.status(400).send("Parse error"); 

    const reqQuery = Request.findOne({rid});
    const reqResult = await reqQuery.exec();
    
    if (!reqResult) {
        console.log("No request found");
        return res.status(400).send("No request");
    }

    if (reqResult.receiver !== uid || reqResult.sender !== fuid) {
        console.log("Request data does not match");
        return res.status(400).send("Data error");
    }

    const userQuery = User.find({uid: {$in: [uid, fuid]}});
    const userResults = await userQuery.exec();

    

    User.find({uid: {$in: [uid, fuid]}}, (err, users) => {
        if (!users || users.length !== 2) {
            console.log("Friend request user count error");
            return res.status(400).send("Count error");
        }

        for (let u of users) {
            let added = [uid, fuid].some(friend => u.friends.includes(friend));
    
            if (added) {
                console.log("Users already friends");
                break;
            }
    
            (u.uid === uid) ? u.friends.push(fuid) : u.friends.push(uid);
            u.save(function(saveErr) { if(saveErr) console.log("Save error ", saveErr) });
        }

    });
    
    deleteRequest(res, rid, uid);
});



export default router;