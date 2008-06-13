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
dojo.provide("aim._AimWidgetMixIn");

dojo.require("dojo.i18n");

dojo.requireLocalization("aim", "strings");

aim._AimWidgetMixIn = {
	spacer: dojo.moduleUrl("aim", "spacer.gif"),

	postMixInProperties: function() {
		//summary: adding to postMixInProperties to get the localized strings
		//as part of the object.
		this.strings = dojo.i18n.getLocalization("aim", "strings");
		
		this.inherited("postMixInProperties", arguments);
	},

	show: function() {
		this.domNode.style.display = "";
	},
	hide: function() {
		this.domNode.style.display = "none";
	},
	isShowing: function() {
		return this.domNode.style.display != "none";
	},
	setShowing: function(show) {
		if (show){
			this.show();
		}else{
			this.hide();
		}
	},
	
	setEnabled: function(enable) {
		if (enable){
			this.enable();
		}else{
			this.disable();
		}
	},
	
	resize: function(size) {
		dojo.marginBox(this.domNode, size);
		this.onResized();
	},

	onResized: function() {
		var wgt = this.stackWidget || this.layoutWidget;
		if (wgt && wgt.resize){
			wgt.resize();
		}
	},
	
	onShow: function() {
		var cb = dojo.contentBox(this.domNode);
		if (cb.w != this.width || cb.h != this.height){
			this.onResized();
		}
		this.width = cb.w;
		this.height = cb.h;
	},
	onHide: function(){
	}
};

