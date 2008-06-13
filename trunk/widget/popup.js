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

dojo.provide("aim.widget.popup");

dojo.require("dijit._base.place");
dojo.require("dijit._base.popup");	// For dijit.BackgroundIframe
dojo.require("aim.html");

// This is an alternative to dijit.popup, since it doesn't handle the simple matter
// of closing the popup when you click elsewhere, unless you deal with funky focus
// issues.

aim.widget.popup = function(args) {
	// args: Object
	//		popup: Widget
	//			widget to display,
	//		parent: Widget
	//			the parent popup widget, if applicable
	//		around: DomNode
	//			DOM node (typically a button); place popup relative to this node
	//		orient: Object
	//			structure specifying possible positions of popup relative to "around" node
	//		x, y: Integers
	//			coordinates of the popup, if around is not specified
	var widget = args.popup,
		orient = args.orient || {'BL':'TL', 'TL':'BL'},
		padding = args.padding || [0, 0],
		around = args.around;

	// make wrapper div to hold widget and possibly hold iframe behind it.
	// we can't attach the iframe as a child of the widget.domNode because
	// widget.domNode might be a <table>, <ul>, etc.
	var wrapper = dojo.doc.createElement("div");
	wrapper.id = "aimPopup" + Math.round(Math.random() * 10000);
	wrapper.className = "dijitPopup";
	wrapper.style.zIndex = aim.widget.popup.beginZIndex + aim.widget.popup.stack.length;
	wrapper.style.visibility = "hidden";
	if (args.parent)
		wrapper.dijitPopupParent = args.parent.id;
	dojo.body().appendChild(wrapper);

	widget.domNode.style.display = "";
	wrapper.appendChild(widget.domNode);

	var iframe = new dijit.BackgroundIframe(wrapper);

	// position the wrapper node
	var pos = around ?
		dijit.placeOnScreenAroundElement(wrapper, around, orient, null) :
		dijit.placeOnScreen(wrapper, args, orient == 'R' ? ['TR','BR','TL','BL'] : ['TL','BL','TR','BR']);
	
	var x = pos.x + padding[0]*(pos.corner.charAt(1) == "L" ? 1 : -1);
	var y = pos.y + padding[1]*(pos.corner.charAt(0) == "T" ? 1 : -1);
	
	// Adjust position to ensure the widget is entirely within the viewport
	var size = dojo.marginBox(wrapper);
	var viewport = dijit.getViewport();
	if (x + size.w > viewport.w)
		x = Math.max(0, viewport.w - size.w);
	if (y + size.h > viewport.h)
		y = Math.max(0, viewport.h - size.h);
		
	wrapper.style.left = x + "px";
	wrapper.style.top = y + "px";
	wrapper.style.visibility = "visible";

	var keyhandler = dojo.connect(dojo.isIE ? dojo.body() : dojo.doc, "onkeypress",  function(evt) {
		if (evt.keyCode == dojo.keys.ESCAPE)
			aim.widget.popup.close(widget);
	});

	aim.widget.popup.stack.push({
		wrapper: wrapper,
		iframe: iframe,
		widget: widget,
		parent: args.parent,
		handler: keyhandler
	});

	if (widget.onOpen)
		widget.onOpen();
};

dojo.mixin(aim.widget.popup, {
	beginZIndex: 1000,
	stack: [],
	
	// Close specified popup and any popups that it parented
	close: function(popup) {
		while(dojo.some(this.stack, function(elem) {return elem.widget == popup;})){
			var top = this.stack.pop(),
				wrapper = top.wrapper,
				iframe = top.iframe,
				widget = top.widget;
			
			dojo.disconnect(top.handler);
	
			widget.domNode.style.display = "none";
			dojo.body().appendChild(widget.domNode);
			iframe.destroy();
			dojo._destroyElement(wrapper);
	
			if (widget.onClose)
				widget.onClose();
		}
	},
	
	onDocumentMouseDown: function(evt) {
		if (this._ignoringClicks) return;
		
		var i = this.stack.length - 1;
		for (var i = this.stack.length - 1; i >= 0; i--) {
			if (aim.html.overElement(this.stack[i].wrapper, evt))
				return;
			this.close(this.stack[i].widget);
		}
	},
	
	onDocumentKeyPress: function(evt) {
		if (this.stack[0] && this.stack[0].widget.processKey)
			this.stack[0].widget.processKey(evt);
	},
	
	registerWin: function(win) {
		win.popupHandles = [
			dojo.connect(win.document, "onmousedown", this, "onDocumentMouseDown"),
			dojo.connect(dojo.isIE ? win.document.body : win.document, "onkeypress", this, "onDocumentKeyPress")
		];
		this.windows.push(win);
	},
	unregisterWin: function(win) {
		if (win.popupHandles)
			dojo.forEach(win.popupHandles, dojo.disconnect);
		this.windows = aim.lang.difference(this.windows, [win]);
	},
	windows: [],
	
	// Allow the global click handler to be temporarily disabled.
	ignoreClicks: function(ignore) {
		this._ignoringClicks = ignore;
	},
	
	isAnyPopupOpen: function() {
		return this.stack.length > 0;
	}
});

dojo.addOnLoad(dojo.hitch(aim.widget.popup, "registerWin", window));