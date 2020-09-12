import express from "express";
import User from '../models/user.schema.js';
import bcrypt from 'bcrypt';

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

// router.get('/users', function(req, res) {
//     User.find(function (err, users) {
//         if (err) {
//             console.error(err);
//             return res.sendStatus(400);
//         }

//         users = users.map(u => u = {id: u.id, username: u.username});
//         return res.status(200).json(users);
//     });
// });

router.get('/u/:uid', function(req, res) {
    if (!req.params.uid) return res.sendStatus(400);
    const uid = parseInt(req.params.uid);

    User.findOne({uid}, function(err, user) {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }

        return res.status(200).json({uid: user.uid, username: user.username});
    });
})

router.post('/register', function(req, res) {
    if (!req.body.username || !req.body.password) return res.sendStatus(400);
    const username = req.body.username.toLowerCase();
    const password = bcrypt.hashSync(req.body.password, saltRounds);
    const user = new User({username, password});

    user.save(function (err, user) {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }

        console.log(`Registererd user ${username}`);
        return res.status(200).json({uid: user.uid, username: user.username});
    })
});

router.post('/login', function(req, res) {
    const {username, password} = req.body;
    if (!username || !password) return res.sendStatus(400);

    User.findOne({username: username.toLowerCase()}, function(err, user) {
        if (err) return res.sendStatus(400);
        if (!bcrypt.compareSync(password, user.password)) return res.sendStatus(401);

        console.log(`User ${username.toLowerCase()} logged in`);
        return res.status(200).json({uid: user.uid, username: user.username});
    })
});

router.get('/members', function(req, res) {
    const {members, server} = req.body;
    if (!members || !server) return res.sendStatus(400);
    
    User.find({uid: members}).select("-password -_id").exec(function(err, users) {
        if (err) {
            console.error(err);
            return res.sendStatus(400);
        }

        console.log(`Getting members for "${server}"`);
        return res.status(200).json(users);
    })
})

export default router;