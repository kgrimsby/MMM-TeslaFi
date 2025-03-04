"use strict";

/* Magic Mirror
 * Module: MMM-TeslaFi
 *
 * Originally By Adrian Chrysanthou
 * Updated by Matt Dyson
 *
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
var request = require("request");
const Log = require("../../js/logger");
const buildUrl = require("build-url");

module.exports = NodeHelper.create({
  start: function () {
    this.started = false;
    this.config = null;
  },

    getData: function () {
	var self = this;

	var url = buildUrl("https://www.teslafi.com", {
	    path: "feed.php",
	    queryParams: {
		token: self.config.apiKey,
		command: self.config.apiCommand
	    }
	});

	Log.info("TeslaFi sending request");
	Log.info(url)
	var self = this
	
	request(
	    {
		url: url,
		method: "GET",
		headers: { TeslaFi_API_TOKEN: this.config.apiKey }
	    },
	    function (error, response, body) {
		Log.info("TeslaFi response was " + response.statusCode);
		if (!error && response.statusCode === 200) {
		    Log.info("TeslaFi sending data");
		    let data = JSON.parse(body)

		    var url = buildUrl("https://maps.googleapis.com", {
			path: "maps/api/geocode/json",
			queryParams: {
			    latlng: [data.latitude, data.longitude],
			    key: self.config.maps.apiKey,
			}
		    });
		    request(url, function(error, repsonse, body) {
			Log.info('Found all data')
			Log.info(JSON.parse(body))
			data.address = JSON.parse(body).results
			self.sendSocketNotification("DATA", data);
		    })
		}
	    }
	);

	setTimeout(function () {
	    self.getData();
	}, this.config.updateInterval);
    },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG" && this.started === false) {
      Log.info("TeslaFi received configuration");
      this.config = payload;
      this.sendSocketNotification("STARTED", true);
      this.getData();
      this.started = true;
    }
  }
});
