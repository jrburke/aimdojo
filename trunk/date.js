/*
Some parts of this file (noted below with this same comment) are:
// Java/C# Style Date Formatting
// Original file available at:
// http://www.javascripttoolbox.com/lib/date/source.php
// Available under dual MIT and GPL licenses.

The rest of the file is:
Copyright (c) 2008 by AOL LLC
All rights reserved.
 
Redistribution and use in source and binary forms, with or without modification, are permitted
provided that the following conditions are met:
 
    * Redistributions of source code must retain the above copyright notice, this list of conditions
      and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions
      and the following disclaimer in the documentation and/or other materials provided with the distribution.
    * Neither the name of AOL LLC nor the names of its contributors may be used to endorse or 
      promote products derived from this software without specific prior written permission.
 
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR 
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND 
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER 
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

dojo.provide("aim.date");
//-----------------------------------------------------------------------------
// date
//
// This is meant to simply extend the functionality of the core dojo date
// class with some functions that we'll need in our application. Amongst
// the things that are handled are first day of week, finding the first/last
// day of the week given a date, finding the first/last day of the month
// given a date, day spans, and date formatting.
//
//-----------------------------------------------------------------------------

dojo.require("dojo.date");
dojo.require("aim.string");
dojo.require("dojo.i18n");

dojo.requireLocalization("aim", "strings");

aim.date.onload = function(){
	//Do this work in an onload handler so we know the i18n bundle is available.
	aim.date.strings = dojo.i18n.getLocalization("aim", "strings");

	/**
	 * firstDayOfWeek
	 *
	 * This sets up what the first day of the week is for localization
	 * purposes. It is typically used as an offset during date calculations.
	 * Return Values:
	 * 0 == Sunday,
	 * 1 == Monday,
	 * etc.
	 */
	this.firstDayOfWeek = aim.date.strings.FirstDayOfWeek;

	this.RFC2445 = aim.date.strings.DateRFC2445;
	this.RFC2445WithTime = aim.date.strings.DateRFC2445WithTime;
	this.months = [aim.date.strings.January, aim.date.strings.February, aim.date.strings.March,
		aim.date.strings.April, aim.date.strings.May, aim.date.strings.June,
		aim.date.strings.July, aim.date.strings.August, aim.date.strings.September,
		aim.date.strings.October, aim.date.strings.November, aim.date.strings.December];
	this.shortMonths = [aim.date.strings.Jan, aim.date.strings.Feb, aim.date.strings.Mar,
		aim.date.strings.Apr, aim.date.strings.ShortMay, aim.date.strings.Jun,
		aim.date.strings.Jul, aim.date.strings.Aug, aim.date.strings.Sep,
		aim.date.strings.Oct, aim.date.strings.Nov, aim.date.strings.Dec];
	this.days = [aim.date.strings.Sunday, aim.date.strings.Monday, aim.date.strings.Tuesday,
		aim.date.strings.Wednesday, aim.date.strings.Thursday, aim.date.strings.Friday,
		aim.date.strings.Saturday];
	this.shortDays = [aim.date.strings.Sun, aim.date.strings.Mon, aim.date.strings.Tue,
		aim.date.strings.Wed, aim.date.strings.Thu, aim.date.strings.Fri, aim.date.strings.Sat];
	this.monthNames = this.months.concat(this.shortMonths);
	this.dayNames = this.days.concat(this.shortDays);
	this.abbrevDays = [aim.date.strings.AbbSunday, aim.date.strings.AbbMonday,
		aim.date.strings.AbbTuesday, aim.date.strings.AbbWednesday, aim.date.strings.AbbThursday,
		aim.date.strings.AbbFriday, aim.date.strings.AbbSaturday ];
	
	this.amAbb = aim.date.strings.Date_am;
	this.pmAbb = aim.date.strings.Date_pm;
	
	this.kEmptyDate = null;
	this.MONTH_LENGTH = [31,28,31,30,31,30,31,31,30,31,30,31]; // 0-based
	this.LEAP_MONTH_LENGTH = [31,29,31,30,31,30,31,31,30,31,30,31]; // 0-based
	
	//	constants for use in aim.date.add
	this.dateParts={ 
		YEAR:0, MONTH:1, DAY:2, HOUR:3, MINUTE:4, SECOND:5, MILLISECOND:6, QUARTER:7, WEEK:8, WEEKDAY:9
	};
}
dojo.addOnLoad(aim.date, "onload");

/**
 * add
 *
 * This is overriding the standard dojo.date.add function to get around the
 * default addition amount of 1 when 0 is passed in as the amount. This is
 * often used in a loop, so adding 0 is a common case!
 *
 * This also takes care of some Safari date math bugs. For example, when
 * adding 240 minutes to a date, a completely incorrect date is returned with
 * the original code.
 */
