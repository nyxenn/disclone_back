import mongoose from "mongoose";
import sequence from "mongoose-sequence";

mongoose.connect('mongodb://localhost/disclone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});
const db = mongoose.connection;
const seq = sequence(db);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Database connection opened');
});

export default db;
export {seq};