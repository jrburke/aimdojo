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

dojo.provide("aim.widget.AimButton");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.html");
dojo.require("aim.browser");

dojo.declare("aim.widget.AimButton", [aim._AimTemplatedWidget], {
		border: "none",
		showArrow: false,
		showArrowBorder: false,
		highlight: false,
		vizType: "",
		className: "",
		tabindex: "",
		title: "",
		arrowTitle: "",
		maxWidth: 0,
		minWidth: 0,
		templateString: 
			'<div class="aimButton" tabindex="${tabindex}" dojoAttachEvent="onclick: _onClick, onmouseover: onMouseOver, onmousedown: onMouseDown, onkeypress: onKeyPress">' +
			'	<nobr dojoAttachPoint="contentNode" class="content">' +
			'		<div class="label" dojoAttachPoint="containerNode"></div>' +
			'		<div class="arrow" dojoAttachPoint="arrowNode" dojoAttachEvent="onclick: onArrowClick" style="display: none;">' +
			'			<img class="aimArrow" src="${spacer}">' +
			'		</div>' +
			'	</nobr>' +
			'</div>',
		
		startup: function() {
			this.domNode.title = this.title;
			
			if (this.vizType)
				dojo.addClass(this.domNode, "aimButton" + this.vizType);
			if (this.className)
				dojo.addClass(this.domNode, this.className);
				
			if (this.border == "right")
				dojo.addClass(this.domNode, "rightBorder");
				
			if (this.showArrow)
				this.arrowNode.style.display = "";
			if (this.showArrowBorder && (dojo.isIE != 6))	// this style isn't worth the trouble on IE6
				dojo.addClass(this.arrowNode, "splitArrow");			

			if (dojo.isMoz && (aim.browser.ns7 || aim.browser.ns8))
				dojo.addClass(this.containerNode, "label_ns8moz");
				
			if (this.disabled)
				this.disable(); // get the aimButtonDisabled class setup
				
			if (this.highlight)
				this.setHighlight(true);
				
			this.sizeMyself();
			
			aim.html.addHoverClass(this.domNode, "aimButtonHover" + (this.vizType || ""));
		},
		
		getLabel: function() {
			return this.containerNode.innerHTML;
		},
		
		IsEqualsLabel: function(label) {
			return (this.containerNode.innerHTML == label);
		},
		
		setLabel: function(label) {
			this.containerNode.innerHTML = label;
			this.sizeMyself();
		},
		
		setTitle: function(title) {
			this.containerNode.title = title;
		},
		
		sizeMyself: function() {
			// we cannot size correctly if any of our ancestors are hidden (display:none),
			// so temporarily attach to document.body
			if(this.domNode.parentNode){
				var placeHolder = document.createElement("span");
				this.domNode.parentNode.insertBefore(placeHolder, this.domNode);
			}
			dojo.body().appendChild(this.domNode);
			
			this.sizeMyselfHelper();
			
			// Put this.domNode back where it was originally
			if(placeHolder){
				placeHolder.parentNode.insertBefore(this.domNode, placeHolder);
				dojo._destroyElement(placeHolder);
			}
		},

		sizeMyselfHelper: function(){
			this.containerNode.style.width = "";
			this.containerNode.style.height = "";

			var labelBox = dojo.marginBox(this.containerNode);
			var arrowWidth = this.showArrow ? dojo.marginBox(this.arrowNode).w : 0;
// 			if (this.maxWidth>0 && ((labelBox.width + arrowWidth) > this.maxWidth))
// 				labelBox.width = this.maxWidth - arrowWidth;
 			if (this.maxWidth > 0)
 				labelBox.w = this.maxWidth;
			if (this.minWidth > 0 && labelBox.w < this.minWidth)
 				labelBox.w = this.minWidth;

			this.contentNode.style.width = (labelBox.w + arrowWidth) + "px";
			this.contentNode.style.height = labelBox.h + "px";
			
			var borderWidth = (this.border == "right") ? 1 : 0;
			
			var contentBox = dojo.marginBox(this.contentNode);
			this.domNode.style.height = contentBox.h + "px";
			this.domNode.style.width = (contentBox.w + borderWidth) + "px";
		},
		
		enable: function() {
			this.disabled = false;
			dojo.removeClass(this.contentNode, "contentDisabled");
		},
		disable: function() {
			this.disabled = true;
			dojo.addClass(this.contentNode, "contentDisabled");
		},
		
		setHighlight: function(highlight) {
			dojo.toggleClass(this.domNode, "aimButtonHighlight" + (this.vizType || ""), highlight);
		},
		
		_onClick: function(e) {
			if (!this.disabled)
				this.onClick(e);
		},
	
		onClick: function() { },
		onMouseOver: function() { },
		onMouseDown: function() { },
		onArrowClick: function() { },
		onKeyPress: function() { }
});

dojo.declare("aim.widget.AimDropDownBase", null, {
		menuId: "",
		menu: null,
		menuDefinition: null,
		
		onClick: function() {
			this.toggleMenu();
		},
		
		onKeyPress: function(evt) {
			if (evt.keyCode == dojo.keys.ENTER)
				setTimeout(dojo.hitch(this, "toggleMenu"), 0);
		},
		
		toggleMenu: function() {
			if (!this.menu) this.getMenu();
			
			if (this.menu.isShowing()) {
				this.menu.close();
			} else {
				this.updateMenu(this.menu);
				this.menu.open(this.contentNode);
			}
		},
		
		getMenu: function() {
			if (this.menuId)
				this.menu = dijit.byId(this.menuId);
			else
				this.createMenu();
		},
		
		createMenu: function() {
			this.menu = aim.widget.createMenu(this.menuDefinition);
		},
		
		setMenuDefinition: function(def) {
			if (this.menu) {
				if (this.menu.isShowing())
					this.menu.close();
				this.menu.destroyRecursive();
				this.menu = null;
			}
			this.menuDefinition = def;
		},
		
		// Client can connect to updateMenu to update the menu just before it's shown.
		updateMenu: function(menu) {}
});

dojo.declare("aim.widget.AimDropDownButton", [aim.widget.AimButton, aim.widget.AimDropDownBase], {
	showArrow: true,

    // dynamic enabling of the drop-down arrow
    enableArrow: function(flag){
        if (flag){
            this.showArrow = true;
            this.arrowNode.style.display = "";
			if (this.showArrowBorder && (dojo.isIE != 6))	// this style isn't worth the trouble on IE6
                dojo.addClass(this.arrowNode, "splitArrow");			
        }
        else{
            this.showArrow = false;
            this.arrowNode.style.display = "none";
            if (dojo.isIE != 6)
                dojo.removeClass(this.arrowNode, "splitArrow");			
        }
    }

});

