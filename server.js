const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");

//we initialize socket here
//it will handle all the connection and disconnection events on the server
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});

app.use(express.static("public"));

// this runs when the user accesses the root url
// it redirects to a new url which acts as a new room
app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

//this runs when a user tries to join a currently existing room
//it renders the room view
app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

// connection events of the socket objects are handled here
io.on("connection", (socket) => {
  //event called by peer
  //when a client joins the room it is read by socket which in turn executes a function
  //the fucntion joins the user using the socket of that room
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    //when a new user connects into the room the message 
    socket.to(roomId).broadcast.emit("new-user-connected", userId);
    // here we have used socket to handle the message event
    // when msg event is triggered it emits a createMessage event to all the users
    // do that all the users can see the message
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
    //when a user leaves client_disconnected event is initiated which is read here
    //here a reove_disconnected_user event is emitted to the entire room so that
    //the disconnected video is removed from all the remaining participants streams
    socket.on("client_disconnected", (id_room, id_vid)=>{
      io.to(id_room).emit("remove_disconnected_video", id_vid);
    });
  });
});

server.listen(process.env.PORT || 3030);
