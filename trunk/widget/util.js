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

dojo.provide("aim.widget.util");

dojo.extend(dijit.WidgetSet, {
	first: function() {
		for (var id in this._hash)
			return this._hash[id];
		return null;
	}
});

dojo.mixin(aim.widget, {
	createMenu: function(items) {
		var menu = new aim.widget.AimMenu();
		
		dojo.forEach(items, function(item) {
			var ctor = item.dojoType ? eval(item.dojoType) : (item.separator ? aim.widget.AimMenuSeparator : aim.widget.AimMenuItem);
			var menuItem = new ctor(item);
			menu.addChild(menuItem);
		});
		
		dojo.body().appendChild(menu.domNode);
		menu.startup();
		return menu;
	},

	// Fix the Firefox cursor bug: "overflow: auto;" has to be set on a parent div.  But even if it is set,
	// it needs to be refreshed after the widget is showing again for the cursor to blink in FF. 
	fixFFCursor: function(parentDiv) {
		if (!dojo.isMoz) return;
		
		parentDiv.style.overflow = "hidden";
		aim.lang.setTimeout(this, function() {
			parentDiv.style.overflow = "auto";
		}, 0);
	},

	// args:
	//	node: DOM node to attach the pointer to
	//	side: side of the node the pointer should appear on ("top", "right", "bottom", or "left")
	//	target:  DOM node the pointer should point to
	pointer: function(args) {
		var pointerNode = dojo.query(".aimPointer", args.node)[0];
		if (!pointerNode) {
			pointerNode = document.createElement("div");
			args.node.appendChild(pointerNode);
		}
		
		pointerNode.pointerSide = args.side;
		pointerNode.className = "aimPointer aimPointer-" + args.side;
		pointerNode.style.display = "block";
		pointerNode.style.zIndex = 2;
		
		var nodePos = dojo._abs(args.node);
		var targetPos = dojo._abs(args.target);
	
		var halfPointerSize = 14;

		if (args.side == "right" || args.side == "left") {
			var yoff = targetPos.y - nodePos.y;
			yoff += (args.target.offsetHeight / 2);
			yoff -= halfPointerSize;
			pointerNode.style.top = Math.round(yoff) + "px";
			pointerNode.style.left = "";
		} else {
			var xoff = targetPos.x - nodePos.x;
			xoff += (args.target.offsetWidth / 2);
			xoff -= halfPointerSize;
			pointerNode.style.left = Math.round(xoff) + "px";
			pointerNode.style.top = "";
		}
	},
	
	setPointerLoc: function(node, loc) {
		if (loc == null) return;
		var pointerNode = dojo.query(".aimPointer", node)[0];
		if (!pointerNode) {
			pointerNode = document.createElement("div");
			node.appendChild(pointerNode);
		}
		pointerNode.pointerSide = loc.side;
		pointerNode.className = "aimPointer aimPointer-" + loc.side;
		pointerNode.style.display = "block";
		pointerNode.style.zIndex = 2;
			
		if (loc.side == "right" || loc.side == "left") {
			pointerNode.style.top = loc.offset + "px";
			pointerNode.style.left = "";
		} else {
			pointerNode.style.left = loc.offset + "px";
			pointerNode.style.top = "";
		}
	},
	
	getPointerLoc: function(node) {
		var pointerNode = dojo.query(".aimPointer", node)[0];
		if (!pointerNode)
			return null;

		var side = pointerNode.pointerSide;
		if (side == "right" || side == "left")
			var offset = parseInt(pointerNode.style.top);
		else
			var offset = parseInt(pointerNode.style.left);
		
		return {offset: isNaN(offset) ? 0 : offset, side: side};					
	},

	hidePointer: function(node) {
		var ptr = dojo.query(".aimPointer", node)[0];
		if (ptr)
			ptr.style.display = "none";
	},
	pointerWidth: 14,
	pointerHeight: 14,
	
	// node: DOM node to attach the drop shadow to
	dropShadow: function(node, args) {
		if (dojo.isIE == 6)
			return;
			
		var createShadowBlock = function(className) {
			var shadowBlock = dojo.query("#" + node.id + className, node)[0];
			if (!shadowBlock) {
				shadowBlock = document.createElement("div");
				node.appendChild(shadowBlock);
				shadowBlock.id = node.id + className;
				shadowBlock.className = "aimDropShadow " + className;
				shadowBlock.style.zIndex = 1;
				dojo.style(shadowBlock, "opacity", 0.2);
			}
			else if (dojo.isIE) {
				// As Popup widgets are cycled between being shown and hidden, in IE the shadow blocks loose their correct size when hidden.
				// The sizes are defined as % in CSS and updating their className triggers a re-calculation.
				shadowBlock.className = "aimDropShadow " + className;
			}
			return shadowBlock;
		};
		
		var rightShadow = createShadowBlock("aimDropShadow-right");
		var bottomShadow = createShadowBlock("aimDropShadow-bottom");
		var cornerShadow = createShadowBlock("aimDropShadow-corner");
		
		if (rightShadow && bottomShadow) {
			var rsCoords = dojo.coords(rightShadow);
			var bsCoords = dojo.coords(bottomShadow);
			var gapX = (rsCoords.x + rsCoords.w) - (bsCoords.x + bsCoords.w);
			var gapY = (bsCoords.y + bsCoords.h) - (rsCoords.y + rsCoords.h);
			// It shouldn't happen, but just in case dropShadow has been called before the widget is showing, gapX and gapY
			// will be zero.  If so, don't set the sizes and default to those in cornerShadow's CSS class.
			if ((gapX + gapY) > 0) {
				cornerShadow.style.height = gapY + "px";
				cornerShadow.style.width = gapX + "px";		
			}
		}
		
		if (args)
			this.modifyShadow(args, rightShadow, bottomShadow, cornerShadow);
	},
	
	modifyShadow: function(args, rightShadow, bottomShadow, cornerShadow) {
		if (!args.modifier) return;
		switch (args.modifier) {
			case "mozBorderRadius":
				bottomShadow.style.MozBorderRadiusBottomleft = args.bottomLeft || "4px";
				cornerShadow.style.MozBorderRadiusBottomright = args.bottomRight || "4px";
				rightShadow.style.MozBorderRadiusTopright = args.topRight || "4px";
				break;
			default:
				return;		
		}
	},
	
	hideDropShadow: function(node) {
		if (dojo.isIE == 6)
			return;
			
		var hideShadowBlock = function(className) {
			var shadowBlock = dojo.query("#" + node.id + className, node)[0];
			if (shadowBlock)
				shadowBlock.style.display = "none";
		};
		
		hideShadowBlock("aimDropShadow-right");
		hideShadowBlock("aimDropShadow-bottom");
		hideShadowBlock("aimDropShadow-corner");
	}
});

