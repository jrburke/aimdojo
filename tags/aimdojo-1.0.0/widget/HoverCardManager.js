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

dojo.provide("aim.widget.HoverCardManager");

dojo.require("aim.html");
dojo.require("aim.widget.popup");
dojo.require("aim.widget.util");

dojo.declare("aim.widget.HoverCardManager", null, {
	openDelay: 400,
	closeDelay: 400,
	hoverCardOrient: {'TL': 'TR'},
	hoverCardPointerSide: "right",
	hoverCardPadding: [aim.widget.pointerWidth, -27],
	hoverCardPointer: "visible",

	hoverNodeClass: null,
	targetNodeClass: null,

	constructor: function(topNode, cardCtor, rowClass, cardParams, shouldOpenFunction, positionParams) {
		this.topNode = topNode;
		this.cardCtor = cardCtor;
		this.rowClass = rowClass;
		cardParams.manager = this;
		this.cardParams = cardParams;
		this.shouldOpenFunction = shouldOpenFunction;
		this.mouseMoveHandles = [];
		
		var _self = this;
		dojo.forEach(["hoverCardOrient", "hoverCardPointerSide", "hoverCardPointer", "hoverCardPadding"], function(item){
			if(item in positionParams){
				_self[item] = positionParams[item];
			}
		});
		
		dojo.connect(this.topNode, "onmouseover", this, "onMouseOverGrid");
	},
	
	setHoverRefNode: function(hoverNodeClass, hoverCardOrient, hoverCardPointerSide) {	
		if(hoverCardOrient)
			this.hoverCardOrient = hoverCardOrient;
		if(hoverCardPointerSide)
			this.hoverCardPointerSide = hoverCardPointerSide;
		if(hoverNodeClass) 
			this.hoverNodeClass = hoverNodeClass;
	},
	
	setTargetNodeClass: function(targetNodeClass) {
		this.targetNodeClass = targetNodeClass;
	},
	
	onMouseOverGrid: function(e) {
		var t = e.target;
		while (t != null && !dojo.hasClass(t, this.rowClass))
			t = t.parentNode;
		if (this.card && this.card.isShowing()) {
			if (t && (!this.targetNodeClass || dojo.hasClass(e.target, this.targetNodeClass)))
				this.openSoon(t);
			else
				this.closeSoon();
		} else {
			if (t && (!this.targetNodeClass || dojo.hasClass(e.target, this.targetNodeClass)))
				this.openSoon(t);
			else
				this.cancelOpen();
		}
		
		if (!this.mouseMoveHandles.length) {
			dojo.forEach(aim.widget.popup.windows, function(win) {
				this.mouseMoveHandles.push(dojo.connect(win.document.documentElement, "onmousemove", this, "onMouseMove"));
			}, this);
		}
	},
	
	onMouseMove: function(e) {
		var isThisWin = (e.target.ownerDocument == document);		
		this.overCard = isThisWin && this.card && aim.html.overElement(this.card.domNode, e);
		this.overTopNode = isThisWin && aim.html.overElement(this.topNode, e);
		
		if (this.overCard)
			this.cancelTimeouts();
		else if (!this.overTopNode)
			this.closeSoon();
	},
	
	openSoon: function(hoverNode) {
		this.cancelTimeouts();
		this.openTimer = setTimeout(dojo.hitch(this, "open", hoverNode), this.openDelay);
	},
	closeSoon: function() {
		if (this.closeTimer) return;
		this.cancelTimeouts();
		this.closeTimer = setTimeout(dojo.hitch(this, "close"), this.closeDelay);
	},
	cancelTimeouts: function() {	
		this.cancelOpen();
		this.cancelClose();
	},
	cancelOpen: function() {
		if (this.openTimer) clearTimeout(this.openTimer);
		this.openTimer = null;
	},
	cancelClose: function() {
		if (this.closeTimer) clearTimeout(this.closeTimer);
		this.closeTimer = null;
	},
	
	open: function(hoverNode) {
		if (this.card && this.card.isShowing())
			this.close();
		
		// Opening the hover card will close any other popup widget.  If some other popup
		// is open, it's probably a menu or dialog that the user requested, so don't open the hover
		// card because the user will probably be annoyed to have the other menu closed.
		if (aim.widget.popup.isAnyPopupOpen())
			return;
			
		// If offsetHeight is 0, assume the node has been hidden and don't show the card.
		if (!hoverNode.offsetHeight)
			return;
			
		var shouldShow = this.shouldOpenFunction ? this.shouldOpenFunction(hoverNode) : true;

		if(shouldShow){
			if (!this.card) {
				this.card = new this.cardCtor(this.cardParams);			
				this.card.startup();
			}
			this.hoverNode = hoverNode;
			
			if (!this.card.populate(this.hoverNode)) return;
			
			var refNode = hoverNode;	
			if (this.hoverNodeClass) {
				var refNodes = dojo.query("." + this.hoverNodeClass, hoverNode);
				if (refNodes)
					refNode = refNodes[0];
			}
			
			aim.widget.popup({
				popup: this.card,
				around: refNode,
				orient: this.hoverCardOrient,
				padding: this.hoverCardPadding
			});
			
			if(this.hoverCardPointer != "hidden"){
				aim.widget.pointer({node: this.card.domNode, side: this.hoverCardPointerSide, target: refNode});
			}
			aim.widget.dropShadow(this.card.domNode);
		}
	},
	
	close: function() {	
		if (!this.overCard && !this.overTopNode) {
			dojo.forEach(this.mouseMoveHandles, dojo.disconnect);
			this.mouseMoveHandles = [];
		}
		
		if (this.card)
			aim.widget.popup.close(this.card);
	}
});

