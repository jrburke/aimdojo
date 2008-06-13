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

// DefaultTextbox is an input field with an initial greyed out value, which
// blanks out when the field is focused.  Example:
//
// <div dojoType="aim:DefaultTextBox" defaultValue="Enter value"></div>

dojo.provide("aim.widget.DefaultTextbox");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("aim.html");

dojo.declare("aim.widget.DefaultTextbox", [dijit._Widget, dijit._Templated], {
	templateString: "<input maxlength='${maxlength}' id='${id}' class='aimInput ${className}' size='${size}' tabindex='${tabindex}' style='padding: 2px 2px 2px 6px; font: normal 11px Verdana; width: ${fieldWidth}' dojoAttachPoint='textbox' dojoAttachEvent='onblur: _onBlur, onfocus: _onFocus, onkeyup: _onKeyUp'>",
	value: "",
	defaultValue: "",
	doValueSelect: false,
	className: "",
	clearableInputClassName: "",
	size: 50,
	fieldWidth: "",
	maxlength: 255,
	tabindex: 500,
	spacer: dojo.moduleUrl("aim", "spacer.gif"),

	startup: function() {
		this.setValue(this.value);
	},
	
	getValue: function() {
		return (this.textbox.value == this.defaultValue) ? "" : dojo.trim(this.textbox.value);
	},
	
	setValue: function(val, useValueOnly) {
		val = val || "";
		this.textbox.value = (dojo.trim(val) == "" && !useValueOnly) ? this.defaultValue : val;
		if (this.doValueSelect && this.value == this.textbox.value) {
			setTimeout(dojo.hitch(this, function() { aim.html.selectInputText(this.textbox) }), 1);
		}
		this._updateClass();
	},
	
	_onFocus: function(evt) {
		if (this.textbox.value == this.defaultValue && !this.doValueSelect) {
			this.textbox.value = "";
			this.textbox.focus();
		}
		this._updateClass();
		this.onFocus();
	},
	onFocus: function() {},
	_onBlur: function(evt) {
		if (dojo.trim(this.textbox.value) == "")
			this.textbox.value = this.defaultValue;
		this._updateClass();
		this.onBlur();
	},
	onBlur: function() {},
	
	_onKeyUp: function(evt) {
		aim.lang.setTimeout(this, "onChange", 0);
	},
	onChange: function() {},
	
	_updateClass: function() {
		dojo.toggleClass(this.textbox, "aimInputDefault", (this.textbox.value == this.defaultValue && !this.doValueSelect));
	}
});

dojo.declare("aim.widget.ClearableTextbox", aim.widget.DefaultTextbox, {
	templateString:
		"<div class='${className}'>" +
		"	<input maxlength='${maxlength}' class='aimInput ${clearableInputClassName}' tabindex='${tabindex}' dojoAttachPoint='textbox' dojoAttachEvent='onblur: _onBlur, onfocus: _onFocus, onkeyup: _onKeyUp'>" +
		"	<img dojoAttachPoint='clearButton' dojoAttachEvent='onclick: clear' src='${spacer}' class='aimHotClearButton hidden'></div>" +
		"</div>",
		
	_onKeyUp: function(evt) {
		aim.widget.ClearableTextbox.superclass._onKeyUp.apply(this, arguments);
		dojo[(!!this.getValue() ? "removeClass" : "addClass")](this.clearButton, "hidden");
	},

	clear: function() {
		this.setValue("");
		this._onKeyUp();
	}
});
