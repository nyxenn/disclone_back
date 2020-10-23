import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: String,
    username_lower: String,
    password: String,
    friends: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}]
});

userSchema.pre("save", function(next) {
    const doc = this;

    User.find({username_lower: doc.username.toLowerCase()}, function(err, docs) {
        if (!docs.length) {
            next();
        }
        else {
            const s = "Username already taken";
            const e = new Error(s);
            e.stack = false;
            next(e);
        }
    });
});

const User = mongoose.model("User", userSchema);
export default User;