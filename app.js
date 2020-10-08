import express from "express";
import db from "./database.js"; // Needed to start database on run
import cors from "cors";
import http from "http";
import socket from "socket.io";

// Route imports
import userRoute, {addFriends, deleteFriend} from './routes/user.js';
import serverRoute, {sendChannelMessage} from './routes/server.js';
import conversationRoute, {sendMessage} from './routes/conversation.js';
import requestRoute, {sendRequest, deleteRequest} from './routes/request.js';

const app = express();
const port = 3000;

function getDateString() {
  const d = new Date();
  const hours = (d.getHours() > 10 ? '' : '0') + d.getHours();
  const minutes = (d.getMinutes() > 10 ? '' : '0') + d.getMinutes();
  const seconds = (d.getSeconds() > 10 ? '' : '0') + d.getSeconds();
  return `${hours}:${minutes}:${seconds}`;
}

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
  const host = req.headers.host;
  const method = req.method;
  const url = req.originalUrl;
  const request = `${host} ${method} ${url}`;

  req.io = io;
  console.log(`[${getDateString()}]: ${request}`);
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
  const host = socket.handshake.headers.host;
  console.log("Client connected:", host);

  socket.on('join', function(username) {
    console.log(`[${getDateString()}]: ${host} /socket.io/join`);
    socket.join(username);
  });

  socket.on('room', function(room) {
    console.log(`[${getDateString()}]: ${host} /socket.io/room`);
    socket.join(room);
  });

  socket.on('leave', function(room) {
    console.log(`[${getDateString()}]: ${host} /socket.io/leave`);
    socket.leave(room);
  });

  socket.on('sendDM', async function(msg, dmid) {
    console.log(`[${getDateString()}]: ${host} /socket.io/sendDM`);
    const result = await sendMessage(msg, dmid);
    if (result) {
      setTimeout(() => io.in(dmid).emit("new-dm-msg", result, dmid), 100);
    }
  });

  socket.on('sendChannel', async function(msg, sid, cid) {
    console.log(`[${getDateString()}]: ${host} /socket.io/sendChannel`);
    const result = await sendChannelMessage(msg, sid, cid);
    if (result) io.in(sid + "&" + cid).emit("new-ch-msg", result, sid, cid);
  });

  socket.on('sendRequest', async function(uid, username, friendname) {
    console.log(`[${getDateString()}]: ${host} /socket.io/sendRequest`);
    const res = await sendRequest(uid, username, friendname);

    if (res.error) {
      console.log(res.error);
      return;
    }

    io.in(friendname).emit("new-req", res.receiver);
    io.in(username).emit("new-req", res.sender);
  });

  socket.on('deleteRequest', async function(rid, friendname) {
    console.log(`[${getDateString()}]: ${host} /socket.io/deleteRequest`);
    const res = await deleteRequest(rid);

    if (res.error) {
      console.log(res.error);
      return;
    }
    
    io.in(friendname).emit("del-req", rid);
    socket.emit("del-req", rid);
  });

  socket.on('acceptRequest', async function(rid, uid, fuid, friendname) {
    console.log(`[${getDateString()}]: ${host} /socket.io/acceptRequest`);
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

    console.log(addRes);

    // Return rid, friend object to update users' friend and request lists in the browser
    io.in(friendname).emit("acc-req", rid, addRes.sender);
    socket.emit("acc-req", rid, addRes.receiver);
  });

  socket.on("deleteFriend", async (user, friend) => {
    console.log(`[${getDateString()}]: ${host} /socket.io/deleteFriend`);

    if (!user || !user.username || !user.uid) return console.log("No user information");
    if (!friend || !friend.username || !friend.uid) return console.log("No friend information");

    const deleteResult = await deleteFriend(user.uid, friend.uid);
    if (deleteResult.error) return console.log(deleteResult.error);

    io.in(user.username).emit("del-friend", friend.uid);
    io.in(friend.username).emit("del-friend", user.uid);
  });
});




export default {app};