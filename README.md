# MMM-BlocksInCalendar
Magic Mirror Module to show how multiday events in a monthly calendar view, useful for showing trips of a family member or visits of relatives.

The module code is based on the default calendar by Michael Teeuw https://michaelteeuw.nl

It has been heavily stripped, as there is less functionality and configurability needed.

## Installation

Clone this repository in your modules folder. There are no dependencies

    cd ~/MagicMirror/modules 
    git clone https://github.com/jannekalliola/MMM-BlocksInCalendar

## Configuration

Go to the MagicMirror/config directory and edit the config.js file. Add the module to your modules array in your config.js.

Enter these details in the config.js for your MagicMirror installation:

        {
            module: "MMM-BlocksInCalendar",
            header: 'Upcoming',
            position: "top_right",
            config: {
            }
        },

## Module configuration
The module has the following configuration options:

<table>
  <thead>
    <tr>
      <th>Option</th>
	  <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>showWeeks</code></td>
	  <td><code>10</code></td>
      <td>The amount of weeks to show.</td>
    </tr>
    <tr>
      <td><code>minimumEntryLength</code></td>
	  <td><code>2</code></td>
      <td>The minimum length (in days) of an entry to be shown in the calendar. Event start and end times are not taken into consideration. For example, if an event starts at noon on Monday and ends at noon on Tuesday, it is calculated as a two day event.</td>
    </tr>
    <tr>
      <td><code>fetchInterval</code></td>
	  <td>1800000</td>
      <td>The interval between calendar refreshes, in milliseconds. Default is 30 minutes.</td>
    </tr>
    <tr>
      <td><code>animationSpeed</code></td>
	  <td>2000</td>
      <td>The speed of update animation, in milliseconds.</td>
    </tr>
    <tr>
      <td><code>timeFormat</code></td>
	  <td>HH:mm</td>
      <td>The time format string for events with start and end times.</td>
    </tr>
    <tr>
      <td><code>hidePrivate</code></td>
	  <td>false</td>
      <td>Whether to hide or show private events.</td>
    </tr>
    <tr>
      <td><code>tableClass</code></td>
	  <td>small</td>
      <td>The class of the calendar table.</td>
    </tr>
    <tr>
      <td><code>excludedEvents</code></td>
	  <td>[]</td>
      <td>An array of events to be excluded.</td>
    </tr>
    <tr>
      <td><code>selfSignedCert</code></td>
	  <td>false</td>
      <td>Allow calendar server to use self-signed certificates.</td>
    </tr>
    <tr>
      <td><code>selfSignedCert</code></td>
	  <td>false</td>
      <td>Allow calendar server to use self-signed certificates.</td>
    </tr>
    <tr>
      <td><code>calendars</code></td>
	  <td></td>
      <td>Array of calendars to be included in the view. See below</td>
    </tr>
  </tbody>
</table>

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>url</code></td>
      <td>The url to the calendar .ical</td>
    </tr>
    <tr>
      <td><code>auth</code></td>
      <td>The authentication object, similar to the default calendar. See https://docs.magicmirror.builders/modules/calendar.html#configuration-options for more information about the options.</td>
    </tr>
  </tbody>
</table>
