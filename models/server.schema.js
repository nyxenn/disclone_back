import mongoose from "mongoose";
import {seq} from "../database.js";

const serverSchema = new mongoose.Schema({
    name: String,
    members: [Number],
    channels: Array
});

serverSchema.plugin(seq, {inc_field: "sid", start_seq: 100, inc_amount: 3});

export default mongoose.model('Server', serverSchema);