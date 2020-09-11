import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: String,
    username: String,
    password: String
});

userSchema.pre('save', function(next) {
    const self = this;

    User.find({username: self.username}, function(err, docs) {
        if (!docs.length) next();
        else {
            console.log('User exists: ', self.username);
            next(new Error("User exists"));
        }
    });
})

const User = mongoose.model('User', userSchema);
export default User;