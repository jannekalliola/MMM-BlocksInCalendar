/* MagicMirror²
 * Module: BlocksInCalendar
 *
 * By Janne Kalliola https://kallio.la/
 * Using code from MagicMirror default calendar by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-BlocksInCalendar", {
	// Define module defaults
	defaults: {
		showWeeks: 10,
		minimumEntryLength: 2, // The minimum size of shown block in days
		fetchInterval: 5 * 60 * 1000, // Update every 5 minutes.
		animationSpeed: 2000,
		timeFormat: "HH:mm",
		hidePrivate: false,
		tableClass: "small",
		calendars: [
			{
				url: "https://www.calendarlabs.com/templates/ical/US-Holidays.ics"
			}
		],
		excludedEvents: [],
		selfSignedCert: false,
	},

	requiresVersion: "2.1.0",

	// Define required scripts.
	getStyles: function () {
		return ["MMM-BlocksInCalendar.css"];
	},

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required translations.
	getTranslations: function () {
		// The translations for the default modules are defined in the core translation files.
		// Therefore we can just return false. Otherwise we should have returned a dictionary.
		// If you're trying to build your own module including translations, check out the documentation.
		return false;
	},

	// Override start method.
	start: function () {
		const ONE_MINUTE = 60 * 1000;

		Log.info(`Starting module: ${this.name}`);

		// Set locale.
		moment.updateLocale(config.language, this.getLocaleSpecification(config.timeFormat));

		// clear data holder before start
		this.calendarData = {};

		// indicate no data available yet
		this.loaded = false;

		this.config.calendars.forEach((calendar) => {
			calendar.url = calendar.url.replace("webcal://", "http://");

			const calendarConfig = {
				showWeeks: calendar.showWeeks,
				minimumEntryLength: calendar.minimumEntryLength,
				selfSignedCert: calendar.selfSignedCert
			};

			if (calendar.titleClass === "undefined" || calendar.titleClass === null) {
				calendarConfig.titleClass = "";
			}
			if (calendar.timeClass === "undefined" || calendar.timeClass === null) {
				calendarConfig.timeClass = "";
			}

			// tell helper to start a fetcher for this calendar
			// fetcher till cycle
			this.addCalendar(calendar.url, calendar.auth, calendarConfig);
		});

		// Refresh the DOM every minute if needed: When using relative date format for events that start
		// or end in less than an hour, the date shows minute granularity and we want to keep that accurate.
		setTimeout(() => {
			setInterval(() => {
				this.updateDom(1);
			}, ONE_MINUTE);
		}, ONE_MINUTE - (new Date() % ONE_MINUTE));
	},

	// Override socket notification handler.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "FETCH_BI_CALENDAR") {
			this.sendSocketNotification(notification, { url: payload.url, id: this.identifier });
		}

		if (this.identifier !== payload.id) {
			return;
		}

		if (notification === "BI_CALENDAR_EVENTS") {
			if (this.hasCalendarURL(payload.url)) {
				this.calendarData[payload.url] = payload.events;
				this.error = null;
				this.loaded = true;
			}
		} else if (notification === "CALENDAR_ERROR") {
			let error_message = this.translate(payload.error_type);
			this.error = this.translate("MODULE_CONFIG_ERROR", { MODULE_NAME: this.name, ERROR: error_message });
			this.loaded = true;
		}

		this.updateDom(this.config.animationSpeed);
	},

	// Override dom generator.
	getDom: function () {
		const ONE_SECOND = 1000; // 1,000 milliseconds
		const ONE_MINUTE = ONE_SECOND * 60;
		const ONE_HOUR = ONE_MINUTE * 60;
		const ONE_DAY = ONE_HOUR * 24;

		const events = this.createEventList(true);
		const wrapper = document.createElement("table");
		wrapper.className = "MMM-BICalendar-table";
		
		if (this.error) {
			wrapper.innerHTML = this.error;
			wrapper.className = `${this.config.tableClass} dimmed`;
			return wrapper;
		}

		if (events.length === 0 && !this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = `${this.config.tableClass} dimmed`;
			return wrapper;
		}

		let curDate = moment().startOf('week');
		let today = moment().startOf('day');
		let curMonth = -1;
		let monthWeeks = 0;
		let monthCell = false;

		let activeEvents = [];
		let activeEventCount = 0;
		let eventPos = 0;

		let dayDate = curDate.clone();
		let dRow = document.createElement('tr');
		dRow.className = 'MMM-BICalendar-weekday-row';
		let dCell = document.createElement('td');
		dCell.className = 'MMM-BICalendar-weekday-month';
		dRow.appendChild(dCell);
		for(let i = 0; i < 7; i++) {	
			dCell = document.createElement('td');
			dCell.innerHTML = dayDate.format('dd');
			dCell.className = 'MMM-BICalendar-weekday-day';
			dayDate.add(1, 'day');
			dRow.appendChild(dCell);
		}
		wrapper.append(dRow);

		for(let i = 0; i < this.config.showWeeks; i++) {
			let row = document.createElement('tr');
			if(curMonth != curDate.month()) {
				if(monthCell) {
					monthCell.setAttribute('rowspan', monthWeeks);
				}
				curMonth = curDate.month();
				monthCell = document.createElement('td');
				monthCell.innerHTML
				monthCell.className = 'MMM-BICalendar-month ' + ((curMonth % 2 == 1) ? 'MMM-BICalendar-evenMonth' : 'MMM-BICalendar-oddMonth');

				let monthName = document.createElement('div');
				monthName.innerHTML = curDate.format('M');
				monthName.className = 'MMM-BICalendar-monthName';

				monthCell.appendChild(monthName);
				row.appendChild(monthCell);
				monthWeeks = 0;
			}

			activeEvents = activeEvents.filter(event => event != false);

			for(let j = 0; j < 7; j++) {
				let curTs = parseInt(curDate.format('x'), 10);
				for(;;) {
					if(eventPos >= events.length) {
						break;
					}
					if(events[eventPos].startDate <= curTs + 86400000 - 1) {
						let inserted = false;
						for(let k = 0; k < activeEvents.length; k++) {
							if(activeEvents[k] === false) {
								activeEvents[k] = events[eventPos];
								inserted = true;
								break;
							}
						}
						if(!inserted) {
							activeEvents.push(events[eventPos]);
						}
						activeEventCount++;
						eventPos++;
						continue;
					}
					break;
				}

				let dayCell = document.createElement('td');
				dayCell.className = 'MMM-BICalendar-day ' + ((curDate.month() % 2 == 1) ? 'MMM-BICalendar-evenMonth' : 'MMM-BICalendar-oddMonth') + ((curDate.isSame(today)) ? ' MMM-BICalendar-today' : '');
				row.appendChild(dayCell);

				let dayNumber = document.createElement('div');
				dayNumber.innerHTML = curDate.format('D');
				dayCell.appendChild(dayNumber);

				if(activeEventCount > 0) {
					let stripContainer = document.createElement('div');
					stripContainer.className = 'MMM-BICalendar-stripContainer';
					for(let k = 0; k < activeEvents.length; k++) {
						let strip = document.createElement('div');
						stripContainer.appendChild(strip);

						let stripText = '';
						if(activeEvents[k] !== false) {
							if(j == 0 ||
							   (activeEvents[k].startDate >= curTs && activeEvents[k].startDate <= curTs + 86400000 - 1)) {
								if(!activeEvents[k].fullDayEvent) {
									stripText = moment(activeEvents[k].startDate, "x").format(this.config.timeFormat) + ' – ' + moment(activeEvents[k].endDate, "x").format(this.config.timeFormat) + ' ';
								}
								
								stripText += activeEvents[k].title;
							}
							if(activeEvents[k].startDate >= curTs && activeEvents[k].startDate <= curTs + 86400000 - 1) {
								strip.className = 'MMM-BICalendar-stripStart';
								activeEvents[k].started = true;
							}
							else if(activeEvents[k].endDate <= curTs + 86400000) {
								strip.className = 'MMM-BICalendar-stripEnd';
								activeEvents[k] = false;
								activeEventCount--;
								
								let stripP = document.createElement('div');
								stripP.className = 'MMM-BICalendar-stripEndPadding';
								stripContainer.insertBefore(stripP, strip);

								stripP = document.createElement('div');
								stripP.className = 'MMM-BICalendar-stripEndInnerPadding';
								strip.appendChild(stripP);
							}	
							else {
								strip.className = 'MMM-BICalendar-stripMiddle';
							}
						}
						else {
							strip.className = 'MMM-BICalendar-stripEmpty';
						}
						if(stripText != '') {
							let txtSpan = document.createElement('span');
							txtSpan.className = 'MMM-BICalendar-stripText';
							txtSpan.innerHTML = stripText;
							strip.appendChild(txtSpan);
						}
					}
					dayCell.appendChild(stripContainer);
				}
				
				curDate.add(1, 'day');
			}
			wrapper.appendChild(row);
			monthWeeks++;
		}
		monthCell.setAttribute('rowspan', monthWeeks);
		return wrapper;
	},

	/**
	 * This function accepts a number (either 12 or 24) and returns a moment.js LocaleSpecification with the
	 * corresponding timeformat to be used in the calendar display. If no number is given (or otherwise invalid input)
	 * it will a localeSpecification object with the system locale time format.
	 *
	 * @param {number} timeFormat Specifies either 12 or 24 hour time format
	 * @returns {moment.LocaleSpecification} formatted time
	 */
	getLocaleSpecification: function (timeFormat) {
		switch (timeFormat) {
			case 12: {
				return { longDateFormat: { LT: "h:mm A" } };
			}
			case 24: {
				return { longDateFormat: { LT: "HH:mm" } };
			}
			default: {
				return { longDateFormat: { LT: moment.localeData().longDateFormat("LT") } };
			}
		}
	},

	/**
	 * Checks if this config contains the calendar url.
	 *
	 * @param {string} url The calendar url
	 * @returns {boolean} True if the calendar config contains the url, False otherwise
	 */
	hasCalendarURL: function (url) {
		for (const calendar of this.config.calendars) {
			if (calendar.url === url) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Creates the sorted list of all events.
	 *
	 * @param {boolean} limitNumberOfEntries Whether to filter returned events for display.
	 * @returns {object[]} Array with events.
	 */
	createEventList: function (limitNumberOfEntries) {
		const ONE_SECOND = 1000; // 1,000 milliseconds
		const ONE_MINUTE = ONE_SECOND * 60;
		const ONE_HOUR = ONE_MINUTE * 60;
		const ONE_DAY = ONE_HOUR * 24;

		const now = new Date();
		const today = moment().startOf("day");
		const future = moment().startOf("day").add(this.config.showWeeks, "weeks").toDate();
		let events = [];

		for (const calendarUrl in this.calendarData) {
			const calendar = this.calendarData[calendarUrl];
			for (const e in calendar) {
				const event = JSON.parse(JSON.stringify(calendar[e])); // clone object

				if (this.config.hidePrivate && event.class === "PRIVATE") {
					// do not add the current event, skip it
					continue;
				}
				if (limitNumberOfEntries) {
					if (this.listContainsEvent(events, event)) {
						continue;
					}
				}
				event.url = calendarUrl;
				events.push(event);
			}
		}

		events.sort(function (a, b) {
			return a.startDate - b.startDate;
		});

		return events;
	},

	listContainsEvent: function (eventList, event) {
		for (const evt of eventList) {
			if (evt.title === event.title && parseInt(evt.startDate) === parseInt(event.startDate)) {
				return true;
			}
		}
		return false;
	},

	/**
	 * Requests node helper to add calendar url.
	 *
	 * @param {string} url The calendar url to add
	 * @param {object} auth The authentication method and credentials
	 * @param {object} calendarConfig The config of the specific calendar
	 */
	addCalendar: function (url, auth, calendarConfig) {
		this.sendSocketNotification("ADD_BI_CALENDAR", {
			id: this.identifier,
			url: url,
			excludedEvents: calendarConfig.excludedEvents || this.config.excludedEvents,
			showWeeks: calendarConfig.showWeeks || this.config.showWeeks,
			minimumEntryLength: calendarConfig.minimumEntryLength || this.config.minimumEntryLength,
			fetchInterval: this.config.fetchInterval,
			titleClass: calendarConfig.titleClass,
			timeClass: calendarConfig.timeClass,
			auth: auth,
			selfSignedCert: calendarConfig.selfSignedCert || this.config.selfSignedCert
		});
	},

	mergeUnique: function (arr1, arr2) {
		return arr1.concat(
			arr2.filter(function (item) {
				return arr1.indexOf(item) === -1;
			})
		);
	},
});
