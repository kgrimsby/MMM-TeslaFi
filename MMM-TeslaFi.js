/* Magic Mirror
 * Module: MMM-TeslaFi
 *
 * Originally By Adrian Chrysanthou
 * Updated by Matt Dyson
 * MIT Licensed.
 */
Module.register("MMM-TeslaFi", {
  defaults: {
    animationSpeed: 1000,
    refreshInterval: 1000 * 60, // Refresh DOM every 60 seconds
    updateInterval: 1000 * 60 * 5, // Load TeslaFi data every 5 minutes
    unitDistance: "miles",
    unitTemperature: "c",
    batteryDanger: 30,
    batteryWarning: 50,
    dataTimeout: 0,
    maps: {
      apiKey: "",
      width: 800,
      height: 400,
      zoom: 16,
      exclude: []
    },
    precision: 1, // How many decimal places to round values to
    apiCommand: "lastGood",
    items: [
      "state",
      "speed",
      "heading",
      "battery",
      "range",
      "range-estimated",
      "power-connected",
      "charge-time",
      "charge-added",
      "charge-power",
      "locked",
      "odometer",
      "temperature",
      "map",
      "version",
      "version-new",
      "location",
      "data-time"
    ]
  },
  // Define required scripts.
  getScripts: function () {
    return [
      "moment.js",
      this.file("node_modules/build-url/src/build-url.js"),
      this.file("DataItemProvider.js"),
      this.file("dataitems/battery.js"),
      this.file("dataitems/charge.js"),
      this.file("dataitems/driving.js"),
      this.file("dataitems/location.js"),
      this.file("dataitems/range.js"),
      this.file("dataitems/software.js"),
      this.file("dataitems/state.js"),
      this.file("dataitems/temperature.js")
    ];
  },
  getStyles: function () {
    return [
      "https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/css/material-design-iconic-font.min.css",
      "MMM-TeslaFi.css"
    ];
  },
  start: function () {
    Log.info("Starting module: " + this.name);
    this.loaded = false;
    this.sendSocketNotification("CONFIG", this.config);
    this.providers = [];

      for (var identifier in DataItemProvider.providers) {
	  Log.info('Found provider: ')
	  Log.info(identifier)
      this.providers[identifier] = new DataItemProvider.providers[identifier](
        this
      );
    }

    this.resetDomUpdate();
  },
  resetDomUpdate: function () {
    var self = this;
    // Reset any previously allocated timer to avoid double-refreshes
    clearInterval(this.domTimer);
    // Refresh the DOM at the given interval
    this.domTimer = setInterval(function () {
      self.updateDom(self.config.animationSpeed);
    }, this.config.refreshInterval);
  },
    getDom: function () {
	Log.info('WRITING DOM FOR TESLA')
	
	var wrapper = document.createElement("div");
	wrapper.style = 'width: 400px;'
    if (!this.loaded) {
      wrapper.innerHTML = this.translate("LOADING");
	wrapper.className = "dimmed light small";
	Log.info('returning wrapper')
      return wrapper;
    }
	Log.info('Loading done...cont')
    if (this.config.apiKey === "") {
      wrapper.innerHTML = "No Tesla Fi <i>apiKey</i> set in config file.";
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    if (!this.tesla_data) {
      wrapper.innerHTML = "No data";
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    var t = this.tesla_data;
    var content = document.createElement("div");
	content.style = 'background: url(https://static-assets.tesla.com/configurator/compositor?context=design_studio_2&options=$BP02,$ADPX2,$AU01,$APF1,$APH4,$APPB,$X028,$BTX5,$BS00,$BCMB,$CH04,$CF00,$CW02,$CONO,$X039,$IDBA,$X027,$DRLH,$DU00,$AF02,$FMP6,$FG02,$DCF0,$FR04,$X007,$X011,$INBTB,$PI01,$IX00,$X001,$LP01,$MI01,$X037,$MDLS,$DV4W,$X025,$X003,$PPMR,$PS01,$PK00,$X031,$PX00,$PF00,$X043,$TM00,$BR04,$REEU,$RFP2,$X014,$ME02,$QTTB,$SR07,$SP01,$X021,$SC04,$SU01,$TR00,$DSH5,$MT75A,$UTPB,$WTAS,$YFCC,$CPF0&view=STUD_3QTR&model=ms&size=400&bkba_opt=1&version=v0028d202111110422&crop=0,0,0,0&version=v0028d202111110422); display: flex; flex-direction: row; justify-content: flex-start; flex-wrap: wrap; width: 400px; min-height: 160px; align-content: flex-start;'
	var header = document.createElement('h2')
	header.className = 'mqtt-title'
	header.innerHTML = `<span class="zmdi zmdi-car zmdi-hc-1x icon"></span> ${t.display_name}`
	wrapper.appendChild(header)
	//content.innerHTML = "";

	wrapper.appendChild(content);

    for (var index in this.config.items) {
	dataItem = this.config.items[index];

      if (!this.providers.hasOwnProperty(dataItem)) {
        Log.error("Could not find " + dataItem + " in list of valid providers");
        continue;
      }

      if (!this.providers[dataItem].display) {
        // This provider doesn't want us to display it right now, so skip
        Log.info(
          "Provider " + dataItem + " doesn't want to be shown right now"
        );
        continue;
      }

      var icon = this.providers[dataItem].icon;
      var field = this.providers[dataItem].field;
      var value = this.providers[dataItem].value;

	if (dataItem === 'map') {
	    var temp = document.createElement('div')
	    temp.innerHTML = `${icon}`
	    wrapper.appendChild(temp)
	} else if (dataItem === 'address') {
	    var temp = document.createElement('div')
	    temp.innerHTML = `${icon} ${value}`
	    temp.style = 'width: 100%;';
	    content.appendChild(temp)
	} else {
	    var temp = document.createElement('div')
	    temp.style = 'flex: 0 0 auto; margin-bottom: .5em; box-sizing: border-box; width: 50%;' + (index % 2 ? 'text-align: right;' : 'text-align: left;');
	    temp.innerHTML = index % 2 ? `${value} ${icon}` : `${icon} ${value}`;
	    content.appendChild(temp)
	}
    } // end foreach loop of items

    wrapper.className = "light small";
    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "STARTED") {
      // If the node_helper socket has only just opened, refresh the DOM to make sure we're displaying a loading message
      this.updateDom();
    } else if (notification === "DATA") {
      Log.info("TeslaFi recevied new data");
      // We've received data from TeslaFi, so parse and display it
      var data = payload;
      if (!data) {
        return;
      }
      this.tesla_data = data;
	this.loaded = true;
	Log.info('Data loaded')
	Log.info(data)

      // Tell all of our data item providers about the new data
      for (var identifier in this.providers) {
        this.providers[identifier].onDataUpdate(data);
      }

	this.updateDom(this.config.animationSpeed);
      this.resetDomUpdate();
    }
  },

  // Return a number with the precision specified in our config
  numberFormat: function (number) {
    return parseFloat(number).toFixed(this.config.precision);
  },

  // Converts the given temperature (assumes C input) into the configured output, with appropriate units appended
  convertTemperature: function (valueC) {
    if (this.config.unitTemperature === "f") {
      var valueF = valueC * (9 / 5) + 32;
      return this.numberFormat(valueF) + "&deg;F";
    } else {
      return this.numberFormat(valueC) + "&deg;C";
    }
  },

  // Converts the given distance (assumes miles input) into the configured output, with appropriate units appended
  convertDistance: function (valueMiles) {
    if (this.config.unitDistance === "km") {
      var valueKm = valueMiles * 1.60934;
      return this.numberFormat(valueKm) + " km";
    } else {
      return this.numberFormat(valueMiles) + " miles";
    }
  },

  // Converts given speed (assumes miles input) to configured output with approprate units appened
  convertSpeed: function (valueMiles) {
    if (this.config.unitDistance === "km") {
      return this.numberFormat(valueMiles * 1.60934) + " km/h";
    } else {
      return this.numberFormat(valueMiles) + " mph";
    }
  },

  // Converts heading int to nearest bearing by 45deg
  convertHeading: function (heading) {
    const bearing = {
      0: "North",
      45: "North East",
      90: "East",
      135: "South East",
      180: "South",
      225: "South West",
      270: "West",
      315: "North West",
      360: "North"
    };
    const direction = (heading) => {
      return Object.keys(bearing)
        .map(Number)
        .reduce(function (prev, curr) {
          return Math.abs(curr - heading) < Math.abs(prev - heading)
            ? curr
            : prev;
        });
    };
    return bearing[direction(heading)];
  }
});
