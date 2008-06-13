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
dojo.provide("aim.LayoutContainer");

dojo.require("dijit.layout.LayoutContainer");
dojo.require("aim._AimWidgetMixIn");

//Mixes in aim._AimWidgetMixin with LayoutContainer.

(function(){
	var mixins = {};
	for(var param in aim._AimWidgetMixIn){
		mixins[param] = aim._AimWidgetMixIn[param];
	}
	
	//Override the resize function from aim._AimWidgetMixIn.
	//Originally, the contents of aim._AimWidgetMixIn was mixed in 
	//with dojo._Widget, but we want to avoid that global change.
	//Ideally, aim._AimWidgetMixIn would be inserted into the inheritance
	//chain before dijit.layout._LayoutWidget
	mixins.resize = function(size){
			dijit.layout._LayoutWidget.prototype.resize.apply(this, arguments);
			//dojo.marginBox(this.domNode, size);
			//this.onResized();
	}
	
	dojo.declare("aim.LayoutContainer", [dijit.layout.LayoutContainer], mixins);
})();

