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

dojo.provide("aim.widget.Dialogs");

dojo.require("dijit._Templated");
dojo.require("aim.widget.AimButton");
dojo.require("aim.widget.AimModalPane");
dojo.require("aim.widget.AimToolbar");
dojo.require("dojo.i18n");

dojo.requireLocalization("aim", "strings");

aim.widget.Dialogs = {
	// args:
	//   msg: message to display
	//   labels: array of button labels
	//   callback (optional): function that will be passed the index of the button the user clicked
	//   extraArgs:
	//      width: defaults to 300
	show: function(msg, labels, callback, extraArgs) {
		if (!this.dialog) {
			this.dialog = new aim.widget.GenericDialog();
			dojo.body().appendChild(this.dialog.domNode);
		}
		
		this.dialog.show(msg, labels, callback, extraArgs);
	},
	
	ok: function(msg, callback) {
		this.show(msg, [this.strings.OK], callback);
	},
	
	okCancel: function(msg, callback) {
		this.show(msg, [this.strings.Cancel, this.strings.OK], function(i) {
			if (callback)
				callback(i == 1);
		});
	},
	
	yesNo: function(msg, callback) {
		this.show(msg, [this.strings.No, this.strings.Yes], function(i) {
			if (callback)
				callback(i == 1);
		});
	}
};

dojo.addOnLoad(function(){
	aim.widget.Dialogs.strings = dojo.i18n.getLocalization("aim", "strings");	
});

dojo.declare("aim.widget.GenericDialog", [aim.widget.AimModalPane, dijit._Templated], {
	widgetsInTemplate: true,
	destroyOnClose: false,
	
	templateString:
		'<div class="AimModalPane" style="padding: 8px;">' +
		'	<div dojoAttachPoint="textNode" style="padding: 4px 0px 8px 0px;"></div>' +
		'	<div dojoAttachPoint="toolbar" dojoType="aim.widget.AimToolbar" vizType="Bare"></div>' +
		'</div>',
		
	show: function(msg, labels, callback, extraArgs) {
		extraArgs = extraArgs || {};
		
	    // Temporarily remove PopupManager's global onclick handler.  If this dialog
	    // was opened by some popup dialog, then we don't want the opener to get closed when
	    // the user clicks OK or Cancel.
	    aim.widget.popup.ignoreClicks(true);
		
		// replace special ascii chars into html equivalents
		msg = msg.replace(/\\x22/g, "&quot;").replace(/\\n/g, "<br>").replace(/\\x2f/g, "/");
		this.textNode.innerHTML = msg;
		this.callback = callback;

		this.domNode.style.width = (extraArgs.width || 300) + "px";
		this.inherited(arguments);
		this.setupButtons(labels);
		
		this.checkSize();
	},
	
	setupButtons: function(labels) {
		this.ensureButtonsExist(labels.length);
		
		for (var i = 0; i < labels.length; i++) {
			this.buttons[i].show();
			this.buttons[i].setLabel(labels[i]);
		}
		for (var i = labels.length; i < this.buttons.length; i++)
			this.buttons[i].hide();
		this.toolbar.layout();
	},
	
	ensureButtonsExist: function(count) {
		if (!this.buttons) this.buttons = [];
		
		for (var i = this.buttons.length; i < count; i++) {
			var btn = new aim.widget.AimButton({toolbarPosition: "right", vizType: "Blue"});
			btn.onClick = dojo.hitch(this, "onButtonClick", i);
			this.toolbar.addToolbarItem(btn);
			this.buttons.push(btn);
			btn.startup();
		}
	},
	
	onButtonClick: function(i) {
		this.hide();
		
		// Restore the global onclick handler.
		aim.widget.popup.ignoreClicks(false);
		
		if (this.callback)
			this.callback(i);
	}
});

dojo.declare("aim.widget.Dialogs.IFrameDialog", [aim.widget.AimModalPane, dijit._Templated], {
	widgetsInTemplate: true,
	destroyOnClose: true,
	
	templateString:
		'<div class="AimModalPane AimModalIFrame" dojoAttachPoint="textNode">' +
		'</div>',

	show: function(/*String*/iframeHtml) {
		// Temporarily remove PopupManager's global onclick handler.  If this dialog
		// was opened by some popup dialog, then we don't want the opener to get closed when
		// the user clicks OK or Cancel.
		aim.widget.popup.ignoreClicks(true);

		this.textNode.innerHTML = iframeHtml;

		this.inherited(arguments);
		this.checkSize();
	},

	hide: function() {
		aim.widget.popup.ignoreClicks(false);
		this.inherited(arguments);				
	}
});

