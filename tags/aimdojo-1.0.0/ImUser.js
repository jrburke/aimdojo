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
dojo.provide("aim.ImUser");

dojo.require("aim._AimTemplatedWidget");
dojo.require("dijit._Container");
dojo.require("aim.wim");
dojo.require("aim.presence");
dojo.require("aim.string");
dojo.require("aim.widget.AimMenu");
dojo.require("aim.settings");

dojo.declare("aim.ImUser", [aim._AimTemplatedWidget, dijit._Contained], {
	
	//Override this option if you want the AIM Expressions
	//window to open with different window options (the options
	//that are passed to a window.open call)
	expressionsWindowOptions: null,

	templateString:
		'<div class="imUser">' +
		'	<img src="${spacer}" title="${strings.Menu_ChangeExpressions}" class="icon" dojoAttachPoint="iconNode" dojoAttachEvent="onclick: onIconClick">' +
		'	<span dojoAttachPoint="nameDisplay" dojoAttachEvent="onclick: onNameClick" class="name"></span>' +
		'	<span dojoAttachPoint="presenceDisplay" class="aimLink presence">&nbsp;</span>' +
		'	<input type="text" dojoAttachEvent="onblur: hideCustomMessageInput, onkeypress: onKeyCustomMessage" dojoAttachPoint="customMessageInput" class="aimInput customMessage hidden">' +
		'</div>',

	signOnEnabled: true,
	userInitialized: false,
	editMode: false,
	presenceStates: [
		"online",
		"invisible",
		"notFound",
		"idle",
		"away",
		"mobile",
		"offline"
	],

	//Start aim.wim.listener methods
	onUserLoad: function(){
		this.updateUserPresence(aim.wim.user);
		if (!this.userInitialized) {
			this.iconNode.src = aim.presence.getBuddyIconUrl({screenName: aim.wim.user.aimId});
			this.userInitialized = true;
		}
	},
	
	onSessionEnd: function(){
		this.setUserOffline();
	},

	onPresenceChanged: function(/*Object*/data){
		if(data.aimId == aim.wim.user.aimId){
			this.updateUserPresence(aim.wim.user, data.state);
		}
	},
	//End aim.wim.listener methods
	
	startup: function(){
		//summary: standard widget lifecycle method.
		this.setUserOffline();
		
		//Set up the menu choice to iterate over for checkmark usage
		this.checkMarkChoices = ["online", "invisible", "custom", "customStatus"];
		var cannedMessages = aim.wim.getCannedAwayMessages();
		if(cannedMessages){
			for(var i = 0; i < cannedMessages.length; i++){
				this.checkMarkChoices.push(this.makeHtmlId(cannedMessages[i]));
			}
		}

		this.createPresenceMenu();
		aim.wim.listeners.push(this);
	},

	onResized: function() {
		if((dojo.isIE == 6) && this.getParent()) {
			var boxWidth = dojo.marginBox(this.getParent().domNode).w - 65;	
			if(boxWidth > 0){
				this.nameDisplay.style.width = (boxWidth+12) + "px";
				this.presenceDisplay.style.width = boxWidth + "px";
				var pt = dojo.query(".presenceText",this.presenceDisplay)[0];
				if(pt && (boxWidth-18 > 0))
					pt.style.width = (boxWidth-18) + "px";
			}
		}
	},
	
	layout: function() {
		var parent = this.getParent();
		if (parent && parent.onResized)
			parent.onResized();
	},
	
	updateUserPresence: function(/*Object*/user, /*String*/oldState){
		//summary: Updates the user presence. user object contains the new state.
		this.nameDisplay.innerHTML = user.displayId;
		this.nameDisplay.title = user.displayId;
		this.nameDisplay.style.cursor = "text";
		this.signOnEnabled = false;
		
		var awayMsg = "";
		if(user.state == "away"){
			if(user.awayMsg){
				//The host adds a div tag around the away message?
				awayMsg = user.awayMsg.replace(/^\<div\>/, "").replace(/\<\/div\>$/, "");
			}
		}
		else if (user.state == "online"){
			if(user.statusMsg){
				awayMsg = user.statusMsg.replace(/^\<div\>/, "").replace(/\<\/div\>$/, "");
			}
		}
		awayMsg = awayMsg.replace(/&#160;/g, " ");

		for(var i = 0; i < this.presenceStates.length; i++){
			dojo.removeClass(this.domNode, "imUser-state-" + this.presenceStates[i]);
		}
		dojo.addClass(this.domNode, "imUser-state-" + user.state);
		var stateLabel = {
			online: user.statusMsg?"":this.strings.BuddyStatus_Label_Available,
			invisible: this.strings.BuddyStatus_Label_Invisible,
			idle: this.strings.BuddyStatus_Label_Idle,
			away: "",
			mobile: this.strings.BuddyStatus_Label_Mobile,
			offline: this.strings.BuddyStatus_Label_Offline}[user.state];

		var displayMsg = (awayMsg ? aim.string.escapeXml(awayMsg) : "");
		this.presenceDisplay.innerHTML = '<span class="presenceText" title="'
			+ this.strings.IM_Notice_PresenceTitle
			+ '" >'
			+ stateLabel
			+ displayMsg
			+ '</span> <img class="arrow" src="' + this.spacer + '" />';


		//Update checkbox in menu.
		//First, turn off the old value.
		for(var i = 0; i < this.checkMarkChoices.length; i++){
			var item = dijit.byId("aimWimMenuItem-" + this.checkMarkChoices[i]);
			if(item){
				item.setChecked(false);
			}
		}
		//Mark the new presence.
		var item = null;
		if(user.state == "online"){
			if(awayMsg.length > 0){
				item = dijit.byId("aimWimMenuItem-customStatus");
			}else{
				item = dijit.byId("aimWimMenuItem-online");
			}
		}else if(user.state == "invisible"){
			item = dijit.byId("aimWimMenuItem-" + user.state);
		}else if(user.state == "away"){
			if(aim.settings.chatAwayMessage && awayMsg == aim.settings.chatAwayMessage){
				item = dijit.byId("aimWimMenuItem-custom");
			}else{
				var cannedMessages = aim.wim.getCannedAwayMessages();
				if(cannedMessages){
					for(var i = 0; i < cannedMessages.length; i++) {
						if(cannedMessages[i] && awayMsg == cannedMessages[i]) {
							item = dijit.byId("aimWimMenuItem-" + this.makeHtmlId(cannedMessages[i]));
							break;
						}
					}
				}
			}
		}

		if(item){
			item.setChecked(true);
		}

		this.layout();
	},
	
	setUserOffline: function(){
		this.nameDisplay.innerHTML = this.strings.SignIn;
		this.nameDisplay.title = this.strings.SignIn;
		this.nameDisplay.style.cursor = "pointer";
		this.presenceDisplay.innerHTML = "&nbsp;";
		this.destroyPresenceMenu();
		this.signOnEnabled = true;
		this.userInitialized = false;
	},

	onNameClick: function(evt){
		if(this.signOnEnabled){
			aim.wim.start();
		}
	},
	
	onIconClick: function(evt) {
		//summary: handles click events on user's buddy icon and launches
		//AIM expressions.
		var url = aim.wim.getExpressionsUrl();
		if(this.expressionsWindowOptions){
			window.open(url, "aimExpressions", this.expressionsWindowOptions).focus();
		}else{
			window.open(url, "aimExpressions").focus();
		}
	},

	onKeyCustomMessage: function(/*Event*/evt){
		//summary: handles onkey events for custom message input.
		if(evt.keyCode == 13){
			var message = dojo.trim(this.customMessageInput.value);
			if (this.editMode){
				aim.wim.setState("online", message);
				aim.settings.chatStatusMessage = message;
			}
			else{
				aim.wim.setState("away", message);
				aim.settings.chatAwayMessage = message;
			}
			//Rebuild the menu to account for previous away messages.
			this.customMessageInput.blur();
			this.createPresenceMenu();
		}else if(evt.keyCode == dojo.keys.ESCAPE) {
			this.hideCustomMessageInput();
		}
	},

	showCustomMessageInput: function(){
		dojo.addClass(this.presenceDisplay, "hidden");
		dojo.removeClass(this.customMessageInput, "hidden");
		this.customMessageInput.focus();
	},

	hideCustomMessageInput: function(){
		this.customMessageInput.value = "";
		dojo.addClass(this.customMessageInput, "hidden");
		dojo.removeClass(this.presenceDisplay, "hidden");
	},

	createPresenceMenuItem: function(widgetId, caption, onclickFunction){
		var menuItem = new aim.widget.AimMenuItem({
			id: widgetId,
			caption: aim.string.escapeXml(caption),
			iconClass: "",
			checkOnClass: "imUserOnCol",
			checkOffClass: "imUserOffCol",
			onClick: onclickFunction
		});

		this.presenceMenu.addChild(menuItem);
		return menuItem;
	},

	makeHtmlId: function(/*String*/value){
		//summary: returns and HTML and CSS safe string value.
		//'replace(/\W+/, "")' none ascii character
		return value.toLowerCase().replace(/\s+/, "");
	},

	createPresenceMenu: function(){
		//summary: creates the pressence menu and menu items.

		//This method could be called a few times as new away messages are set.
		//Be sure to clean up old menu before creating the new one.
		this.destroyPresenceMenu();

		var _self = this;
		this.presenceMenu = new aim.widget.AimMenu();
		this.presenceMenu.startup();
		
		//Add a custom class so we can style the menu accordingly.
		dojo.addClass(this.presenceMenu.domNode, "imUserPresenceMenu");

		this.createPresenceMenuItem("aimWimMenuItem-online", this.strings.BuddyStatus_Label_Available, function(){
			aim.wim.setState("online", "");
		});

		// status message
		if (aim.settings.chatStatusMessage && (aim.settings.chatStatusMessage.length > 0)) {
			this.createPresenceMenuItem("aimWimMenuItem-customStatus", aim.string.summary(aim.settings.chatStatusMessage, 15), function(){
				aim.wim.setState("online", aim.settings.chatStatusMessage);
			});
		}
		this.createPresenceMenuItem("aimWimMenuItem-customStatusAction", this.strings.BuddyStatus_Label_CustomStatus, function(){_self.editMode=true; _self.showCustomMessageInput();});

		this.presenceMenu.addChild(new aim.widget.AimMenuSeparator());

		//List the canned away messages.		
		var cannedMessages = aim.wim.getCannedAwayMessages();
		if(cannedMessages){
			for(var i = 0; i < cannedMessages.length; i++) {
				if(cannedMessages[i]) {
					this.createPresenceMenuItem("aimWimMenuItem-" + this.makeHtmlId(cannedMessages[i]), cannedMessages[i], function(){
						aim.wim.setState("away", this.caption);
					});
				}
			}
		}

		//List the user's last custom away message.
		if (aim.settings.chatAwayMessage.length > 0) {
			this.createPresenceMenuItem("aimWimMenuItem-custom", aim.string.summary(aim.settings.chatAwayMessage, 15), function(){
				aim.wim.setState("away", aim.settings.chatAwayMessage);
			});
		}

		this.createPresenceMenuItem("aimWimMenuItem-customAction", this.strings.BuddyStatus_Label_CustomMessage, function(){_self.editMode=false; _self.showCustomMessageInput();});

		this.presenceMenu.addChild(new aim.widget.AimMenuSeparator());
		this.createPresenceMenuItem("aimWimMenuItem-invisible", this.strings.BuddyStatus_Label_Invisible, function(){aim.wim.setState("invisible");});
		this.presenceMenu.addChild(new aim.widget.AimMenuSeparator());


		this.createPresenceMenuItem("aimWimMenuItem-expressions", this.strings.Menu_ChangeExpressions, function(){_self.onIconClick();});
		this.presenceMenu.addChild(new aim.widget.AimMenuSeparator());

		this.createPresenceMenuItem("aimWimMenuItem-signOut", this.strings.Menu_SignOutAIM, function(){
			aim.wim.end();
		});

		this.createPresenceMenuItem("aimWimMenuItem-signOutClearAuth", this.strings.Menu_SignOutAIMClearAuth, function(){
			var wim = aim.wim;
			var val = wim.clearAuthOnSignOut;
			wim.clearAuthOnSignOut = true;
			aim.wim.end();
			wim.clearAuthOnSignOut = val;
		});

		dojo.connect(this.presenceDisplay, "onclick", this, "showPresenceMenu");
	},

	showPresenceMenu: function(evt) {
		if (this.presenceMenu == null){
			this.createPresenceMenu();
			this.updateUserPresence(aim.wim.user);
		}
		this.presenceMenu.open(this.presenceDisplay, null, {BR: "TR"});
	},
	
	destroyPresenceMenu: function(){
		if(this.presenceMenu){
			this.presenceMenu.destroyRecursive();
			this.presenceMenu = null;
		}
	}
});