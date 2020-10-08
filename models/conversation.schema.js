import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    history: {type: Array, default: []},
    "date-created": {type: Number, default: Date.now() / 1000},
    group: {type: Boolean, default: false}
});

export default mongoose.model('Conversation', conversationSchema);