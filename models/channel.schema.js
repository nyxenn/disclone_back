import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
    id: String,
    name: String,
    history: Array
})

export default mongoose.model('Channel', channelSchema);