import mongoose from "mongoose";

export const channelSchema = new mongoose.Schema({
    name: String,
    history: {type: Array, default: []}
});

export default mongoose.model('Channel', channelSchema);