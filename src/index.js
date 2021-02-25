const express = require('express');
const http = require('http')
const path = require("path")
const socketio = require('socket.io')
const Filter = require('bad-words')
const {
	generateMessage,
	generateLocationMessage,
} = require("./utils/messages");
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
//to use socket.io is necessary to use http.createServer intead of express
const server = http.createServer(app);
//setup socket.io with the server to work
const io = socketio(server)

const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// let count = 0;

// server (emit) => client (receive) - countUpdated
// clent (emit) => server (receive) - increment

//print a message to the console when a client connect to socket.io
//socket is an objet that contain information about the conection and also containt methos to work with the conection client 
io.on('connection', (socket) => {
	console.log("New WebSocket conection");

	socket.on('join', ({username, room}, callback) => {
		const {error, user} = addUser({ id: socket.id, username, room})

		if(error) {
			return callback(error)
		}

		//join is a method that only can be use in the server side. Join a user to an specific room
		socket.join(user.room);

		//send a message to the joined user
		socket.emit("message", generateMessage(user.username ,"Welcome to the server!"));
		//send a message to all users except the joined user (to limit the message to only an specific room)
		socket
			.to(user.room)
			.broadcast.emit("message", generateMessage(`${user.username} has joined!`));
		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room)
		})
		
		callback()
	})

	socket.on("newMessage", (message, callback) => {
		const user = getUser(socket.id)

		const filter = new Filter();

		if (filter.isProfane(message)) {
			return callback("Profanity is not allowed!");
		}

		//send a message to all users, the first argument is the action and the second is a callback with an value that will need the action to execute.
		io.to(user.room).emit("message", generateMessage(user.username, message));

		callback();
		//callback function to send acknowledge
	});

	socket.on("location", ({ latitude, longitude }, acknowledge) => {
		const user = getUser(socket.id)

		io.to(user.room).emit(
			"locationMessage",
			generateLocationMessage(user.username,
				`https://google.com/maps?q=${latitude},${longitude}`
			)
		);
		acknowledge("Location shared!");
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id)

		if(user) {
			io.to(user.room).emit("message", generateMessage(`${user.username} has left!`));

			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room)
			})
		}

	});

	//send an event to the client, the first argument is the event's name, the second argument pass to the client as a callback function
	// socket.emit("countUpdated", count);

	//receive an event from the client
	// socket.on("increment", () => {
	// 	count++;

	//send the new count to the client, just for a single conection
	//socket.emit("countUpdated", count);

	//send the new count to the client, for all conections
	//   io.emit("countUpdated", count);
	// });
})

server.listen(port, () => {
	console.log("Server is up on port " + port);
});
