import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
    id: String,
    name: String,
    members: Array,
    channels: Array
})

export default mongoose.model('Server', serverSchema);