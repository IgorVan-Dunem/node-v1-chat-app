const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  getUser,
  getUsersInRoom,
  removeUser,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
// Path to the directory that will be served || Caminho para a pasta que será servida
const publicDirectoryPath = path.join(__dirname, "../public");

// Setup the path
app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  console.log("New WebSocket connection!");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("Message", generateMessage("> AD <", "Welcome"));
    socket.broadcast
      .to(user.room)
      .emit(
        "Message",
        generateMessage("> AD <", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  socket.on("SendMessage", (text, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(text)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit("Message", generateMessage(user.username, text));
    callback();
  });

  socket.on("SendLocation", (location, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${location.latitude},${location.longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "Message",
        generateMessage("> AD <", `${user.username} has left!`)
      );
      io.tO(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server up on port ${port}`);
});
