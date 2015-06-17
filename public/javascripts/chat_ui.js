function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if (message.chatAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#message').prop('scrollHeight'));
    }

    $('#send-message').val('');
}

//创建socket
var socket = io.connect();

$(document).ready(function() {

    var chatApp = new Chat(socket);    

    //显示更名尝试的结果
    socket.on('nameResult', function(result) {
        var message;

        if (result.success) {
            message = '您当前的姓名是 ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    //显示房间变更结果
    socket.on('joinResult', function(result) {
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('房间已切换.'));
    });

    //显示接收到的消息
    socket.on('message', function(message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    //显示可用房间列表
    socket.on('rooms', function(rooms) {
        $('#room-list').empty();

        for(var i = 0, l = rooms.length; i < l; i++) {
            if (room[i] != '') {
                $('#room-list').append(divEscapedContentElement(rooms[i]));
            }
        }

        //点击房间名可切换到那个房间中
        $('#room-list div').click(function() {
            chatApp.processCommand('/join ' + $(this).text());
            //光标定位
            $('#send-message').focus();
        });
    });

    //定期请求可用房间列表
    setInterval(function() {
        socket.emit('rooms');
    }, 1000);
  
    //光标定位
    $('#send-message').focus();
    
    //提交表单可以发送聊天消息
    $('#send-form').submit(function() {
        processUserInput(chatApp, socket);
        return false;
    });
});

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if (message.charAt(0) == '/') {

        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#send-message').val('');
}
