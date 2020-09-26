import express from "express";
import db from "./database.js"; // Needed to start database on run
import cors from "cors";
import http from "http";
import socket from "socket.io";

// Route imports
import userRoute, {addFriends} from './routes/user.js';
import serverRoute, {sendChannelMessage} from './routes/server.js';
import conversationRoute, {sendMessage} from './routes/conversation.js';
import requestRoute, {sendRequest, deleteRequest} from './routes/request.js';

const app = express();
const port = 3000;

// middleware
app.use(cors({
  'allowedHeaders': ['Content-Type'],
  'origin': '*',
  'preflightContinue': true,
}));

app.use(express.json());
app.use(express.urlencoded());

// Pass socket.io to routes
app.use((req, res, next) => { 
  req.io = io;
  next();
});

// Routes
app.use('/user', userRoute);
app.use('/server', serverRoute);
app.use('/conv', conversationRoute);
app.use('/req', requestRoute);


// Add socket.io
const server = http.createServer(app);
const io = socket(server);

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});




io.on('connection', function(socket) {
  console.log("Client connected");

  socket.on('join', function(username) {
      socket.join(username);
  });

  socket.on('room', function(room) {
    socket.join(room);
  });

  socket.on('sendDM', async function(msg, dmid) {
    const result = await sendMessage(msg, dmid);
    if (result) io.in(dmid).emit("new-dm-msg", result, dmid);
  });

  socket.on('sendChannel', async function(msg, sid, cid) {
    const result = await sendChannelMessage(msg, sid, cid);
    if (result) io.in(sid + "&" + cid).emit("new-ch-msg", result, sid, cid);
  });

  socket.on('sendRequest', async function(uid, username, friendname) {
    const res = await sendRequest(uid, username, friendname);

    if (res.error) {
      console.log(res.error);
      return;
    }

    io.in(friendname).emit("new-req", res.receiver);
    socket.emit("new-req", res.sender);
  });

  socket.on('deleteRequest', async function(rid, friendname) {
    const res = await deleteRequest(rid);

    if (res.error) {
      console.log(res.error);
      return;
    }
    
    io.in(friendname).emit("del-req", rid);
    socket.emit("del-req", rid);
  });

  socket.on('acceptRequest', async function(rid, uid, fuid, friendname) {
    // Delete request from database
    const deleteRes = await deleteRequest(rid);
    if (deleteRes.error) {
      console.log(deleteRes.error);
      return;
    }

    // Add users to each others friends list
    const addRes = await addFriends(uid, fuid);
    if (addRes.error) {
      console.log(addRes.error);
      return;
    }

    // Return rid, friend object to update users' friend and request lists in the browser
    io.in(friendname).emit("acc-req", rid, addRes.sender);
    socket.emit("acc-req", rid, addRes.receiver);
  })
});




export default {app};