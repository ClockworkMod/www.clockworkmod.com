
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var url = require('url');
var collections = require('./collections');
var sprintf = require('./sprintf').sprintf;
var dirty = require('./dirty');
var md5 = require('./md5').md5;

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
      if (device.touch_version) {
        var touchDownloadUrl = device.readonly_recovery ? data.recovery_zip_url : data.recovery_url;
        touchDownloadUrl = sprintf(touchDownloadUrl, 'touch-' + device.touch_version, device.key);
        device.touchDownloadUrl = touchDownloadUrl;
      }
      return device;
    });

    collections.sort(devices, function(device) { return device.name; });

    res.render('rommanager', {
      title: 'ClockworkMod ROM Manager - Recoveries',
      devices: devices
    });
  });
});

app.get('/rommanager/device/:device/developer/:developerId', function(req, res) {
  res.header('Cache-Control', 'max-age=300');
  var id = req.params.developerId;
  var manifest = req.query.manifest;
  var device = req.params.device;
  var name = req.query.name;
  var deviceName = req.query.deviceName;
  if (!manifest || !name) {
    res.redirect('/rommanager/devices');
    return;
  }
  
  clean(manifest, function(err, data) {
    if (err) {
      res.render('rommanager/developer', {
        title: 'ClockworkMod ROM Manager - ROMs',
        developer: name,
        error: 'This developer section is currently under maintenance.'
      });
    }
    else {
      var roms = data.roms;
      
      ajax("http://rommanager.clockworkmod.com/v2/ratings/" + id, function(err, data) {
        var ratings = data.result;
        console.log(ratings);
      
        roms = collections.filter(roms, function(index, rom) {
          if (rom.device == device || rom.device == 'all') {
            if (rom.urls)
              rom.url = rom.urls[0];
            if (rom.url) {
              if (!rom.modversion)
                rom.modversion = md5(rom.url);

              var rating = ratings[rom.modversion];
              if (rating) {
                rom.rating = Math.round(rating.rating * 100 / 5);
                rom.downloadCount = rating.downloads;
                console.log(rom.rating);
              }
              return rom;
            }
          }
        });

        res.render('rommanager/developer', {
          title: 'ClockworkMod ROM Manager - ROMs',
          developer: name,
          error: '',
          roms: roms,
          deviceName: deviceName
        });
      });
    }
  });
});

app.get('/rommanager/developers/:device', function(req, res) {
  res.header('Cache-Control', 'max-age=300');
  var name = req.query.name;
  var url = 'http://gh-pages.clockworkmod.com/ROMManagerManifest/manifest/' + req.params.device + '.js';
  ajax(url, function(err, data) {
    var manifests = data.manifests;
    
    ajax("http://rommanager.clockworkmod.com/v2/ratings", function(err, data) {
      if (data) {
        var ratings = data.result;

        collections.each(manifests, function(index, manifest) {
          var rating = ratings[manifest.id];
          if (rating) {
            manifest.rating = Math.round(rating.totalRating / rating.ratingCount * 100 / 5);
            manifest.downloadCount = rating.downloadCount + rating.anonymousDownloadCount;
          }
        });
      }
      
      res.render('rommanager/developers', {
        title: 'ClockworkMod ROM Manager - ROMs',
        manifests: manifests,
        device: req.params.device,
        deviceName: name
      });
    });
  });
});

app.get('/tether/drivers', function(req, res) {
  res.render('tether/drivers', {
    title: 'ClockworkMod Tether'
  });
});

app.get('/survey/ad', function(req, res) {
  res.render('survey/ad', {
    title: 'ClockworkMod ROM Manager - Survey'
  });
});

var listenPort = process.env.PORT == null ? 3000 : parseInt(process.env.PORT);
app.listen(listenPort);
console.log('Express app started on port ' + listenPort);

