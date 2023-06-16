/* MagicMirror²
 * Node Helper: BlocksInCalendar
 *
 * By Janne Kalliola https://kallio.la/
 * Using code from MagicMirror default calendar by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */
const NodeHelper = require("node_helper");
const Log = require("logger");
const CalendarFetcher = require("./calendarfetcher");

module.exports = NodeHelper.create({
	// Override start method.
	start: function () {
		Log.log(`Starting node helper for: ${this.name}`);
		this.fetchers = [];
	},

	// Override socketNotificationReceived method.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "ADD_BI_CALENDAR") {
			this.createFetcher(payload.url, payload.fetchInterval, payload.excludedEvents, payload.showWeeks, payload.minimumEntryLength, payload.auth, payload.broadcastPastEvents, payload.selfSignedCert, payload.id);
		} else if (notification === "FETCH_BI_CALENDAR") {
			const key = payload.id + payload.url;
			if (typeof this.fetchers[key] === "undefined") {
				Log.error("Calendar Error. No fetcher exists with key: ", key);
				this.sendSocketNotification("BI_CALENDAR_ERROR", { error_type: "MODULE_ERROR_UNSPECIFIED" });
				return;
			}
			this.fetchers[key].startFetch();
		}
	},

	/**
	 * Creates a fetcher for a new url if it doesn't exist yet.
	 * Otherwise it reuses the existing one.
	 *
	 * @param {string} url The url of the calendar
	 * @param {number} fetchInterval How often does the calendar needs to be fetched in ms
	 * @param {string[]} excludedEvents An array of words / phrases from event titles that will be excluded from being shown.
	 * @param {number} showWeeks The amount of weeks to show.
	 * @param {number} minimumEntryLength The minimum amount of days for shown entries.
	 * @param {object} auth The object containing options for authentication against the calendar.
	 * @param {boolean} broadcastPastEvents If true events from the past maximumNumberOfDays will be included in event broadcasts
	 * @param {boolean} selfSignedCert If true, the server certificate is not verified against the list of supplied CAs.
	 * @param {string} identifier ID of the module
	 */
	createFetcher: function (url, fetchInterval, excludedEvents, showWeeks, minimumEntryLength, auth, broadcastPastEvents, selfSignedCert, identifier) {
		try {
			new URL(url);
		} catch (error) {
			Log.error("Calendar Error. Malformed calendar url: ", url, error);
			this.sendSocketNotification("BI_CALENDAR_ERROR", { error_type: "MODULE_ERROR_MALFORMED_URL" });
			return;
		}

		let fetcher;
		if (typeof this.fetchers[identifier + url] === "undefined") {
			Log.log(`Create new calendarfetcher for url: ${url} - Interval: ${fetchInterval}`);
			fetcher = new CalendarFetcher(url, fetchInterval, excludedEvents, showWeeks, minimumEntryLength, auth, broadcastPastEvents, selfSignedCert);

			fetcher.onReceive((fetcher) => {
				this.broadcastEvents(fetcher, identifier);
			});

			fetcher.onError((fetcher, error) => {
				Log.error("Calendar Error. Could not fetch calendar: ", fetcher.url(), error);
				let error_type = NodeHelper.checkFetchError(error);
				this.sendSocketNotification("BI_CALENDAR_ERROR", {
					id: identifier,
					error_type
				});
			});

			this.fetchers[identifier + url] = fetcher;
		} else {
			Log.log(`Use existing calendarfetcher for url: ${url}`);
			fetcher = this.fetchers[identifier + url];
			fetcher.broadcastEvents();
		}

		fetcher.startFetch();
	},

	/**
	 *
	 * @param {object} fetcher the fetcher associated with the calendar
	 * @param {string} identifier the identifier of the calendar
	 */
	broadcastEvents: function (fetcher, identifier) {
		this.sendSocketNotification("BI_CALENDAR_EVENTS", {
			id: identifier,
			url: fetcher.url(),
			events: fetcher.events()
		});
	}
});
