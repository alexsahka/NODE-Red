/*global require, module,console */
  /*jshint devel : true*/

'use strict';

var geoCommon = require('../geonames-common.js');

var DEBUG_PREFIX = '[geonames: search-place]';

module.exports = function(RED) {

  var http = require('http');

  function SearchPlace(config) {
    RED.nodes.createNode(this, config);

    this.query = config.query;
    this.maxrows = config.maxrows;
    this.style = config.style;
    this.username = config.username;
    this.debug = config.debug;

    var node = this;

    this.on('input', function(msg) {
      var query = msg.query || msg.payload.query;
      var maxrows = msg.maxrows || msg.payload.maxrows;
      var style = msg.style || msg.payload.style;
      var username = msg.username || msg.payload.username;

      if (geoCommon.setBaseParameters(node, username, style) && geoCommon.setQueryParameters(node, query, maxrows)) {
         var geonamesURL = getGeonamesSearchPlaceURL(node.username, node.style, node.query, node.maxrows);

         debugLog('geonames URL:', geonamesURL);

         http.get(geonamesURL, function(res) {
           var payload = '';
           res.setEncoding('utf8');
           debugLog('Got response: ' + res.statusCode);

           res.on('data', function(chunk) {
             payload += chunk;
             debugLog('BODY CHUNK: ' + chunk);
             debugLog('PAYLOAD: ' + payload);
           });
           res.on('end', function() {
             debugLog('END BODY: ' + payload);
             msg.statusCode = res.statusCode;
             msg.payload = JSON.parse(payload);
             node.send(msg);
           });
         }).on('error', function(error) {
           debugLog('Got error: ' + error.message);
           node.error(JSON.stringify(error));
         });
      } else {
        msg.payload = {'error' : 'Query cannot be empty, maxrows must be an integer, style must be one of SHORT, MEDIUM, LONG or FULL.',
          'query' : query, 'maxrows' : maxrows, 'style' : style};
        node.send(msg);
      }
    });

    function debugLog() {
      if (node.debug) {
         Array.prototype.unshift.call(arguments, DEBUG_PREFIX);
         console.log.apply(null, arguments);
      }
    }
  }

  RED.nodes.registerType('search place', SearchPlace);
};

function getGeonamesSearchPlaceURL(username, style, query, maxrows) {
  var geonamesurl = geoCommon.getGeonamesBaseURL('searchJSON', username, style);

  if (maxrows === undefined) maxrows = 10;

  geonamesurl += '&q=' + query;
  geonamesurl += '&maxRows=' + maxrows;
    
  return geonamesurl;
}
