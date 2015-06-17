var socketio = require('socket.io');
var io;
var guestNumber = 1;   //用户索引
var nickNames= {};     //socket_id:昵称
var namesUsed = [];    //已使用的昵称
var allRooms = [];
var currentRoom = {};  //socket_id:room

exports.listen = function(server) {
    //在http基础上搭建socket服务
    io = socketio.listen(server);

    //设置日志等级
    //io.set('log level', 1);

    //定义每个用户连接的处理逻辑
    io.sockets.on('connection', function (socket) {
        console.log('new socket id: ' + socket.id);

        //赋予用户访问名
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        //将用户加入默认聊天室Lobby
        joinRoom(socket, 'Lobby');

        //处理消息广播, 当新用户加入时，处理广播
        handleMessageBoardcasting(socket, nickNames);
        //处理用户名称更名,  
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        //处理聊天室加入 
        handleRoomJoining(socket);

        //请求聊天室列表 ??
        //allRooms.push('hello');
        socket.on('rooms', function() {
            socket.emit('rooms', allRooms);
        });
        
        //定义用户断开连接后清楚逻辑
        handleClientDisconnection(socket, nickNames, namesUsed);

    });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    //生成昵称
    var name = 'Guest' + guestNumber;
    //昵称和客户端ID关联
    nickNames[socket.id] = name;
    //返回用户名称
    socket.emit('nameResult', {
        success: true, 
        name: name
    });
    //存放已经被占用的昵称
    namesUsed.push(name);
    //昵称计数器++
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    //让用户进入房间

    socket.join(room);

    //遍历当前rooms

    allRooms = [];
    for(var cur in io.sockets.adapter.rooms) {
        //如果要加入的room已经存在
        if(cur != Object.keys(io.sockets.adapter.rooms[cur])){
            allRooms.push(cur);
        }
    }
    console.log('allRooms : ' + allRooms)
        
    //记录用户的当前房间
    currentRoom[socket.id] = room;
    //让用户知道他们的进入了新的房间
    socket.emit('joinResult', {room: room});

    //向该房间的其它人广播消息
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' 加入房间 ' + room + '.'
    });
    
    //寻找该房间内的socket
    var usersInRoom = io.sockets.adapter.rooms[room];
    
    var usersInRoomSummary = '当前在 ' + room + ' 房间的用户有: ';
    var index = 0
    for(var socketId in usersInRoom) {
        //console.log('.....socketId: ' + socketId);
        //if(socketId != socket.id) {
            if (index > 0) {
                usersInRoomSummary += ', ';
            }
            usersInRoomSummary += nickNames[socketId];
        //}
        index++;
    }
    usersInRoomSummary += '.';
    //将房间里的其他用户汇总发送给这个用户
    socket.emit('message', {text: usersInRoomSummary});
}

//监听更改昵称
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function(name) {
        //昵称不能以Guest开头
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: '用户名不能已 "Guest" 开头.'
            });
        } else {
            //如果昵称还未被注册
            if (namesUsed.indexOf(name) == -1) {
                //获取上一个名称
                var previousName = nickNames[socket.id];
                //获取上一个名称索引
                var previousNameIndex = namesUsed.indexOf(previousName);
                //将新名称加入数组
                namesUsed.push(name);
                //更新名称
                nickNames[socket.id] = name;
                //删除上次昵称
                delete namesUsed[previousNameIndex];

                socket.emit('nameResult', {
                    success: true,
                    name: name
                });

                //向改房间内的人通知结果
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' 更名为 ' + name + '.'
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: '用户名已被使用.'
                });
            }
        }
    });
}

function handleMessageBoardcasting(socket) {
    socket.on('message', function(message) {
        if(message.text != '') {
            socket.broadcast.to(message.room).emit('message', {
                text: nickNames[socket.id] + ': ' + message.text
            });
        }
    });
}

function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

