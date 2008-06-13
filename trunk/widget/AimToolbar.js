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

dojo.provide("aim.widget.AimToolbar");

dojo.require("aim._AimTemplatedWidget");
dojo.require("dijit._Container");
dojo.require("aim.html");

dojo.declare("aim.widget.AimToolbar", [aim._AimTemplatedWidget, dijit._Container], {
		templateString: '<div class="aimToolbar">' +
					 '	<div class="containerNode" dojoAttachPoint="containerNode" style="float: left;"></div>' +
					 '	<div class="centerNode" dojoAttachPoint="centerNode" style="float: left;"></div>' +
					 '	<div class="rightNode" dojoAttachPoint="rightNode" style="float: right;"></div>' +
					 '</div>',
		vizType: "",
		
		startup: function(args, frag) {
			if (this.vizType)
				dojo.addClass(this.domNode, "aimToolbar" + this.vizType);
			
			this.getChildren().forEach(dojo.hitch(this, "_processChild"));

			// In dialogs containing a toolbar, IE disappears the buttons at
			// creation time, when the browser is resized, and when the dialog is shown.  It seems
			// we can goad it into showing them by changing any style attribute..
			if (dojo.isIE) {
				setTimeout(dojo.hitch(this, "fixButtons"), 10);
				this.connect(window, "onresize", "fixButtons");
			}
		},
		
		addToolbarItem: function(widget) {
			this.addChild(widget);
			this._processChild(widget);
		},
		
		_processChild: function(child) {
			var floatStyle = "left";
			if (child.toolbarPosition == "right")
				floatStyle = "right";
			aim.html.setFloat(child.domNode, floatStyle);
			
			// Move the child to the appropriate div
			var newParent = (child.toolbarPosition == "center") ? this.centerNode :
							((child.toolbarPosition == "right") ? this.rightNode : null);
			if (newParent) {
				this.containerNode.removeChild(child.domNode);
				newParent.appendChild(child.domNode);
			}
		},
		
		fixButtons: function() {
			this.domNode.style.zoom = "";
			this.domNode.style.zoom = 1;
		},
		
		onResized: function() {
			this.layout();
		},
		
		layout: function() {
			var sumWidths = function(nodes) {
				var ret = 0;
				dojo.forEach(nodes, function(node) {
					if (node.nodeType == 1)	// ELEMENT_NODE
						// HACK: +1 keeps buttons on same line, needed for IE, no side effect on FF
						ret += dojo.marginBox(node).w + 1;
				});
				return ret;
			};
			
			// Compute the total width of the items in each section
			var leftWidth = sumWidths(this.containerNode.childNodes);
			var rightWidth = sumWidths(this.rightNode.childNodes);
			var centerWidth = sumWidths(this.centerNode.childNodes);
			
			var totalWidth = dojo.contentBox(this.domNode).w;
			
			// Compute the left margin for the center section
			var pad = Math.round((totalWidth - (leftWidth + rightWidth + centerWidth)) / 2);
			this.centerNode.style.marginLeft = pad + "px";
			
			// Set the width of each section.  Float doesn't work right if the node doesn't
			// have a specified width.  Don't make any section wider than the total width
			// of the toolbar, so the items within a section will wrap if needed.
			dojo.contentBox(this.containerNode, {w: Math.min(totalWidth, leftWidth)});
			dojo.contentBox(this.rightNode, {w: Math.min(totalWidth, rightWidth)});
			dojo.contentBox(this.centerNode, {w: Math.min(totalWidth, centerWidth)});
		}
});

// AimToolbar can contain any kind of widget, so mix the toolbarPosition property into
// the base widget class.
dojo.extend(dijit._Widget, {
	toolbarPosition: 'left'
});
