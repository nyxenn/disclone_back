import mongoose from "mongoose";
import {seq} from "../database.js";

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

userSchema.plugin(seq, {inc_field: "uid", start_seq: 4, inc_amount: 3});

userSchema.pre("save", function(next) {
    const doc = this;

    User.find({username: doc.username}, function(err, docs) {
        if (!docs.length) next();
        else {
            const s = "User exists: " + doc.username;
            const e = new Error(s);
            e.stack = false;
            next(e);
        }
    });
})

const User = mongoose.model("User", userSchema);
export default User;