import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
    receiver: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    timestamp: Number
});

export default mongoose.model('Request', requestSchema);