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

dojo.provide("aim.widget.AimMenu");

dojo.require("aim._AimTemplatedWidget");
dojo.require("dijit._Container");
dojo.require("aim.html");
dojo.require("aim.string");
dojo.require("aim.widget.DefaultTextbox");
dojo.require("aim.widget.popup");

dojo.declare("aim.widget.AimMenu", [aim._AimTemplatedWidget, dijit._Container], {
		templateString: '<div class="aimMenu" style="display: none;">' +
						'	<table border=0 cellspacing=0 cellpadding=0>' +
						'		<tbody dojoAttachPoint="containerNode"></tbody>' +
						'	</table>' +
						'</div>',

		startup: function() {
			dojo.forEach(this.getChildren(), function(child){ child.startup(); });
		
			dojo.subscribe("Menu/Close", this, function() {
				if (this.domNode.style.display != "none") 
					this.close();
			});
			
			this._started = true;		
		},
		
		open: function(around, parent, orient) {
			var x, y;
			if (typeof around == "number") {
				x = around;
				y = parent;
				parent = orient;
				orient = arguments[3];
				around = null;
			}
			
			aim.widget.popup({
				popup: this,
				x: x,
				y: y,
				around: around,
				orient: orient,
				parent: parent
			});
		},
		onOpen: function() {
			// Clip the menu to the window height, if necessary.
			this.domNode.style.height = "";
			var menuSize = dojo.marginBox(this.domNode);
			var windowHeight = dijit.getViewport().h;
			if (menuSize.h > windowHeight)
				dojo.marginBox(this.domNode, {h: windowHeight, w: menuSize.w + aim.html.getScrollbar().w});
		},
		
		close: function() {
			aim.widget.popup.close(this);
		},
		onClose: function () {},
		
		bindDomNode: function(node, parentWidget) {
			this.boundNode = node;
			this.boundParentWidget = parentWidget;
			this.connect(node, "onclick", "openMyself");
		},
		openMyself: function(e) {
			if (this.isShowing())
				return this.close();
		
			this.open(this.boundNode, this.boundParentWidget);
		},
		
		getBorderBoxWidth: function() {
			if (this.isShowing())
				return dojo.marginBox(this.domNode).w;
			
			// Browsers return 0 for offsetWidth if the menu is display:none,
			// so we have to briefly show the menu to calculate its width.
			this.domNode.style.position = "absolute";
			this.domNode.style.left = "-9999px";
			this.domNode.style.top = "-9999px";
			this.domNode.style.display = "";
			
			var ret = dojo.marginBox(this.domNode).w;
			
			this.domNode.style.position = "";
			this.domNode.style.left = "";
			this.domNode.style.top = "";
			this.domNode.style.display = "none";
			
			return ret;
		},
		
		processKey: function(evt){
			var item = dojo.filter(this.getChildren(), function(w) {
				return w.shortCutKey && (w.shortCutKey.toLowerCase() == evt.keyChar.toLowerCase());
			})[0];
			
			if (item) {
				item._onClick();	
				dojo.stopEvent(evt);
			}
		}
	}
);


dojo.declare("aim.widget.AimMenuItem", [aim._AimTemplatedWidget, dijit._Contained], {
		templateString:
			'<tr class="aimMenuItem" dojoAttachEvent="onclick: _onClick">' +
			'	<td tabIndex="-1" dojoAttachPoint="checkNode"></td>' +
			'	<td tabIndex="-1" class="label" dojoAttachPoint="labelNode"></td>' +
			'</tr>',
	
		checkOnClass: "ckonCol",
		checkOffClass: "ckoffCol",
		width: 0,
		caption: "",
		title: "",
		shortCutKey: null,
		disabled: false,
				
		startup: function() {
			dojo.setSelectable(this.domNode, false);
			this.domNode.title = this.title;
			// If a width is specified, apply it and allow the text to wrap.
			if (this.width) {
				this.labelNode.style.width = this.width + "px";
				this.domNode.style.whiteSpace = "normal";
			}
			
			this.setChecked();
			this.updateDisabled();
			
			this.labelNode.innerHTML = this.caption;
			aim.html.addHoverClass(this.domNode, "aimMenuItemHover");
		},

		_onClick: function(evt) {
			if (!this.disabled) {
				this.onClick();
				if (this.domNode)	// in case the onClick destroyed the menu
					this.getParent().close();
			}
			dojo.stopEvent(evt);
		},
		onClick: function() {},
		
		enable: function() {
			this.disabled = false;
			this.updateDisabled();
		},
		disable: function() {
			this.disabled = true;
			this.updateDisabled();
		},
		updateDisabled: function() {
			dojo.toggleClass(this.domNode, "aimMenuItemDisabled", !!this.disabled);
		},
		
		setChecked: function(isChecked) {
			if (typeof(isChecked) != "undefined")
				this.checked = isChecked;
			
			if (typeof(this.checked) != "undefined") {
				dojo.toggleClass(this.checkNode, this.checkOnClass, this.checked);
				dojo.toggleClass(this.checkNode, this.checkOffClass, !this.checked);
			}
		},

		setCaption: function(caption) {
			this.labelNode.innerHTML = caption;
		}
	}
);


