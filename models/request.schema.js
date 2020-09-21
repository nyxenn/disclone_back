import mongoose from "mongoose";
import {seq} from "../database.js";

const requestSchema = new mongoose.Schema({
    receiver: Number,
    sender: Number,
    timestamp: Number
},
{
    id: false,
    toObject: {vrituals: true},
    toJSON: {virtuals: true}
});

requestSchema.virtual("receiverName", {
    ref: "User",
    localField: 'receiver',
    foreignField: 'uid',
    justOne: true,
});
requestSchema.virtual("senderName", {
    ref: "User",
    localField: 'sender',
    foreignField: 'uid',
    justOne: true,
});

requestSchema.plugin(seq, {inc_field: "rid", start_seq: 100, inc_amount: 3});

export default mongoose.model('Request', requestSchema);