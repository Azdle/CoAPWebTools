var dgram = require('dgram');
var Buffer = require('buffer').Buffer;
var http = require("http");
var WebSocketServer = require("ws").Server;
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;

var host_port_re = new RegExp("\/wdp\/([^\/]+)/([0-9]+)\/?");

var whitelist = [
  {host: RegExp("localhost"), port: RegExp("\\d+")},
  {host: RegExp("coap\.exosite\.com"), port: RegExp("5683")},
  {host: RegExp("udp\.exosite\.com"), port: RegExp("18494")},
];

app.use(express.static(__dirname + "/static/"));

var server = http.createServer(app);
server.listen(port);

console.log("http server listening on %d", port);

var verifyPathOnConnect = function(info, cb) {
  console.log(info);
  console.log(info.req.url);

  var host_port_list = host_port_re.exec(info.req.url);

  if (host_port_list === null) {
    console.log("bad request")
    cb(false, 400, "Bad Request")
    return;
  }

  var host = host_port_list[1];
  var port = host_port_list[2];

  var dest_in_whitelist = whitelist.some(function(pattern) {
    return pattern.host.exec(host) !== null  &&
           pattern.port.exec(port) !== null;
  })

  if (!dest_in_whitelist) {
    console.log("attempted connection on non-whitelisted dest: " +
                 info.req.url)
    cb(false, 403, "Forbidden")
    return;
  }

  cb(true)
}

var wss = new WebSocketServer({server: server, verifyClient: verifyPathOnConnect});
console.log("websocket server created");


wss.on("connection", function(ws) {
  var usock = dgram.createSocket("udp4");

  var host_port_list = host_port_re.exec(ws.upgradeReq.url);
  var host = host_port_list[1];
  var port = host_port_list[2];

  usock.on("message", function(msg, rinfo) {
    console.log("usock got message");
    ws.send(msg);
  });

  usock.on("listening", function () {
    var address = usock.address();
    console.log("usock listening " +
        address.address + ":" + address.port);
  });

  usock.on("error", function (err) {
    console.log("server error:\n" + err.stack);
    usock.close();
  });

  ws.on("close", function() {
    console.log("websocket connection close");
    usock.close();
  })

  ws.on("message", function(msg) {
    console.log("websocket got message", msg);
    console.log(msg, 0, msg.length, port, host)
    if (msg != null && msg.length > 0) {
      usock.send(msg, 0, msg.length, port, host);
    } else {
      console.warn("received message with zero length, dropping");
    }
  })

  console.log("websocket connection open, proxying to " + host + ":" + port);
})
