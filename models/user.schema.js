import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    friends: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}]
});

userSchema.pre("save", function(next) {
    const doc = this;

    if (doc._id) next();

    User.find({username: doc.username}, function(err, docs) {
        if (!docs.length) next();
        else {
            const s = "User exists: " + doc.username;
            const e = new Error(s);
            e.stack = false;
            next(e);
        }
    });
});

const User = mongoose.model("User", userSchema);
export default User;