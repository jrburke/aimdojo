/*
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
dojo.provide("aim.lang");

aim.lang = {
	setTimeout: function(func, delay){
		// summary:
		//		Sets a timeout in milliseconds to execute a function in a given
		//		context with optional arguments.
		// usage:
		//		aim.lang.setTimeout(Object context, function func, number delay[, arg1[, ...]]);
		//		aim.lang.setTimeout(function func, number delay[, arg1[, ...]]);

		var context = window, argsStart = 2;
		if(!dojo.isFunction(func)){
			context = func;
			func = delay;
			delay = arguments[2];
			argsStart++;
		}

		if(dojo.isString(func))
			func = context[func];
		
		var args = [];
		for (var i = argsStart; i < arguments.length; i++)
			args.push(arguments[i]);
		return window.setTimeout(function(){ func.apply(context, args); }, delay);
	},
	
	// Returns all the elements that are in arr1 but not in arr2.
	difference: function(arr1, arr2) {
		var ret = [];
		for (var i = 0; i < arr1.length; i++)
			if (dojo.indexOf(arr2, arr1[i]) == -1)
				ret.push(arr1[i]);
		return ret;
	},

	findByProp: function(arr, prop, val) {
		for (var i = 0; i < arr.length; i++)
			if (arr[i][prop] == val)
				return i;
		return -1;
	},
	
	defer: function(thisObj, func, delay, id) {
		if (this._deferTimeouts[id])
			clearTimeout(this._deferTimeouts[id]);
			
		this._deferTimeouts[id] = setTimeout(dojo.hitch(thisObj, func), delay);
	},

	_deferTimeouts: {},

	encode: function(string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
			
			for (var n = 0; n < string.length; n++) {
					var c = string.charCodeAt(n);
					if (c < 128) {
							utftext += String.fromCharCode(c);
					} else if ((c > 127) && (c < 2048)) {
							utftext += String.fromCharCode((c >> 6) | 192);
							utftext += String.fromCharCode((c & 63) | 128);
					} else {
							utftext += String.fromCharCode((c >> 12) | 224);
							utftext += String.fromCharCode(((c >> 6) & 63) | 128);
							utftext += String.fromCharCode((c & 63) | 128);
					}
			}
			return utftext;
	}
};