aim.date.add = function(d, unit, amount)
{
	// Why default to 1 when we want to add 0?!
	//var n=(amount)?amount:1;
	var n = amount;
	var v;
	switch(unit){
		case aim.date.dateParts.YEAR:{
			v=new Date(d.getFullYear()+n, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
			break;
		}
		case aim.date.dateParts.MONTH:{
			if (d.getMonth()+n < 0)  {
			    // RH: bug #363849; correct month on Safari on Mac won't appear if month value is negative
			    var monthsToGoBack = Math.abs(d.getMonth() + n);
			    var month = 12 - (monthsToGoBack%12); 
			    var yearsToGoBack = Math.floor(monthsToGoBack / 12) + 1;
				v=new Date(d.getFullYear()-yearsToGoBack, month, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
			} 
			else {
				var newMonth = d.getMonth()+n;
				var yearToAdd = Math.floor(newMonth / 12);
				var month = newMonth % 12;
				v=new Date(d.getFullYear()+yearToAdd, month, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
			}
			break;
		}
		case aim.date.dateParts.HOUR:{
			v=new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()+n, d.getMinutes(), d.getSeconds(), d.getMilliseconds());
			break;
		}
		case aim.date.dateParts.MINUTE:{
			// Getting around a Safari date math bug.
			//v=new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()+n, d.getSeconds(), d.getMilliseconds());
			v=new Date(d.getTime() + (n * 60000));
			break;
		}
		case aim.date.dateParts.SECOND:{
			v=new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()+n, d.getMilliseconds());
			break;
		}
		case aim.date.dateParts.MILLISECOND:{
			v=new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()+n);
			break;
		}
		default:{
			v=new Date(d.getFullYear(), d.getMonth(), d.getDate()+n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
		}
	};
	return v;	//	Date
};

/**
 * getFirstDayOfWeekFromDate
 *
 * Given a date, this will return the first day of the week, taking into
 * account the current locale's firstDayOfWeek.
 */
aim.date.getFirstDayOfWeekFromDate = function(date)
{
	var dayOfWeek = date.getDay();
	var offset = dayOfWeek - aim.date.firstDayOfWeek;
	if (offset < 0) 
		offset += 7;	
	// Shift the given date to the first of the week.
	var result = aim.date.add(date, aim.date.dateParts.DAY, -offset);
	return result;
};

/**
 * getLastDayOfWeek
 *
 * Given a date, this will return the last day of the week, taking into
 * account the current locale's firstDayOfWeek.
 */ 
aim.date.getLastDayOfWeek = function(date)
{
	var dayOfWeek = date.getDay();
	var offset = ((aim.date.firstDayOfWeek - dayOfWeek) + 6) % 7;
	var result = aim.date.add(date, aim.date.dateParts.DAY, offset);
	return result;
};

/**
 * getFirstDayInMonthView
 *
 * The month view ranges from the week including the first day of the month
 * to the week including the last day of the month. It will always contain
 * 6 full weeks centered about the current month, so some days from the
 * previous and next months may appear in the view.
 *
 * This will get the first day in the month view centered about the month
 * in the given date.
 */
aim.date.getFirstDayInMonthView = function(date)
{
	var firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	var result = aim.date.getFirstDayOfWeekFromDate(firstOfMonth);
	return result;
};

/**
 * getLastDayInMonthView
 *
 * The month view ranges from the week including the first day of the month
 * to the week including the last day of the month. It will always contain
 * 6 full weeks centered about the current month, so some days from the
 * previous and next months may appear in the view.
 *
 * This will get the last day in the month view centered about the month
 * in the given date.
 */
aim.date.getLastDayInMonthView = function(date)
{
	var result = null;
	var d2 = aim.date.getFirstDayInMonthView(date);
	var d3 = aim.date.add(d2, aim.date.dateParts.DAY, 35);
	if (d3.getMonth() != date.getMonth())
	{
		// 5 weeks month
		result = aim.date.add(d2, aim.date.dateParts.DAY, 34);
	}
	else
	{
		// 6 weeks month
		result = aim.date.add(d2, aim.date.dateParts.DAY, 41);
	}
	return result;
};

/**
 * return the number of weeks in this month
 */
aim.date.numberOfWeeksSpanMonth = function(date)
{
	var result = null;
	var d2 = aim.date.getFirstDayInMonthView(date);
	var d3 = aim.date.add(d2, aim.date.dateParts.DAY, 35);
	if (d3.getMonth() != date.getMonth())
	{
		result = 5;
	}
	else
	{
		result = 6;
	}
	return result;
};

/**
 * getPreviousMonth
 *
 * This is guaranteed to return a date from the month before the given one.
 */
aim.date.getPreviousMonth = function(date)
{
	var result = aim.date.add(date, aim.date.dateParts.DAY, -date.getDate());
	return result;
};

/**
 * getNextMonth
 *
 * This is guaranteed to return a date from the month after the given one.
 */
aim.date.getNextMonth = function(date)
{
	var daysInMonth = dojo.date.getDaysInMonth(date);
	var firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
	var result = aim.date.add(firstOfMonth, aim.date.dateParts.DAY, daysInMonth);
	return result;
};

/**
 * daysSpanned
 *
 * This returns the number of days spanned by two given dates.
 * The first date is treated as a start date, and the second
 * date is treated as the end date of the span. Both dates are
 * floored to the beginning of the day prior to the span
 * calculation.
 */
aim.date.daysSpanned = function(date1, date2)
{
	var tzoffset1 = date1.getTimezoneOffset() * 60000;
	var tzoffset2 = date2.getTimezoneOffset() * 60000;
	var t1 = date1.getTime() - tzoffset1;
	var t2 = date2.getTime() - tzoffset2;
	var result = Math.floor(t2 / 86400000) - Math.floor(t1 / 86400000);
	return result;
};

/**
 * shortestDate
 *
 * Returns the shortest formatted date based on distance from current date/time
 */
aim.date.shortestDate = function(date)
{
	var fmt;
	
	var now = new Date();
	var nowDate = now.getDate();
	var nowMonth = now.getMonth();
	var nowYear = now.getYear();
	
	var then = new Date(date);
	var thenDate = then.getDate();
	var thenMonth = then.getMonth();
	var thenYear = then.getYear();
	
	var nowMidnight = new Date(nowYear, nowMonth, nowDate);
	var thenMidnight = new Date(thenYear, thenMonth, thenDate);
	var dayDiff = dojo.date.difference(thenMidnight, nowMidnight, "day")
	
	if (dayDiff == 0)
		return aim.date.strings.Today + " " + aim.date.formatDateTime(then, aim.date.strings.DateToday);
	else if (dayDiff == 1)
		return aim.date.strings.Yesterday + " " + aim.date.formatDateTime(then, aim.date.strings.DateToday);
	else if (dayDiff < 7)
		return aim.date.formatDateTime(then, aim.date.strings.DateWeek);
	else if (nowYear == thenYear)
		return aim.date.formatDateTime(then, aim.date.strings.DateThisYear);
	else
		return aim.date.formatDateTime(then, aim.date.strings.DateYear);
};

aim.date.timeAgo = function(date) {
	var fmt;
	
	var now = new Date();
	var then = new Date(date);
	
	var secondsAgo = (now - then) / 1000;
	var minutesAgo = Math.round(secondsAgo / 60);
	var daysAgo = Math.floor(secondsAgo / 86400);
	
	if (secondsAgo < 60)
		return aim.string.substituteParams(aim.date.strings.TimeAgo_NSeconds, Math.round(secondsAgo));
	else if (minutesAgo == 1)
		return aim.date.strings.TimeAgo_OneMinute;
	else if (secondsAgo < 3600)
		return aim.string.substituteParams(aim.date.strings.TimeAgo_NMinutes, minutesAgo);
	else if (secondsAgo < 5400)
		return aim.date.strings.TimeAgo_OneHour;
	else if (daysAgo == 0 && (now.getDate() == then.getDate()))
		return aim.string.substituteParams(aim.date.strings.TimeAgo_NHours, Math.round(secondsAgo / 3600));
	else if (daysAgo <= 1)
		return aim.date.strings.TimeAgo_OneDay;
	else if (daysAgo <= 7)
		return aim.string.substituteParams(aim.date.strings.TimeAgo_NDays, daysAgo);
	else if (now.getYear() == then.getYear())
		return aim.date.formatDateTime(then, aim.date.strings.TimeAgo_ThisYearDate);
	else
		return aim.date.formatDateTime(then, aim.date.strings.TimeAgo_PreviousYearDate);
};

// Converts a duration in seconds to a short readable string, like "3d 8h 47m"
aim.date.readableDuration = function(seconds) {
	if (seconds < 60)
		return Math.round(seconds) + aim.date.strings.SecondsAbbrev;

	var components = [];
		
	if (seconds >= 86400) {
		var days = Math.round(seconds / 86400);
		components.push(days + aim.date.strings.DaysAbbrev);
		seconds %= 86400;
	}
	if (seconds >= 3600) {
		var hours = Math.round(seconds / 3600);
		components.push(hours + aim.date.strings.HoursAbbrev);
		seconds %= 3600;
	}
	if (seconds >= 60) {
		var minutes = Math.round(seconds / 60);
		components.push(minutes + aim.date.strings.MinutesAbbrev);
		seconds %= 60;
	}

	return components.join(" ");	
};

//-----------------------------------------------------------------------------
// Java/C# Style Date Formatting
// Original file available at:
// http://www.javascripttoolbox.com/lib/date/source.php
// Available under dual MIT and GPL licenses.
//-----------------------------------------------------------------------------
// These functions use the same 'format' strings as the 
// java.text.SimpleDateFormat class, with minor exceptions.
// The format string consists of the following abbreviations:
// 
// Field        | Full Form          | Short Form
// -------------+--------------------+-----------------------
// Year         | yyyy (4 digits)    | yy (2 digits), y (2 or 4 digits)
// Month        | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
//              | NNN (abbr.)        |
// Day of Month | dd (2 digits)      | d (1 or 2 digits)
// Day of Week  | EE (name)          | E (abbr)
// Hour (1-12)  | hh (2 digits)      | h (1 or 2 digits)
// Hour (0-23)  | HH (2 digits)      | H (1 or 2 digits)
// Hour (0-11)  | KK (2 digits)      | K (1 or 2 digits)
// Hour (1-24)  | kk (2 digits)      | k (1 or 2 digits)
// Minute       | mm (2 digits)      | m (1 or 2 digits)
// Second       | ss (2 digits)      | s (1 or 2 digits)
// am/pm        | a                  |       
//
// NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
// Examples:
//  "MMM d, y" matches: January 01, 2000
//                      Dec 1, 1900
//                      Nov 20, 00
//  "M/d/yy"   matches: 01/20/00
//                      9/2/00
//  "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
//-----------------------------------------------------------------------------

/**
 * formatISO8601(date_object)
 * Returns a date in the ISO8601 (yyyyMMdd'T'HHmmss) format.
 * Note: Since this doesn't use format, performance should be
 * better.
 */
aim.date.formatISO8601 = function(date)
{
	var M = date.getMonth() + 1;
	var d = date.getDate();
	var H = date.getHours();
	var m = date.getMinutes();
	var s = date.getSeconds();
	var result = "" + date.getFullYear() + ((M < 0 || M > 9) ? M : "0" + M) + ((d < 0 || d > 9) ? d : "0" + d) +
		"T" + ((H < 0 || H > 9) ? H : "0" + H) + ((m < 0 || m > 9) ? m : "0" + m) + ((s < 0 || s > 9) ? s : "0" + s);
	return result;
};

/**
 * formatRFC2445(date_object)
 * Returns a date in the RFC2445 (yyyyMMdd) format.
 * Note: Since this doesn't use format, performance should be
 * better.
 */
aim.date.formatRFC2445 = function(date)
{
	var M = date.getMonth() + 1;
	var d = date.getDate();
	var result = "" + date.getFullYear() + ((M < 0 || M > 9) ? M : "0" + M) + ((d < 0 || d > 9) ? d : "0" + d);
	return result;
};

/**
 * formatRFC2445WithTime(date_object)
 * Returns a date in the RFC2445WithTime (yyyMMddHHmmss) format.
 * Note: Since this doesn't use format, performance should be
 * better.
 */
aim.date.formatRFC2445WithTime = function(date)
{
	var M = date.getMonth() + 1;
	var d = date.getDate();
	var H = date.getHours();
	var m = date.getMinutes();
	var s = date.getSeconds();
	var result = "" + date.getFullYear() + ((M < 0 || M > 9) ? M : "0" + M) + ((d < 0 || d > 9) ? d : "0" + d) +
		((H < 0 || H > 9) ? H : "0" + H) + ((m < 0 || m > 9) ? m : "0" + m) + ((s < 0 || s > 9) ? s : "0" + s);
	return result;
};

/**
 * formatDateTime(date_object, format)
 * Returns a date in the output format specified.
 * For longer formats, this function is faster than dojo's format function.
 * It is always faster in IE, but may be slower in FF for shorter formats
 * because it gets all date properties out up front, and Gecko engines
 * are slower when dealing with dates.
 */
aim.date.formatDateTime = function(date, format)
{
	var y = date.getFullYear() + "";
	var M = date.getMonth() + 1;
	var d = date.getDate();
	var E = date.getDay();
	var H = date.getHours();
	var m = date.getMinutes();
	var s = date.getSeconds();
	
	// Convert real date parts into formatted versions.
	var value = new Object();
	value["y"] = y;
	value["yyyy"] = y;
	value["yy"] = y.substring(2,4);
	value["M"] = M;
	value["MM"] = (M < 0 || M > 9) ? M : "0" + M;
	value["MMM"] = aim.date.monthNames[M - 1];
	value["NNN"] = aim.date.monthNames[M + 11];
	value["d"] = d;
	value["dd"] = (d < 0 || d > 9) ? d : "0" + d;
	value["E"] = aim.date.dayNames[E + 7];
	value["EE"] = aim.date.dayNames[E];
	value["H"] = H;
	value["HH"] = (H < 0 || H > 9) ? H : "0" + H;
	if (H == 0)
		value["h"] = 12;
	else if (H > 12)
		value["h"] = H - 12;
	else
		value["h"] = H;
	value["hh"] = (value["h"] < 0 || value["h"] > 9) ? value["h"] : "0" + value["h"];
	if (H > 11)
		value["K"] = H - 12;
	else
		value["K"] = H;
	value["k"] = H + 1;
	value["KK"] = (value["K"] < 0 || value["K"] > 9) ? value["K"] : "0" + value["K"];
	value["kk"] = (value["k"] < 0 || value["k"] > 9) ? value["k"] : "0" + value["k"];
	if (H > 11)
		value["a"] = aim.date.pmAbb;
	else
		value["a"] = aim.date.amAbb;
	value["m"] = m;
	value["mm"] = (m < 0 || m > 9) ? m : "0" + m;
	value["s"] = s;
	value["ss"] = (s < 0 || s > 9) ? s : "0" + s;
	
	// Avoiding string concatenation doesn't improve performance, and
	// can actually hurt performance a little bit for smaller aim.date.strings.
	var result = "";
	// There's a slight performance gain if we avoid using charAt for
	// longer date formats. So we create a character array by splitting the
	// string.
	var formatArray = format.split("");
	var i_format = 0;
	var c = null;
	var token = null;
	while (i_format < format.length)
	{
		c = formatArray[i_format];
		token = "";
		while ((formatArray[i_format] == c) && (i_format < formatArray.length))
			token += formatArray[i_format++];
		if (value[token] != null)
			result = result + value[token];
		else
			result = result + token;
	}
	return result;
};

/**
 * formatTime(date_object, format, shortFormat)
 * Returns a time in the output format specified. This is specifically for when
 * we have only time related information in the format string, and is an
 * optimization for browsers that are slower in dealing with date objects.
 * For longer formats, this function is faster than dojo's format function.
 * It is always faster in IE, but may be slower in FF for shorter formats
 * because it gets all date properties out up front, and Gecko engines
 * are slower when dealing with dates.
 * 
 */
aim.date.formatTime = function(date, format, shortFormat)
{
	var H = date.getHours();
	var m = date.getMinutes();
	var s = date.getSeconds();
	
	// Convert real date parts into formatted versions.
	var value = new Object();
	value["H"] = H;
	value["HH"] = (H < 0 || H > 9) ? H : "0" + H;
	if (H == 0)
		value["h"] = 12;
	else if (H > 12)
		value["h"] = H - 12;
	else
		value["h"] = H;
	value["hh"] = (value["h"] < 0 || value["h"] > 9) ? value["h"] : "0" + value["h"];
	if (H > 11)
		value["K"] = H - 12;
	else
		value["K"] = H;
	value["k"] = H + 1;
	value["KK"] = (value["K"] < 0 || value["K"] > 9) ? value["K"] : "0" + value["K"];
	value["kk"] = (value["k"] < 0 || value["k"] > 9) ? value["k"] : "0" + value["k"];
	if (H > 11)
		value["a"] = aim.date.pmAbb
	else
		value["a"] = aim.date.amAbb
	value["m"] = m;
	value["mm"] = (m < 0 || m > 9) ? m : "0" + m;
	value["s"] = s;
	value["ss"] = (s < 0 || s > 9) ? s : "0" + s;
	
	var f = format;
	if (shortFormat && (m == 0))
		f = shortFormat;
	
	// Avoiding string concatenation doesn't improve performance, and
	// can actually hurt performance a little bit for smaller aim.date.strings.
	var result = "";
	// There's a slight performance gain if we avoid using charAt.
	// So we create a character array by splitting the string.
	var formatArray = f.split("");
	var i_format = 0;
	var c = null;
	var token = null;
	while (i_format < f.length)
	{
		c = formatArray[i_format];
		token = "";
		while ((formatArray[i_format] == c) && (i_format < formatArray.length))
			token += formatArray[i_format++];
		if (value[token] != null)
			result = result + value[token];
		else
			result = result + token;
	}
	return result;
};

aim.date.formatMinutes = function(minutes, format, shortFormat)
{
	minutes = minutes % 1440;
	var H = Math.floor(minutes / 60);
	var m = minutes - (H * 60);
	
	// Convert real date parts into formatted versions.
	var value = new Object();
	value["H"] = H;
	value["HH"] = (H < 0 || H > 9) ? H : "0" + H;
	if (H == 0)
		value["h"] = 12;
	else if (H > 12)
		value["h"] = H - 12;
	else
		value["h"] = H;
	value["hh"] = (value["h"] < 0 || value["h"] > 9) ? value["h"] : "0" + value["h"];
	if (H > 11)
		value["K"] = H - 12;
	else
		value["K"] = H;
	value["k"] = H + 1;
	value["KK"] = (value["K"] < 0 || value["K"] > 9) ? value["K"] : "0" + value["K"];
	value["kk"] = (value["k"] < 0 || value["k"] > 9) ? value["k"] : "0" + value["k"];
	if (H > 11)
		value["a"] = aim.date.pmAbb
	else
		value["a"] = aim.date.amAbb
	value["m"] = m;
	value["mm"] = (m < 0 || m > 9) ? m : "0" + m;
	
	var f = format;
	if (shortFormat && (m == 0))
		f = shortFormat;
	
	// Avoiding string concatenation doesn't improve performance, and
	// can actually hurt performance a little bit for smaller aim.date.strings.
	var result = "";
	// There's a slight performance gain if we avoid using charAt.
	// So we create a character array by splitting the string.
	var formatArray = f.split("");
	var i_format = 0;
	var c = null;
	var token = null;
	while (i_format < f.length)
	{
		c = formatArray[i_format];
		token = "";
		while ((formatArray[i_format] == c) && (i_format < formatArray.length))
			token += formatArray[i_format++];
		if (value[token] != null)
			result = result + value[token];
		else
			result = result + token;
	}
	return result;
};

//------------------------------------------------------------------
// Utility functions for parsing in GetDateFromFormat()
//------------------------------------------------------------------

aim.date.IsInteger = function(val)
{
	var digits="1234567890";
	for (var i = 0; i < val.length; i++)
	{
		if (digits.indexOf(val.charAt(i)) == -1)
			return false;
	}
	return true;
};

aim.date.GetInt = function(str, i, minlength, maxlength)
{
	for (var x = maxlength; x >= minlength; x--)
	{
		var token = str.substring(i, i + x);
		if (token.length < minlength)
			return null;
		if (aim.date.IsInteger(token))
			return token;
	}
	return null;
};

//------------------------------------------------------------------
// GetDateFromFormat(date_string, format_string)
//
// This function takes a date string and a format string. It matches
// If the date string matches the format string, it returns the 
// getTime() of the date. If it does not match, it returns 0.
//------------------------------------------------------------------
aim.date.GetDateFromFormat = function(val, format)
{
	val = val + "";
	format = format + "";
	var i_val = 0;
	var i_format = 0;
	var c = "";
	var token = "";
	var token2 = "";
	var x,y;
	var now = new Date();
	var year = now.getYear();
	var month = now.getMonth()+1;
	var date = 1;
	var hh = now.getHours();
	var mm = now.getMinutes();
	var ss = now.getSeconds();
	var ampm = "";
	
	while (i_format < format.length)
	{
		// Get next token from format string
		c = format.charAt(i_format);
		token = "";
		while ((format.charAt(i_format)==c) && (i_format < format.length))
			token += format.charAt(i_format++);
		// Extract contents of value based on format token
		if (token == "yyyy" || token == "yy" || token == "y")
		{
			if (token == "yyyy")
			{
				x = 4;
				y = 4;
			}
			if (token == "yy")
			{
				x = 2;
				y = 2;
			}
			if (token == "y")
			{
				x = 2;
				y = 4;
			}
			year = aim.date.GetInt(val, i_val, x, y);
			if (year==null)
				return 0;
			i_val += year.length;
			if (year.length == 2)
			{
				if (year > 70)
					year = 1900 + (year - 0);
				else
					year = 2000 + (year - 0);
			}
		}
		/*
		// TODO: FIXUP
		// need to pass in kLongMonthNames, kShortMonthNames, kMonthName
		// need to pass in kLongDayNames, kShortDayNames, kDayNames
		else if (token == "MMM" || token == "NNN")
		{
			month = 0;
			for (var i = 0; i < DateFormat.kMonthNames.length; i++)
			{
				var month_name = DateFormat.kMonthNames[i];
				if (val.substring(i_val, i_val + month_name.length).toLowerCase() == month_name.toLowerCase())
				{
					if (token == "MMM" || (token == "NNN" && i > 11))
					{
						month = i + 1;
						if (month>12)
							month -= 12;
						i_val += month_name.length;
						break;
					}
				}
			}
			if ((month < 1) || (month > 12))
				return 0;
		}		
		else if (token=="EE"||token=="E")
		{
			for (var i = 0; i < DateFormat.kDayNames.length; i++)
			{
				var day_name = DateFormat.kDayNames[i];
				if (val.substring(i_val, i_val + day_name.length).toLowerCase() == day_name.toLowerCase())
				{
					i_val += day_name.length;
					break;
				}
			}
		}
		*/
		else if (token == "MM" || token == "M")
		{
			month = aim.date.GetInt(val, i_val, token.length, 2);
			if (month == null || (month < 1) || (month > 12))
				return 0;
			i_val += month.length;
		}
		else if (token == "dd" || token == "d")
		{
			date = aim.date.GetInt(val, i_val, token.length, 2);
			if (date == null || (date < 1) || (date > 31))
				return 0;
			i_val += date.length;
		}
		else if (token == "hh" || token == "h")
		{
			hh = aim.date.GetInt(val, i_val, token.length, 2);
			if (hh == null || (hh < 1) || (hh > 12))
				return 0;
			i_val += hh.length;
		}
		else if (token == "HH" || token == "H")
		{
			hh = aim.date.GetInt(val, i_val, token.length, 2);
			if (hh == null || (hh < 0) || (hh > 23))
				return 0;
			i_val += hh.length;
		}
		else if (token == "KK" || token == "K")
		{
			hh = aim.date.GetInt(val, i_val, token.length, 2);
			if (hh == null || (hh < 0) || (hh > 11))
				return 0;
			i_val += hh.length;
		}
		else if (token == "kk" || token == "k")
		{
			hh = aim.date.GetInt(val, i_val, token.length, 2);
			if (hh == null || (hh < 1) || (hh > 24))
				return 0;
			i_val += hh.length;
			hh--;
		}
		else if (token == "mm" || token == "m")
		{
			mm = aim.date.GetInt(val, i_val, token.length, 2);
			if (mm == null || (mm < 0) || (mm > 59))
				return 0;
			i_val += mm.length;
		}
		else if (token == "ss" || token == "s")
		{
			ss = aim.date.GetInt(val, i_val, token.length, 2);
			if (ss == null || (ss < 0) || (ss > 59))
				return 0;
			i_val += ss.length;
		}
		else if (token == "a")
		{		
			// TODO: NOTE THIS IS DANGEROUS (always assumes two characters)
			var len = 0;
			var ampmStr = val.substring(i_val, i_val+2).toLowerCase();
			if (ampmStr == aim.date.strings.Date_am) {
				len = aim.date.strings.Date_am.length;
				ampm = "AM";
			}
			else if (ampmStr == aim.date.strings.Date_pm) {
				len = aim.date.strings.Date_pm.length;
				ampm = "PM";
			}
			else {
				return 0;
			}
			i_val += len;
		}
		else
		{
			if (val.substring(i_val, i_val+token.length) != token)
				return 0;
			else
				i_val += token.length;
		}
	}
	// If there are any trailing characters left in the value, it doesn't match
	if (i_val != val.length)
		return 0;
	// Is date valid for month?
	if (month == 2)
	{
		// Check for leap year
		if ( ( (year % 4 == 0)&&(year % 100 != 0) ) || (year % 400 == 0) ) // leap year
		{
			if (date > 29)
				return 0;
		}
		else
		{
			if (date > 28)
				return 0;
		}
	}
	if ((month == 4) || (month == 6) || (month == 9) || (month == 11))
	{
		if (date > 30)
			return 0;
	}
	// Correct hours value
	if (hh < 12 && ampm == "PM")
		hh = hh - 0 + 12;
	else if (hh > 11 && ampm == "AM")
		hh-=12;
	var newdate = new Date(year, month - 1, date, hh, mm, ss);
	return newdate.getTime();
};

//------------------------------------------------------------------
// ParseDate(date_string [, prefer_euro_format])
//
// This function takes a date string and tries to match it to a
// number of possible date formats to get the value. It will try to
// match against the following international formats, in this order:
// y-M-d   MMM d, y   MMM d,y   y-MMM-d   d-MMM-y  MMM d
// M/d/y   M-d-y      M.d.y     MMM-d     M/d      M-d
// d/M/y   d-M-y      d.M.y     d-MMM     d/M      d-M
// A second argument may be passed to instruct the method to search
// for formats like d/M/y (european format) before M/d/y (American).
// Returns a Date object or null if no patterns match.
//------------------------------------------------------------------
aim.date.ParseDate = function(val)
{
	var preferEuro = (arguments.length == 2) ? arguments[1] : false;
	generalFormats = new Array('y-M-d', 'MMM d, y', 'MMM d,y', 'y-MMM-d', 'd-MMM-y', 'MMM d');
	monthFirst = new Array('M/d/y', 'M-d-y', 'M.d.y', 'MMM-d', 'M/d', 'M-d');
	dateFirst = new Array('d/M/y', 'd-M-y', 'd.M.y', 'd-MMM', 'd/M', 'd-M');
	var checkList = new Array('generalFormats', preferEuro ? 'dateFirst' : 'monthFirst', preferEuro ? 'monthFirst' : 'dateFirst');
	var d = null;
	for (var i = 0; i < checkList.length; i++)
	{
		var l = window[checkList[i]];
		for (var j = 0; j < l.length; j++)
		{
			d = aim.date.GetDateFromFormat(val,l[j]);
			if (d!=0)
				return new Date(d);
		}
	}
	return null;
};

//------------------------------------------------------------------
// ParseDateFromFormat
// Given a string and a date-format pattern string
//
// Return a JavaScript Date object representing the date
// Return null for the following
//   - if the string does not follow date-format pattern
//   - if the string leads to an invalid date (e.g. 02/30/2007)
//   - if the date is before 1970
//------------------------------------------------------------------
aim.date.ParseDateFromFormat = function(val, format)
{
	var retDate = null;
	try
	{
		retDate = new Date(aim.date.GetDateFromFormat(val, format));
		if (retDate == null || retDate.getFullYear() <= 1970) {
			retDate = null;
		}
	}
	catch(ex) {
		retDate = null;
	}
	return retDate;
};

//------------------------------------------------------------------
// ParseTimeFromFormat
// Given a time string and a time-format pattern string
//
// Return a JavaScript Date object representing today's date and time
// Use getHours() and getMinutes() to get the hour/min values
// Return null for the following
//   - if the string does not follow time-format pattern
//   - if the string leads to an invalid time
//------------------------------------------------------------------
aim.date.ParseTimeFromFormat = function(timeVal, timeFormat)
{
	var retDate = null;
	
	// To get this to work, do this trick
	// Append a date format to timeFormat and today's date to timeVal;
	var today = new Date();
	var y   = today.getYear()+1900;
	var m   = today.getMonth()+1;
	var d   = today.getDate();
	
	var val  = m + "/" + d + "/" + y;
	var dateFmt = "M/d/yyyy";
	
	var allval = val + " " + timeVal;
	var allFmt = dateFmt + " " + timeFormat;

	return aim.date.ParseDateFromFormat(allval, allFmt);
};

//------------------------------------------------------------------
// ParseHourMinField - used by AddEventDialog and InlineAddEvent
// Given 
//    time string and a 
//    a long time-format pattern string
//    a short time-format pattern string
//
// Return an object with hour/min properties
// Use getHours() and getMinutes() to get the hour/min values
// Return null for the following
//   - if the string does not follow time-format pattern
//   - if the string leads to an invalid time
//------------------------------------------------------------------
aim.date.ParseHourMinTextField = function(timeVal, timeFormat, timeFormatShort)
{
	var hr = 0;
	var min = 0;
	var noMinutes = false;
	var ret = [];
	var dtTime = aim.date.ParseTimeFromFormat(timeVal, timeFormat);

	if (dtTime == null) {
		noMinutes = true;					
	}
	else {
		hr = dtTime.getHours();
		min = dtTime.getMinutes();
	}
	
	if (noMinutes) {
		// Could be in short format (e.g. 12pm)
		dtTime = aim.date.ParseTimeFromFormat(timeVal, timeFormatShort);
		if (dtTime != null) {
			hr = dtTime.getHours();
			min = 0;
		}
	}
	
	if (dtTime == null) {
		return null;
	}
	ret.hr = hr;
	ret.min = min;
	
	return ret;
};
/**
 *
 */
aim.date.GetPreviousWeekDate = function(aDate)
{
	var result = aim.date.add(aDate, aim.date.dateParts.DAY, -7);
	return result;
};
/**
 *
 */
aim.date.GetNextWeekDate = function(aDate)
{
	var result = aim.date.add(aDate, aim.date.dateParts.DAY, 7);
	return result;
};
/**
 * Retrieves the first day of the week containing the given anchor date.
 * @return the first day of the week containing the given anchor date
 */
aim.date.GetFirstDayInWeek = function(date, firstDayOfWeek)
{
        var dayOfWeek = date.getDay();
        var offset = dayOfWeek - firstDayOfWeek;
        if (offset < 0) 
                offset += 7;
        var result = aim.date.add(date, aim.date.dateParts.DAY, -offset);
        return result;
};
/**
 * Retrieves the last day of the week containing the given anchor date.
 * @return the last day of the week containing the given anchor date
 */
aim.date.GetLastDayInWeek = function(date, firstDayOfWeek)
{
  var dayOfWeek = date.getDay();
  var offset = ((firstDayOfWeek - dayOfWeek) + 6) % 7;
  var result = aim.date.add(date, aim.date.dateParts.DAY, offset);
  return result;
};

aim.date.IsValidDate = function(date)
{
	return ((date != aim.date.kEmptyDate) && date.getTime);
};
//-----------------------------------------------------------------------------
// TimeRangeFormatter(cStart, cEnd, allDay, longFormat, shortFormat)
// Builds up a time range string from the information given. This
// tries to conserve as much space as possible by using the shortFormat when
// components have times that begin or end on the hour. Also, when a component
// begins and ends at the same time, only the start time is used. When a
// component is untimed/allDay, empty string is returned.
//
// Examples: 9am-10:30am, 7pm
//-----------------------------------------------------------------------------
aim.date.TimeRangeFormatter = function(cStart, cEnd, allDay, longFormat, shortFormat)
{
	// Return an empty string if the component is null, untimed, or has an invalid
	// start date.

	if (allDay || !aim.date.IsValidDate(cStart))
		return "";
		
	var result;
	var sStart = aim.date.formatDateTime(cStart, (cStart.getMinutes() > 0 ? longFormat : shortFormat));
	// Return only the start date if the end is not valid/defined, or if the start
	// date matches the end date.
	if (!aim.date.IsValidDate(cEnd) || (cStart.getTime() == cEnd.getTime()))
	{
		result = sStart;
	}
	else
	{
		var sEnd = aim.date.formatDateTime(cEnd, (cEnd.getMinutes() > 0 ? longFormat : shortFormat));
		result = sStart + '-' + sEnd;
	}
	return result;
};
aim.date.FormatTimeRange = function(start, end, allDay, longFormat, shortFormat)
{
	var result = aim.date.TimeRangeFormatter(start, end, allDay, longFormat, shortFormat);
	if (result)
		result = result.toLowerCase();
	return result;
};

/**
 * Tests to see if the given year is a leap-year.
 * @return true if the given year is a leap-year
 */
aim.date.IsLeapYear = function(year)
{
	return (year%4 == 0) && ((year%100 != 0) || (year%400 == 0));
};

/**
 * Returns the number days in the specified month-year combination.
 * @return number of days in the specified month-year combination
 */
aim.date.GetDaysInMonth = function(year, month)
{
	return aim.date.IsLeapYear(year) ? aim.date.LEAP_MONTH_LENGTH[month] : aim.date.MONTH_LENGTH[month];
};

/**
 * Increment current date by one month
 * If current date is on 31st or 30th and next month doen't have 31st or 30th,
 *   snap to last day on next month
 */
aim.date.incrementMonth = function(aDate)
{
	var dayOfMonth = aDate.getDate(); // e.g. March 31
	var nextMonth = new Date(aDate.getFullYear(), aDate.getMonth()+1, 1);  // e.g. April 1
	var daysInNextMonth = aim.date.GetDaysInMonth(nextMonth.getFullYear(), nextMonth.getMonth()); // 30
	if (dayOfMonth <= daysInNextMonth) {
		nextMonth.setDate(dayOfMonth);  // 
	} else {
		nextMonth.setDate(daysInNextMonth); // March 30
	}
	return nextMonth;
};
