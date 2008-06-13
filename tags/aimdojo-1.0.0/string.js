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
dojo.provide("aim.string");

aim.string = {
	// This is just like dojo.string.substitute, but in addition to Dojo-style patterns
	// like %{0}, it also accepts .NET style patterns like {0}.  Thus we don't have to worry
	// about whether a given string will be formatted on the server side or client side.
	substituteParams: function(template /*string */, hash /* object - optional or ... */) {
		var map = (typeof hash == 'object') ? hash : dojo._toArray(arguments, 1);

		if (template == null) {
			console.log("substituteParams: missing string template!", arguments);
			return "";
		};

		return template.replace(/\%?\{(\w+)\}/g, function(match, key){
			if (typeof(map[key]) != "undefined" && map[key] != null)
				return map[key];
				
			throw new Error("Substitution not found: " + key);
		});
	},
	
	escapeXml: function(str){
		return str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;").replace(/'/gm, "&#39;");
	},
	
	// Truncates 'str' after 'len' characters and appends periods as necessary so that it ends with "..."
	summary: function(str, len) {
		if (!len || str.length <= len)
			return str;

		return str.substring(0, len).replace(/\.+$/, "") + "...";
	}
};
