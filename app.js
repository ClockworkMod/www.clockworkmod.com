
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var url = require('url');
var collections = require('./collections');
var sprintf = require('./sprintf').sprintf;
var dirty = require('./dirty');

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

var clean = function(urlStr, callback) {
  u = url.parse(urlStr);
  http.get({ host: u.host, port: u.port, path: u.pathname},
    function(res) {
      var data = '';
      res.on('data', function(chunk) {
        data += chunk;
      });
      res.on('end', function() {
        try {
          callback(null, dirty.parse(data));
        }
        catch (err) {
          callback(err);
        }
      });
    }).on('error', function(e) {
      callback(e);
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

app.get('/rommanager', function(req, res) {
  res.header('Cache-Control', 'max-age=300');
  ajax("http://gh-pages.clockworkmod.com/ROMManagerManifest/devices.js", function(err, data) {
    var devices = data.devices;
    var version = data.version

    devices = collections.filter(devices, function(index, device) {
      if (device.officially_supported === false)
        return null;

      if (!device.version)
        device.version = version;
      var downloadUrl = device.readonly_recovery ? data.recovery_zip_url : data.recovery_url;
      downloadUrl = sprintf(downloadUrl, device.version, device.key);
      device.downloadUrl = downloadUrl;
      return device;
    });

    collections.sort(devices, function(device) { return device.name; });

    res.render('rommanager', {
      title: 'ClockworkMod ROM Manager - Recoveries',
      devices: devices
    });
  });
});


app.get('/rommanager/developers', function(req, res) {
  res.header('Cache-Control', 'max-age=300');
  ajax('http://gh-pages.clockworkmod.com/ROMManagerManifest/manifests.js', function(req, res) {
    var manifests = data.manifests;

    res.render('rommanager/developers', {
      title: 'ClockworkMod ROM Manager - ROMs',
      manifests: manifests
    });
  });
});

var listenPort = process.env.PORT == null ? 3000 : parseInt(process.env.PORT);
app.listen(listenPort);
console.log('Express app started on port ' + listenPort);

