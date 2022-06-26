var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8080);
console.log('Server listening on port: 8080');

// MongoDB
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://mongo:27017/mydb";

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
    if (err) {
        console.log(err);
    } else {
        console.log("Database connected.");
    }
    db.close();
});

/*
 *  ========================
 *          Rooting
 *  ========================
 */

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/about', function(req, res) {
    res.send('By Hugo Allegaert');
});

/*
 *  ========================
 *          Variables
 *  ========================
 */

// Users list
var connected_user = [];
var connected_user_id = [];

// Room list
var rooms = ['General', 'room 1', 'room 2', 'room 3'];
var private_rooms = [];
var default_room = 'General';

/*
 *  ========================
 *          Functions
 *  ========================
 */

function add_message_to_db(room, username, message) {
    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log(err);
            return;
        }
        var dbo = db.db("mydb");
        var myobj = { room_name: room, user: username, message: message };
        dbo.collection("messages").insertOne(myobj, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, res) {
            if (err) {
                console.log(err);
            } else {
                console.log("1 message inserted");
            }
            db.close();
        });
    });
}

io.sockets.on('connection', function(socket) {

    socket.on('add_user', function(username) {

        var index_us = connected_user.indexOf(username);

        if (index_us == -1) {
            connected_user.push(username);
            connected_user_id.push(socket.id);
        } else {
            socket.emit('update_chat', 'SERVER', 'Please reload page and chose another name ! :)');
            return;
        }

        socket.username = username;

        socket.room = default_room;

        socket.join(default_room);

        MongoClient.connect(url, function(err, db) {
            if (err) {
                console.log(err);
                return;
            }
            var dbo = db.db("mydb");
            var query = { room_name: default_room };
            dbo.collection("messages").find(query).toArray(function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                    socket.emit('update_chat_maj', result);
                }
                db.close();
            });
        });

        socket.emit('update_chat', 'SERVER', 'you have connected to ' + default_room);
        socket.emit('update_chat', 'SERVER', 'Welcome ' + socket.username);

        socket.broadcast.to(default_room).emit('update_chat', 'SERVER', username + ' has connected to this room');
        //add_message_to_db(default_room, 'SERVER', username + ' has connected to this room');
        socket.emit('update_rooms', rooms, 'General');
    });

    socket.on('add_rooms', function(room) {
        rooms.push(room);
        console.log("User: '" + socket.username + "' add room: '" + room + "'");
        io.to(socket.id).emit('update_chat', 'SERVER_PV', 'You add a room');
        io.emit('update_rooms', rooms, socket.room);
    });

    socket.on('remove_rooms', function(room) {
        const index = rooms.indexOf(room);
        console.log(rooms.toString())
        if (index > -1) {
            rooms.splice(index, 1);
            console.log("User: '" + socket.username + "' remove room: '" + room + "'");
        } else {
            console.log("User: '" + socket.username + "' tried to remove room: '" + room + "'");
        }
        io.to(socket.id).emit('update_chat', 'SERVER_PV', 'You remove a room');


        io.emit('update_rooms', rooms, socket.room);
    });

    socket.on('sendchat', function(data) {
        if (data == '') {
            return;
        }
        if (data[0] == '@') {
            var username = data.split(/ (.+)/)[0].substr(1);
            var message = data.split(/ (.+)/)[1];

            console.log(data.split(/ (.+)/));

            if ((username == null) || (username == '')) {
                io.to(socket.id).emit('update_chat', 'SERVER_PV', 'Faild PV :/, username is missing');
                return;
            }
            if ((message == null) || (message == '')) {
                io.to(socket.id).emit('update_chat', 'SERVER_PV', 'Faild PV :/, username is message');
                return;
            }

            MongoClient.connect(url, function(err, db) {
                if (err) {
                    console.log(err);
                    return;
                }
                var dbo = db.db("mydb");
                var myobj = { from: socket.username, to: username, message: message };
                dbo.collection("messages_PV").insertOne(myobj, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, res) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("1 private message inserted");
                    }
                    db.close();
                });
            });

            var i = connected_user.indexOf(username);
            if (i > -1) {
                io.to(connected_user_id[i]).emit('update_chat', 'PV:' + socket.username, message);

                io.to(socket.id).emit('update_chat', 'SERVER_PV', 'You send: ' + message + ' to: ' + username);
            } else {
                io.to(socket.id).emit('update_chat', 'SERVER_PV', 'User is offline now but she/he recieve message later');
            }



        } else {
            console.log("User: '" + socket.username + "' send: '" + data + "' in room: '" + socket.room + "'");
            add_message_to_db(socket.room, socket.username, data);
            io.sockets.in(socket.room).emit('update_chat', socket.username, data);
        }
    });

    socket.on('all_messages_in_room', function(room) {
        io.to(socket.id).emit('update_chat', 'SERVER_PV', 'OK PV :), you send :' + message + ' to: ' + username);
    });

    socket.on('get_private_message', function() {
        MongoClient.connect(url, function(err, db) {
            if (err) {
                console.log(err);
                return;
            }
            var dbo = db.db("mydb");
            var query = { $or: [{ from: socket.username }, { to: socket.username }] };
            dbo.collection("messages_PV").find(query).toArray(function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                    socket.emit('return_private_message', result);
                }
                db.close();
            });
        });
    });

    socket.on('switch_room', function(newroom) {
        if (newroom !== socket.room) {
            socket.leave(socket.room);
            socket.join(newroom);
            socket.emit('update_chat', 'SERVER', 'you have connected to ' + newroom);
        }

        socket.broadcast.to(socket.room).emit('update_chat', 'SERVER', socket.username + ' has left this room');
        //add_message_to_db(socket.room, 'SERVER', socket.username + ' has left this room');

        console.log("User: '" + socket.username + "' switch room from: '" + socket.room + "' to: '" + newroom + "'");

        socket.room = newroom;

        socket.broadcast.to(newroom).emit('update_chat', 'SERVER', socket.username + ' has joined this room');
        //add_message_to_db(newroom, 'SERVER', socket.username + ' has joined this room');

        socket.emit('update_rooms', rooms, newroom);


        MongoClient.connect(url, function (err, db) {
            if (err) {
                console.log(err);
                return;
            }
            var dbo = db.db("mydb");
            var query = {room_name: socket.room};
            dbo.collection("messages").find(query).toArray(function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    socket.emit('update_chat_maj', result);
                }
                db.close();
            });
        });
    });

    socket.on('get_user_in_room', function(room) {
        user_in_room = [];
        console.log("In " + room + ": ");
        try {
            for (socketID in io.nsps['/'].adapter.rooms[room].sockets) {
                const nickname = io.nsps['/'].connected[socketID].username;
                console.log(nickname);
                user_in_room.push(nickname);
            }
        } catch (err) {
            console.log(room + ' is empty !');
        } finally {
            console.log(user_in_room);
            socket.emit('return_user_in_room', user_in_room);
        }
    });

    socket.on('disconnect', function() {

        // Update connected users$
        var index_us = connected_user.indexOf(socket.username);
        if (index_us > -1) {
            connected_user.splice(index_us, 1);
        }

        var index = connected_user_id.indexOf(socket.id);
        if (index > -1) {
            connected_user_id.splice(index, 1);
        }

        io.sockets.emit('updateusers', connected_user);

        socket.broadcast.emit('update_chat', 'SERVER', socket.username + ' has disconnected');

        socket.leave(socket.room);
    });
});


