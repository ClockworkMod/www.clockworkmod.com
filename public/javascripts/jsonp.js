var jsonp = function(url, cb, data) {
  var type = "jsonp";

  var thisDomain = window.location.protocol + '//' + window.location.host;

  if (url.indexOf(thisDomain) == 0)
    type = "json";

  var jqXHR = $.get(url, data, function(data) {
    if (cb)
      cb(null, data);
  },
  type).error(function(err) {
    if (cb)
      cb(err);
  }).complete(function(jqXHR) {
  });
  return jqXHR;
}
