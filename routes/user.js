import express from "express";
import User from '../models/user.schema.js';
import bcrypt from 'bcrypt';

const router = express.Router();
const saltRounds = 10;

router.use(function timeLog (req, res, next) {
    console.log('Time: ', Date.now());
    next();
});

router.get('/users', function(req, res) {
    User.find(function (err, users) {
        if (err) return console.error(err);
        res.send(users);
    });
});

router.post('/register', function(req, res) {
    const { id, username } = req.body;
    const password = bcrypt.hashSync(req.body.password, saltRounds);
    const user = new User({ id, username: username.toLowerCase(), password });

    user.save(function (err, user) {
        if (err) res.sendStatus(400);
        res.status(200).json(user);
    })
});

export default router;