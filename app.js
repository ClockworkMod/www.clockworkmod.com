
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var url = require('url');

var app = module.exports = express.createServer();


var ajax = function(urlStr, callback) {
 var u = url.parse(urlStr);
 http.get({ host: u.host, port: u.port, path: u.pathname + (u.search ? u.search : ''), headers: {'Accept': '*/*', 'User-Agent': 'curl'} },
   function(res) {
     var data = '';
     res.on('data', function(chunk) {
       data += chunk;
     }).on('end', function() {
       try {
         callback(null, eval("(" + data + ")"));
       }
       catch (err) {
         console.log('exception during ajax');
         console.log(err);
         callback(err);
       }
     });
   }).on('error', function(error){
     console.log('error during ajax');
     console.log(error);
     callback(error);
   });
}


// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res) {
  res.render('index', {
    title: 'ClockworkMod'
  });
});

app.get('/desksms', function(req, res) {
  res.redirect('https://desksms.appspot.com');
});

app.get('/rommanager/recoveries', function(req, res) {
  res.render('rommanager/recoveries', {
    title: 'ClockworkMod ROM Manager - Recoveries'
  });
});

var listenPort = process.env.PORT == null ? 3000 : parseInt(process.env.PORT);
app.listen(listenPort);
console.log('Express app started on port ' + listenPort);

