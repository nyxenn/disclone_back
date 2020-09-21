import mongoose from "mongoose";
import {seq} from "../database.js";

const conversationSchema = new mongoose.Schema({
    members: [Number],
    history: Array,
    "date-created": Number
},
{
    id: false,
    toObject: {vrituals: true},
    toJSON: {virtuals: true}
});

conversationSchema.virtual('memberdetails', {
    ref: 'User',
    localField: 'members',
    foreignField: 'uid',
});

conversationSchema.plugin(seq, {inc_field: "dmid", start_seq: 100, inc_amount: 3});

export default mongoose.model('Conversation', conversationSchema);