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
dojo.provide("aim.browser");

aim.browser = {
	ns7: (navigator.userAgent.indexOf("Netscape/7") != -1),
	ns8: (navigator.userAgent.indexOf("Netscape/8") != -1),
	win98: (navigator.userAgent.indexOf("Windows 98") != -1) || (navigator.userAgent.indexOf("Win98") != -1),
	mac: (navigator.appVersion.indexOf("Macintosh") != -1),
	win: (navigator.appVersion.indexOf("Windows") != -1),
	
	// A flag that indicates whether this window is focused.
	isWindowFocused: true,	
	
	// Adds event handlers to keep the above flag updated.
	_trackWindowFocus: function() {
		if (dojo.isIE) {
			// On IE, onfocus events don't bubble!  But the poorly-documented
			// onfocusin event apparently does, so that's what we use.
			dojo.connect(dojo.body(), "onfocusin", this, "_onfocus");
			dojo.connect(dojo.body(), "onfocusout", this, "_onblur");
		} else {
			dojo.connect(window, "onfocus", this, "_onfocus");
			dojo.connect(window, "onblur", this, "_onblur");
		}
	},
	_onfocus: function() {
		this.isWindowFocused = true;
		// When the window gets focus, stop flashing the title
		this._clearFlashingWindowTitle();
	},
	_onblur: function() {
		this.isWindowFocused = false;
	},

	// Call this to focus an element, rather than calling element.focus() directly.
	// The benefits of this are:
	// 1) It catches the exception that IE will throw if the element isn't visible.
	// 2) It returns early if this window doesn't have focus, because otherwise
	//    el.focus() will cause the window to flash in the taskbar, which usually
	//    isn't what you want.
	focus: function(el) {
		if (!this.isWindowFocused) return;
		
		setTimeout(function() {
			try {
				el.focus();
			} catch (e) {}
		}, 0);
	},
	
	setWindowTitle: function(title) {
		if (document.title != this._flashingTitle)
			document.title = title;
		this._normalTitle = title;
	},
	
	// This will make the window title flash between its regular title (as set
	// by setWindowTitle) and a flashing title that you provide.  It will not
	// flash if the window currently has focus, and will stop flashing when the
	// window gets focus.
	setFlashingWindowTitle: function(title) {
		if (this.isWindowFocused)
			return;
		
		this._clearFlashingWindowTitle();
		this._flashingTitle = title;
		this._alternateWindowTitle();
	},
	
	_flashingTitle: null,
	_normalTitle: document.title,
	_alternateWindowTitle: function() {
		document.title = (document.title == this._normalTitle) ? this._flashingTitle : this._normalTitle;
		this._flashTitleTimeout = window.setTimeout(dojo.hitch(this, "_alternateWindowTitle"), 2000);
	},
	_clearFlashingWindowTitle: function() {
		this._flashingTitle = null;
		document.title = this._normalTitle;
		if (this._flashTitleTimeout)
			window.clearTimeout(this._flashTitleTimeout);
	}
};

dojo.addOnLoad(aim.browser, "_trackWindowFocus");
