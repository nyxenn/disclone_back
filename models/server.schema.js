import mongoose from "mongoose";
import {channelSchema} from "./channel.schema.js";

const serverSchema = new mongoose.Schema({
    name: String,
    members: [{type: mongoose.Schema.Types.ObjectId, ref: "User"}],
    channels: [channelSchema],
    invite: String,
    creator: {type: mongoose.Schema.Types.ObjectId, ref: "User"}
});

export default mongoose.model('Server', serverSchema);