dojo.declare("aim.widget.AimInputableMenuItem", aim.widget.AimMenuItem, {	
	templateString:
		 '<tr class="aimMenuItem" dojoAttachEvent="onclick: _onClick">'
		+'	<td tabIndex="-1" colspan="2" class="inputableItemLabel" dojoAttachPoint="labelNode">'
		+'		<div class="inputContainer" dojoAttachPoint="inputContainer" dojoAttachEvent="onkeypress: _onKeyPress">'
		+'			<div dojoType="aim.widget.DefaultTextbox" className="${inputClassName}" dojoAttachPoint="input" maxlength="${maxlength}" defaultValue="${defaultValue}"></div>'
		+'			<img class="aimLargeAdd" dojoAttachPoint="newButton" dojoAttachEvent="onclick: onAdd" src="${spacer}"/>'
		+'		</div>'
		+'	</td>'
		+'</tr>',
	widgetsInTemplate: true,
	
	// Properties that can be overwritten during initialization.
	okCB: null,					// Callback to handle the user's input.
	originalMenuItem: null,		// Reference to another Menu Item, usually the one that this one replaces in the menu list.
	defaultValue: "",			// Default text value for the DefaultTextBox.
	inputClassName: "newInput",	// CSS class used for the DefaultTextBox.
	maxlength: 255,
		
	startup: function() {
		if (dojo.isMoz)
		{	// Fix Firefox cursor and text selection problem in the input field of the DefaultTextBox widget by setting its position to fixed.
			// Other changes to the surrounding elements were also required to accomodate this.
			var itemWidth = dojo.marginBox(this.input.domNode).w + dojo.marginBox(this.newButton).w + 2;
			this.inputContainer.style.width = itemWidth + "px";
			this.input.textbox.style.position = "fixed";
			dojo.addClass(this.newButton, "newButtonFF");
		}
		
		dojo.connect(this.getParent(), "onClose", this, "restore");
	},
	
	setCaption: function(caption)
	{
		this.labelNode.innerHTML = caption;
	},
	
	initializeText: function(defaultText)
	{
		// If defaultText equals the DefaultTextBox's defaultValue, any onFocus event on the input element clears the input.
		// Doing a select() on the input text also triggers a focus event, so in this case we need to work around clearing the input. 
		if (defaultText && defaultText == this.input.defaultValue)
		{
			var tempValue = this.input.defaultValue;
			this.input.defaultValue = "";
			this.input.setValue(defaultText);
			this.input.textbox.select();
			// IE fix for selecting the text: Ensure that DefaultTextBox's _onFocus() runs its course before setting the defaultValue.
			setTimeout(dojo.hitch(this, function() {
				this.input.defaultValue = tempValue;
			}), 0);
		}
		else // If defaultText does not equal the DefaultTextBox's defaultValue we are fine.
		{
			this.input.setValue(defaultText ? defaultText : "");
			this.input.textbox.select();
		}
	},
	
	// Override the AimMenuItem's _onClick() that hides the menu.
	_onClick: function(evt) {},
	
	_onKeyPress: function(evt)
	{		
		if (evt.keyCode == dojo.keys.ENTER) {
			if(this.okCB) {
				var keepMenuOpen = false;
				keepMenuOpen = this.okCB({newName: this.input.getValue()});
				this.restore();
				if (!keepMenuOpen)
					this.getParent().close();
			}
		} else if (evt.keyCode == dojo.keys.ESCAPE) {	
			this.restore(true);
		}
		
		evt.stopPropagation();
	},
	
	onAdd: function(evt) {
		var value = this.input.getValue();
		if(value) {
			var keepMenuOpen = false;
			if(this.okCB)
				keepMenuOpen = this.okCB({newName: value});
			this.restore();
			if (!keepMenuOpen)
				this.getParent().close();
		}
		evt.stopPropagation();
	},
	
	restore: function(hover) {
		if (this.originalMenuItem) {
			this.originalMenuItem.show();
		}
		this.hide();
	}
});

dojo.declare("aim.widget.AimMenuSeparator", aim.widget.AimMenuItem, {
	templateString:
		'<tr class="aimMenuSeparator2">' +
		'	<td colspan=2>' +
		'		<div class="aimMenuSeparatorTop"></div>' +
		'		<div class="aimMenuSeparatorBottom"></div>' +
		'	</td>' +
		'</tr>',
		
	startup: function() {}
});

