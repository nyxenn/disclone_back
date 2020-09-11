import mongoose from "mongoose";
import { Timestamp } from "mongodb";

const messageSchema = new mongoose.Schema({
    user: String,
    message: String,
    timestamp: Timestamp
})

export default mongoose.model('Message', messageSchema);