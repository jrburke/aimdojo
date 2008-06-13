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

dojo.provide("aim.widget.AimModalPane");

dojo.require("dijit._Widget");
dojo.require("aim._AimWidget");

dojo.declare("aim.widget.AimModalPane", [aim._AimWidget], {
	destroyOnClose: true,

	startup: function() {
		this.createBG();
		this.checkSize();
	},
	
	createBG: function()
	{
		if (!this.bg)
		{
			this.bg = document.createElement("div");
			var bgStyle = this.bg.style;
			bgStyle.position = "absolute";
			bgStyle.left = bgStyle.top = 0;
			bgStyle.height = bgStyle.width = "100%";
			bgStyle.zIndex = 998;
			bgStyle.backgroundColor = "#fff";
			dojo.style(this.bg, "opacity", 0.75);
			this.bgShowing = false;
		}
		
		if (this.bgShowing)
			return;
				
		dojo.body().appendChild(this.bg);
		this.bgShowing = true;
		this.bg.id = this.id + "bg"; // required for BackgroundIframe
		this.bgIframe = new dijit.BackgroundIframe(this.bg);
	},

	checkSize: function() {
		if (this.domNode.style.display == "none") return;
		
		var viewport = dijit.getViewport();
		var mb = dojo.marginBox(this.domNode);
		var x = (viewport.w - mb.w) / 2;
		var y = (viewport.h - mb.h) / 2;

		this.domNode.style.left = x + "px";
		this.domNode.style.top = y + "px";

		this.bg.style.width = viewport.w + "px";
		this.bg.style.height = viewport.h + "px";
	},
	
	show: function() {
		if (!(this.domNode.parentNode && this.domNode.parentNode.tagName && this.domNode.parentNode.tagName.toLowerCase() == "body"))
			dojo.body().appendChild(this.domNode);
			
		this.inherited(arguments);
		this.createBG();
		this.checkSize();
		aim.widget.dropShadow(this.domNode);
		this.connect(window, "onresize", "checkSize");
	},

	hide: function() {
		this.bgIframe.destroy();
		dojo._destroyElement(this.bg);
		this.bgShowing = false;
		
		if (this.destroyOnClose)
			this.destroyRecursive();
		else
			this.inherited(arguments);
	}
});