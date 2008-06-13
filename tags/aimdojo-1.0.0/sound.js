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
dojo.provide("aim.sound");

aim.sound = {
	// Path to SoundBridge.swf, the flash file that plays the sounds.
	swf: dojo.moduleUrl("aim", "SoundBridge.swf"),

	// Play a sound.
	// On Firefox and Safari, this works only if Flash 8+ is installed, and
	// only with MP3 files.
	play: function(url) {
		if (this.swf) {
			if (!this.available()) {
				return;
			}
				
			if (dojo.isIE) {
				this._playBgsound(url);
			} else {
				this._playFlash(url);
			}
		}
	},
	
	available: function() {
		if (dojo.isIE)
			return true;
			
		// Check if Flash 8+ is present.. this check will only work on Firefox and Safari.
		// Older versions of Flash don't support ExternalInterface, which we use to call
		// methods in the movie.
		var plugin = navigator.plugins["Shockwave Flash"];
		if (plugin)
			var major = plugin.description.replace(/([a-zA-Z]|\s)+/, "").replace(/(\s+r|\s+b[0-9]+)/, ".").split(".")[0];
			
		return plugin && (major >= 8);
	},
	
	_playBgsound: function(url) {
		// bgsound is old and junky, but it works without any plugins or security warnings
		if (!this._bgsoundNode) {
			this._bgsoundNode = document.createElement("bgsound");
			dojo.body().appendChild(this._bgsoundNode);
		}
		
		this._bgsoundNode.src = url;
	},
	
	_playFlash: function(url) {
		// Play a sound using SoundBridge.swf from the Javascript Sound Kit.
		// http://jssoundkit.sourceforge.net/
		if (!this._flashMovies[url]) {
			var id = "aimSoundMovie" + this._flashCount++;

			var html = aim.string.substituteParams(
				'<embed src="{swf}" FlashVars="id={id}"' +
				' allowScriptAccess="always" quality="high" bgcolor="#ffffff" width="0" height="0"' +
				' name="{id}" align="middle" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />',
				{id: id, swf: this.swf}
			);

			var el = document.createElement("div");
			document.body.appendChild(el);
			el.innerHTML = html;
	        
			this._flashMovies[url] = document[id];
		}
		
		if (!this._flashMovies[url].proxyMethods) {
			aim.lang.setTimeout(this, "_playFlash", 500, url);
			return;
		}
		
		this._flashMovies[url].proxyMethods("loadSound", [url, true]);	
	},
	_flashCount: 0,
	_flashMovies: {}
};

// SoundBridge.swf contains hardcoded calls to these functions.
Sound = {
	onLoad: function() {},
	onSoundComplete: function() {},
	onID3: function() {}
};

