import express from "express";
import db from "./database.js"; // Needed to start database on run

const app = express();
const port = 3000;

// Route imports
import user from './routes/user.js';
import server from './routes/server.js';

// Start backend app
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// middleware
app.use(express.json());
app.use(express.urlencoded());

// Routes
app.use('/user', user)
app.use('/server', server);