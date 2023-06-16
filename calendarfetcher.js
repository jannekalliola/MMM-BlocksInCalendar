/* MagicMirror²
 * Node Helper: BlocksInCalendar - CalendarFetcher
 *
 * By Janne Kalliola https://kallio.la/
 * Using code from MagicMirror default calendar by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 */

const https = require("https");
const digest = require("digest-fetch");
const ical = require("node-ical");
const fetch = require("fetch");
const Log = require("logger");
const NodeHelper = require("node_helper");
const CalendarUtils = require("./calendarutils");

/**
 *
 * @param {string} url The url of the calendar to fetch
 * @param {number} reloadInterval Time in ms the calendar is fetched again
 * @param {string[]} excludedEvents An array of words / phrases from event titles that will be excluded from being shown.
 * @param {number} showWeeks The amount of weeks to show.
 * @param {number} minimumEntryLength The minimum amount of days for shown entries.
 * @param {object} auth The object containing options for authentication against the calendar.
 * @param {boolean} selfSignedCert If true, the server certificate is not verified against the list of supplied CAs.
 * @class
 */
const CalendarFetcher = function (url, reloadInterval, excludedEvents, showWeeks, minimumEntryLength, auth, selfSignedCert) {
	let reloadTimer = null;
	let events = [];

	let fetchFailedCallback = function () {};
	let eventsReceivedCallback = function () {};

	/**
	 * Initiates calendar fetch.
	 */
	const fetchCalendar = () => {
		clearTimeout(reloadTimer);
		reloadTimer = null;
		const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
		let fetcher = null;
		let httpsAgent = null;
		let headers = {
			"User-Agent": `Mozilla/5.0 (Node.js ${nodeVersion}) MagicMirror/${global.version}`
		};

		if (selfSignedCert) {
			httpsAgent = new https.Agent({
				rejectUnauthorized: false
			});
		}
		if (auth) {
			if (auth.method === "bearer") {
				headers.Authorization = `Bearer ${auth.pass}`;
			} else if (auth.method === "digest") {
				fetcher = new digest(auth.user, auth.pass).fetch(url, { headers: headers, agent: httpsAgent });
			} else {
				headers.Authorization = `Basic ${Buffer.from(`${auth.user}:${auth.pass}`).toString("base64")}`;
			}
		}
		if (fetcher === null) {
			fetcher = fetch(url, { headers: headers, agent: httpsAgent });
		}

		fetcher
			.then(NodeHelper.checkFetchStatus)
			.then((response) => response.text())
			.then((responseData) => {
				let data = [];

				try {
					data = ical.parseICS(responseData);
					Log.debug(`parsed data=${JSON.stringify(data)}`);
					events = CalendarUtils.filterEvents(data, {
						excludedEvents,
						showWeeks,
						minimumEntryLength
					});

				} catch (error) {
					fetchFailedCallback(this, error);
					scheduleTimer();
					return;
				}
				this.broadcastEvents();
				scheduleTimer();
			})
			.catch((error) => {
				fetchFailedCallback(this, error);
				scheduleTimer();
			});
	};

	/**
	 * Schedule the timer for the next update.
	 */
	const scheduleTimer = function () {
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetchCalendar();
		}, reloadInterval);
	};

	/* public methods */

	/**
	 * Initiate fetchCalendar();
	 */
	this.startFetch = function () {
		fetchCalendar();
	};

	/**
	 * Broadcast the existing events.
	 */
	this.broadcastEvents = function () {
		Log.info(`Calendar-Fetcher: Broadcasting ${events.length} events.`);
		eventsReceivedCallback(this);
	};

	/**
	 * Sets the on success callback
	 *
	 * @param {Function} callback The on success callback.
	 */
	this.onReceive = function (callback) {
		eventsReceivedCallback = callback;
	};

	/**
	 * Sets the on error callback
	 *
	 * @param {Function} callback The on error callback.
	 */
	this.onError = function (callback) {
		fetchFailedCallback = callback;
	};

	/**
	 * Returns the url of this fetcher.
	 *
	 * @returns {string} The url of this fetcher.
	 */
	this.url = function () {
		return url;
	};

	/**
	 * Returns current available events for this fetcher.
	 *
	 * @returns {object[]} The current available events for this fetcher.
	 */
	this.events = function () {
		return events;
	};
};

module.exports = CalendarFetcher;
