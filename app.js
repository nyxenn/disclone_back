import express from "express";
import db from "./database.js"; // Needed to start database on run
import cors from "cors";

const app = express();
const port = 3000;

// Route imports
import user from './routes/user.js';
import server from './routes/server.js';
import conversation from './routes/conversation.js';
import request from './routes/request.js';

// Start backend app
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// middleware
app.use(cors({
  'allowedHeaders': ['Content-Type'],
  'origin': '*',
  'preflightContinue': true
}));
app.use(express.json());
app.use(express.urlencoded());

// Routes
app.use('/user', user)
app.use('/server', server);
app.use('/conv', conversation);
app.use('/req', request);