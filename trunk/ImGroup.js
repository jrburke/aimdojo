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
dojo.provide("aim.ImGroup");

dojo.require("dojo.dnd.Moveable");
dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.LayoutContainer");
dojo.require("aim.StackContainer");
dojo.require("dojox.layout.ResizeHandle");
dojo.require("aim.html");
dojo.require("aim.Im");
dojo.require("aim.wim");
dojo.require("aim.widget.Pane");
dojo.require("aim.settings");

dojo.declare("aim.ImGroup", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "ImGroup.html"),
	widgetsInTemplate: true,
	
	imMap: {},
	anonIdPrefix: ">>@n0n<<",
	anonIdCounter: 0,
	navWidth: 106,
	isMinimized: false,
	titlebarFlash: false,
	titlebarTimer: null,
	

	startup: function(){
		//summary: standard call in Dojo widget lifecycle.
		
		// Make the window moveable and resizable.
		var moveable = new dojo.dnd.Moveable(this.windowPane.domNode, {handle: this.titlePane.domNode});
		// Moveable adds an onselectstart handler that prevents selecting any text in
		// the IM window.  Disconnect it.
		dojo.disconnect(moveable.events[2]);
		var resize = new dojox.layout.ResizeHandle({
			targetContainer: this.windowPane.domNode,
			activeResize: true,
			minSize: {w: 250, h: 250}
		});
		resize.startup();
		dojo.connect(resize, "_updateSizing", this, "onResized");
		this.windowPane.domNode.appendChild(resize.domNode);
		
		// Set the window's initial position		
		var viewport = dijit.getViewport();
		var size = dojo.marginBox(this.windowPane.domNode);
		this.windowPane.domNode.style.left = (viewport.w - size.w - 190) + "px";
		this.windowPane.domNode.style.top = (viewport.h - size.h - 40) + "px";

		// Don't need to show the controller until we have multiple conversations
		this.pageController.hide();
		this.onResized();

		if (dojo.isSafari) {
			this.minimizedNode.style.right = "24px";
		}
		dojo.subscribe("aimWimUnblock", this, "unblockBuddy");
		dojo.subscribe(this.pageContainer.id + "-selectChild", this, "onSelectChild");
		dojo.subscribe(this.pageContainer.id + "-removeChild", this, "onRemoveChild");
		dojo.subscribe("aimresize", this, "ensureOnscreen");
		dojo.subscribe("aimWimSendEmail", this, "sendMail");
		dojo.subscribe("aimWimSetPhoneMode", this, "setPhonemode");
		dojo.connect(this.windowPane, "resize", this, "onTitleResized");

		this.createActionMenu();
		this.windowTitleNode.menu = this.actionMenu;
		dojo.connect(window, "onunload", this, "unload");
		this.promptNode.innerHTML = this.strings.SignInAIMToSendIM;
		if (aim.wim.user != null)
			this.signinPageContainer.selectChild(this.onlinePane)	
		else
			this.signinPageContainer.selectChild(this.offlinePane);

		aim.wim.listeners.push(this);
	},

	unload: function(){
		for(var param in this.imMap){
			var im = this.imMap[param];
			if(im){
				im.close();
			}
		}
	},

	onSessionStart: function() {
		this.signinPageContainer.selectChild(this.onlinePane);
		this.onlinePane.resize();
	},

	onSessionEnd: function() {
		this.promptNode.innerHTML = this.strings.SignInAIMToSendIM;
		this.signinPageContainer.selectChild(this.offlinePane);
	},

	//Start aim.wim.listener methods
	onError: function(/*Object*/data){
		var tod = new Date();
		if(data.action == "im/sendIM"){
			aim.wim.lastIMStatusCode = data.statusCode;
			var status = data.statusCode;
			var buddyAimId = data.params.t;
			// map phone number to screenname
			if (aim.wim.phones[buddyAimId])
				buddyAimId = aim.wim.phones[buddyAimId];
			var displayId = aim.wim.getDisplayId(buddyAimId);
			var message = aim.string.substituteParams(this.strings.IM_Notice_MessageNotSent, displayId) + " ";

			if(status == 602){
				var im = this.imMap[buddyAimId];
				var sn = displayId;
				if (im && im.phoneMode){
					var ph = im.phoneInput.value;
					if (ph.length > 0)
						sn = ph;
				}
				message += aim.string.substituteParams(this.strings.IM_Notice_RemoteUserOffline, sn);
			}else if(status == 603){
				// if buddy is blocked by this user, or the reverse
				if (!aim.wim.isBuddyAllowed(buddyAimId))
					message += aim.string.substituteParams(this.strings.IM_Notice_RemoteUserBlocked, displayId);
				else
					message += aim.string.substituteParams(this.strings.IM_Notice_UserBlocked, displayId);
			}else if(status == 606){
				message += aim.string.substituteParams(this.strings.IM_Notice_MessageTooLarge, displayId);
			}else if(status == 430){
				message += this.strings.Notice_NearRateLimit;
			}else if(status == 401){
			}else if(status = 600){
				message += this.strings.IM_Notice_InvalidTarget;
			}else {
				message += data.statusText;		
			}

			//Only add the message if we still logged on.
			if(aim.wim.user){
				this.addIm(buddyAimId, {
					message: message, 
					senderAimId: aim.wim._systemAimId,
					autoresponse: false,
					timestamp: tod.getTime()/1000
					},
					false, true);
			}
		}else{
			//Inform the user of the error, in case the AIM panel is hidden, or the user is just too
			//focused on the IM windows. Only do this if the IM window is visible with an selected
			//conversation.
			if (this.isShowing() && !this.isMinimized && data.errorType != 9){
				var errorString = data;
				if(typeof errorString == "object"){
					errorString = "";
					for(var param in data) {
						if(param != "params"){
							errorString += param + ": " + data[param] + ", ";
						}
					}
				}

				//Only add the message if we still logged on.
				if(aim.wim.user){
					this.pageContainer.selectedChildWidget.addMessage({
						message: this.strings.Error_AimGeneric, 
						autoresponse: false, 
						senderAimId: aim.wim._systemAimId,
						timestamp: tod.getTime()/1000
					});
					this.pageContainer.selectedChildWidget.addMessage({
						message: errorString, 
						autoresponse: false, 
						senderAimId: aim.wim._systemAimId,
						timestamp: tod.getTime()/1000
					});
				}
			}
		}
	},

	onPresenceChanged: function(data){
		var buddyAimId = data.aimId;
		var displayId = aim.wim.getDisplayId(buddyAimId);
		var state = data.state;
		if(this.imMap[buddyAimId]){
			var buddy = aim.wim.buddies[buddyAimId];
			if(buddy && buddy.state && data.oldValues.state && data.oldValues.state != buddy.state){
				var tod = new Date();
				var state = buddy.state;
				var awayMsg = "";
				var message = "";
				if(state == "online"){
					message = aim.string.substituteParams(this.strings.IM_Notice_RemoteUserOnline, displayId);
				}else if(state == "offline"){
					message = aim.string.substituteParams(this.strings.IM_Notice_RemoteUserOfflineMaybe, displayId);
				}else if(state == "away"){
					message = aim.string.substituteParams(this.strings.IM_Notice_RemoteUserAway, displayId);
					awayMsg = aim.wim.replaceMsgTokens(buddy.awayMsg);
					message += awayMsg;
				}

				if(message){
					this.addIm(buddyAimId, {
						message: message, 
						awayMessage: awayMsg,
						senderAimId: aim.wim._systemAimId,
						aboutAimId: buddyAimId,
						state: state,
						autoresponse: false,
						timestamp: tod.getTime()/1000
						},
						false, true);
				}

				if (state == "offline"){
					this.imMap[buddyAimId].addOfflineLinks();
				}
			}
			
			this._setOffline(this.imMap[buddyAimId], state == "offline" || state == "away");
		}
	},
	//End aim.wim.listener methods
	
	addIm: function(/*String*/buddyAimId, /*object*/data, /*boolean*/isUserInitiated, /*boolean*/isSystemMsg, /*boolean*/useSMS){
		//summary: adds a message to an IM display. Creates the IM display if necessary.
		var anon = false;
		if(!buddyAimId){
			anon = true;
			var lastAimId = this.anonIdPrefix + (this.anonIdCounter-1);
			if(this.imMap[lastAimId])
				buddyAimId = lastAimId;
			else
				buddyAimId = this.anonIdPrefix + (this.anonIdCounter++);
		}
		var displayId = aim.wim.getDisplayId(buddyAimId);
		var im = this.imMap[buddyAimId];
		if(!im){
			// If user has previously declined a knock-knock
			// from the buddy, don't open another one.
			if (aim.wim.declinedBuddies[data.senderAimId] && !aim.wim.isInBuddyList(data.senderAimId) && !isUserInitiated)
				return;
			//Create the IM pane.
			im = this.imMap[buddyAimId] = new aim.Im({
				isUserInitiated: isUserInitiated,
				imGroup: this,
				buddyAimId: buddyAimId,
				title: (displayId.indexOf(this.anonIdPrefix) == 0 ? "" : displayId)
			});
			
			//Add the IM to the group.
			this.pageContainer.addChild(im);
			if(isUserInitiated || this.pageContainer.getChildren().length == 1){
				this.pageContainer.selectChild(im);
			}
		}
		// now add the message
		if(data.message && data.message.length > 0){
			im.addMessage(data);
		}

		// offline, update prompt text
		if (!aim.wim.user) {
			if (anon) {
				if (useSMS)
					this.promptNode.innerHTML = this.strings.SignInAIMToSendText;
				else
					this.promptNode.innerHTML = this.strings.SignInAIMToSendIM;
			}
			else {
				if (useSMS)
					this.promptNode.innerHTML = this.strings.SignInAIMToSendTextToBuddy + 
						"<p><span class='sn'>" + buddyAimId + "</span></p>";
				else
					this.promptNode.innerHTML = this.strings.SignInAIMToSendIMToBuddy + 
						"<p><span class='sn'>" + buddyAimId + "</span></p>";
			}
			this.offlinePane.resize();
		}
				
		// If window has been closed, reopen it, and in case it's minimized, restore it
		if (!this.isShowing()) {
			this.show();
			this.onClickRestoreButton();
		}
		
		this._showHideNavPane();

		if (!isSystemMsg) {
			// for a user initiated event, select the tab
			if (isUserInitiated)
				this.pageContainer.selectChild(im);
			else {
				// If the IM tab isn't visible or the window is minimized, bump the new message count.		
				if (this.isMinimized || (im != this.pageContainer.selectedChildWidget))
					this._setNewMessage(im, true);
	
				if (data.message)
					aim.browser.setFlashingWindowTitle(aim.string.substituteParams(this.strings.IM_Title, displayId));
			}
		}
				
		// If user is initiating a new IM, restore the window if it's minimized
		if (isUserInitiated && this.isMinimized)
			this.onClickRestoreButton();

		if (isUserInitiated && !useSMS)
			im.setIMmode();

		if (useSMS || (buddyAimId[0] == '+'))
			im.setPhonemode();

		this.updateActionMenu();
	},

	closeIm: function(/*String*/buddyAimId){
		var im = this.imMap[buddyAimId];
		if(im){
			im.close(this);
			delete this.imMap[buddyAimId];
		}
	},
	
	onClickCloseButton: function(evt) {
        this.actionMenu.close();
		// Prompt for confirmation if there are multiple IMs
		var count = this.pageContainer.getChildren().length;
		if (count > 1) {
			var prompt = aim.string.substituteParams(this.strings.IM_Label_CloseConfirmation, count);
			aim.widget.Dialogs.yesNo(prompt, dojo.hitch(this, function(yes) {
				if (yes)
					this._onClickCloseButton();
			}));
		} else {
			this._onClickCloseButton();
		}
		
		// Don't let the click propagate up to onClickRestoreButton.
		evt.stopPropagation();
	},
	_onClickCloseButton: function(evt) {
		this.isClosing = true;
		while (this.pageContainer.getChildren().length > 0)
			this.pageContainer.closeChild(this.pageContainer.getChildren()[0]);
		this.isClosing = false;
	},
	
	onClickMinimizeButton: function(evt) {
		this.windowPane.hide();
		this.minimizedNode.style.display = "";
		this.isMinimized = true;
		this._updateTitle();
	},
	onClickRestoreButton: function(evt) {
		this.windowPane.show();
		this.minimizedNode.style.display = "none";
		this._showHideNavPane();
		this.onResized();
		this.ensureOnscreen();
		this.pageContainer.selectedChildWidget.scrollToEnd();
		this.isMinimized = false;
		this._setNewMessage(this.pageContainer.selectedChildWidget, false);
	},

	onClickSignIn: function(evt) {
		dojo.publish("aimSignIn");	
	},

	createActionMenu: function(){
		if (!this.actionMenu){
			this.actionMenu = new aim.widget.AimMenu();
			this.actionMenu.startup();
			dojo.addClass(this.actionMenu.domNode, "imActionMenu");

			this.ignoreMenuItem = new aim.widget.AimMenuItem({
				caption: this.strings.Menu_Ignore,
				checkOnClass: "imActionOnCol",
				checkOffClass: "imActionOffCol",
				onClick: dojo.hitch(this, "ignoreBuddy")
			});
			this.actionMenu.addChild(this.ignoreMenuItem);

			this.blockMenuItem = new aim.widget.AimMenuItem({
				caption: this.strings.Menu_Block,
				checkOnClass: "imActionOnCol",
				checkOffClass: "imActionOffCol",
				onClick: dojo.hitch(this, "blockBuddy")
			});
			this.actionMenu.addChild(this.blockMenuItem);

			this.actionMenu.addChild(new aim.widget.AimMenuSeparator());

			this.timeMenuItem = new aim.widget.AimMenuItem({
				caption: this.strings.IMMenu_ShowTimestamp,
				checkOnClass: "imActionOnCol",
				checkOffClass: "imActionOffCol",
				onClick: dojo.hitch(this, "showTimestamp")
			});
			this.actionMenu.addChild(this.timeMenuItem);

			this.actionMenu.addChild(new aim.widget.AimMenuItem({
				caption: this.strings.IMMenu_ClearWindow, 
				onClick: dojo.hitch(this, "clearWindow")
			}));
		}
	},

	onClickMenu: function(evt){
        if (aim.wim.user != null){
    		this.updateActionMenu();
            this.actionMenu.open(this.tableNode);
        }
	},

	updateActionMenu: function(){
		var buddy = this.pageContainer.selectedChildWidget.buddyAimId;
		this.ignoreMenuItem.setChecked(buddy && (buddy in aim.wim.ignoredBuddies));
		this.blockMenuItem.setChecked(buddy && (buddy in aim.wim.blockedBuddies));
		this.timeMenuItem.setChecked(aim.settings.chatTimeStamp);
	},

	unblockBuddy: function(){
		this.blockBuddy(true);
	},

	blockBuddy: function(unblock){
		if (!this.pageContainer.selectedChildWidget.isAnon()){
			var message;
			var buddy = this.pageContainer.selectedChildWidget.buddyAimId;
			if (unblock && !(buddy in aim.wim.blockedBuddies))
				return;
			var flag = (buddy in aim.wim.blockedBuddies) || unblock;
			if (!flag){
				aim.wim.blockBuddy(buddy);
				message = aim.string.substituteParams(
					"<div class='blockMsg'><div class='blockMsgText'>%{0}</div><div class='blockMsgUser'>%{1}</div><div class='blockMsgLink'><span class='aimLink' onclick='dojo.publish(\"aimWimUnblock\"); return false;'>%{2}</span></div></div>",
					this.strings.IM_Notice_Blocked, buddy, this.strings.IM_Notice_UnblockLink);
			}
			else {
				aim.wim.unblockBuddy(buddy);
				message = aim.string.substituteParams(this.strings.IM_Notice_Unblocked, buddy);
			}
			this.updateActionMenu();
	
			var tod = new Date();
			this.pageContainer.selectedChildWidget.addMessage({
				message: message, 
				autoresponse: false, 
				senderAimId: aim.wim._systemAimId,
				timestamp: tod.getTime()/1000
			});
		}
	},

	ignoreBuddy: function(){
		if (!this.pageContainer.selectedChildWidget.isAnon()){
			var buddy = this.pageContainer.selectedChildWidget.buddyAimId;
			var flag = !(buddy in aim.wim.ignoredBuddies);
			aim.wim.ignoreBuddy(buddy, flag);
			this.updateActionMenu();
	
			var tod = new Date();
			var message = aim.string.substituteParams(flag?this.strings.IM_Notice_Ignored:this.strings.IM_Notice_Unblocked, buddy)
			this.pageContainer.selectedChildWidget.addMessage({
				message: message, 
				autoresponse: false, 
				senderAimId: aim.wim._systemAimId,
				timestamp: tod.getTime()/1000
			});
		}
	},

	showTimestamp: function(){
		var val = !aim.settings.chatTimeStamp;
		aim.settings.chatTimeStamp = val;
		this.updateActionMenu();
		for(var param in this.imMap){
			var im = this.imMap[param];
			if(im){
				im._showSavedConversation();
			}
		}
	},

	clearWindow: function(){
		this.pageContainer.selectedChildWidget.clearWindow();
	},

	typingChanged: function(/*String*/buddyAimId, /*String*/typingStatus){
		//summary: the typing status of the buddy has changed.
		if(this.imMap[buddyAimId]){
			this.imMap[buddyAimId].typingChanged(typingStatus);
		}
	},

	updateImGroup: function(/*ImWidget*/imWidget, /*String*/oldAimId, /*String*/newAimId){
		//summary: updates the tracking map in this widget with the new name
		//associated with a child Im widget.
		if(this._updatedExistingIm(newAimId)){
			//Close the new IM bound to the anon id.
			//do it on a timeout so don't kill the anon IM
			//while it is still finishing up execution of code
			//that included this call.
			var _self = this;
			setTimeout(function(){
				_self.closeIm(oldAimId);
			}, 10);
		}else{
			if(this.imMap[oldAimId]){
				delete this.imMap[oldAimId];
				this.imMap[newAimId] = imWidget;
			}				
		}
	},

	_updatedExistingIm: function(/*String*/newAimId){
		//summary: if a new IM is really for a user that already has an open
		//IM, use the existing open IM.
		var imWidget = this.imMap[newAimId];
		if(imWidget){
			//Do it in a timeout to allow the old anon IM time to close down before
			//switching to the existing IM.
			setTimeout(function(){
				imWidget._showSavedConversation();
				imWidget._informNewMessage("", true);
			}, 200);
		}
		return !!imWidget;
	},
	
	_setOffline: function(im, isOffline) {
		var pageButton = this.pageController.pane2button[im];
		pageButton.setOffline(isOffline);
	},
	
	_setNewMessage: function(im, newMessage) {
		var pageButton = this.pageController.pane2button[im];
		pageButton.setNewMessage(newMessage);
		this._updateTitle();
	},
		
	_updateTabLabel: function(im) {
		var pageButton = this.pageController.pane2button[im];
		pageButton.setLabel(im.title);
		this._updateTitle();
	},
	
	_updateTitle: function() {
		// Set the window title, e.g. "IM - ChattingChuck"
		var widget = this.pageContainer.selectedChildWidget;
		var buddyId = widget.isAnon() ? (widget.phoneMode ? this.strings.IM_Title_NewText : this.strings.IM_Title_NewIM) : aim.wim.getDisplayId(widget.buddyAimId);
		var title = widget.phoneMode ? this.strings.IM_Title_Text : this.strings.IM_Title;
		this.containerNode.innerHTML = aim.string.substituteParams(title, buddyId);
		this.onTitleResized();

		// Set the minimized title, e.g. "5 IM's (3 New)"
		var totalCount = this.pageController.getChildren().length;
		var newCount = dojo.filter(this.pageController.getChildren(), function(btn) {
			return btn.hasNewMessage;
		}).length;
		var newCounter = newCount ? aim.string.substituteParams(this.strings.IM_Title_NewCount, newCount) : "";
		newCounter = "<span class='newCounter'>" + newCounter + "</span>";
		var minTitle = (totalCount == 1) ? this.strings.IM_Title_OneIM : aim.string.substituteParams(this.strings.IM_Title_MultipleIMs, totalCount);
		this.minimizedTitleNode.innerHTML = minTitle + newCounter;
		
		var newMessages = (newCount > 0);
		if (newMessages && this.isMinimized) {
			this.titlebarFlash = false;
			this.titlebarTimer = setInterval(dojo.hitch(this, "titlebarInterval"), 800);
		}
		else {
			if (this.titlebarTimer) {
				clearInterval(this.titlebarTimer);
				this.titlebarTimer = null;
			}
		}
		dojo.toggleClass(this.minimizedNode, "minimizedNewMessages", newMessages);
	},
	
	titlebarInterval: function() {
		if (this.titlebarTimer == null) return;
		dojo.toggleClass(this.minimizedNode, "minimizedNewMessages", this.titlebarFlash);
		this.titlebarFlash = !this.titlebarFlash;
	},
	
	onSelectChild: function(page) {
		// When user clicks a tab, clear the new message indicator for that tab.
		this._setNewMessage(page, false);
	},
	
	onRemoveChild: function(page) {
		delete this.imMap[page.buddyAimId];
		this._updateTitle();
		
		if (this.pageContainer.getChildren().length == 0)
			this.hide();
		else
			this._showHideNavPane();		
	},
	
	_showHideNavPane: function() {
		// We show the nav pane on the left only if there are multiple conversations.
		// This function is called whenever a conversation is added or removed, or when
		// the window is restored, to show or hide the nav pane.
		if (!this.windowPane.isShowing()) return;
		
		var isShowing = this.pageController.isShowing();
		var shouldShow = this.pageContainer.getChildren().length > 1;
		var coords = dojo.coords(this.windowPane.domNode);
		
		if (isShowing && !shouldShow) {
			// Hide the nav pane
			this.pageController.hide();
			this.windowPane.resize({w: coords.w - this.navWidth});
			this.windowPane.domNode.style.left = (coords.x + this.navWidth) + "px";
		} else if (shouldShow && !isShowing) {
			// Show the nav pane
			//this.pageController.domNode.style.width = "";	// Fix left-right LayoutContainer wonkiness
			this.pageController.show();
			this.windowPane.resize({w: coords.w + this.navWidth});
			this.windowPane.domNode.style.left = (coords.x - this.navWidth) + "px";
		}
	},

	onTitleResized: function(){
		// this is all to work-around grotesque IE6 CSS bugs
		if (this.isClosing) return;
		// clear style or getBorderBox won't work right
		this.windowTitleNode.style.width = "";
		this.titleCell.style.width = "";
		var size = dojo.marginBox(this.windowPane.domNode);
		var tsize = dojo.marginBox(this.containerNode);
		var maxwid = (size.w - 70);
		if (dojo.isMoz)
			maxwid += 14;
		if (maxwid < 16) maxwid = 16;
		this.windowTitleNode.style.width = maxwid + "px";
		if (dojo.isIE)
			this.titleCell.style.width = Math.min(tsize.w, maxwid-16) +"px";
	},
	
	onResized: function() {
		this.pageController.domNode.style.width = "";
		this.windowPane.resize();
	},
	
	ensureOnscreen: function() {
		// When the browser window is resized, reposition the IM window to be visible, if necessary
		if (!this.windowPane.isShowing()) return;
		var viewport = dijit.getViewport();
		var coords = dojo.coords(this.windowPane.domNode);
		
		if (coords.x < 0)
			this.windowPane.domNode.style.left = "0px";
		else if (coords.x + coords.w > viewport.w)
			this.windowPane.domNode.style.left = (viewport.w - coords.w) + "px";
		
		if (coords.y < 0)
			this.windowPane.domNode.style.top = "0px";
		else if (coords.y + coords.h > viewport.h)
			this.windowPane.domNode.style.top = (viewport.h - coords.h) + "px";
	},

	sendMail: function(aimId){
		var im = this.imMap[aimId];
		if (!im)
			im = this.imMap[this.anonIdPrefix + (this.anonIdCounter-1)];
		if (im)
			im.sendMail();;
	},

	setPhonemode: function(aimId){
		this.imMap[aimId].setPhonemode();;
	}
});

dojo.declare("aim.ImPageButton", [aim._AimTemplatedWidget], {
	templateString:
		'<span class="item" dojoAttachEvent="onclick: onClick, onmouseover: onMouseOver, onmouseout: onMouseOut">' +
		'	<img src="${spacer}" class="newMessageIcon">' +
		'	<span dojoAttachPoint="titleNode, focusNode" class="selectButton">${label}</span>' +
		'	<span dojoAttachEvent="onclick: onClickCloseButton" dojoAttachPoint="closeButton" class="aimSmallCoolCloseButton" style="display: none;"></span>' +
		'	<span style="clear: both;"></span>' +
		'</span>',

	hasNewMessage: false,
	
	setChecked: function(checked) {
		dojo.toggleClass(this.domNode, "current", checked);
	},
	
	setNewMessage: function(hasNewMessage) {
		this.hasNewMessage = hasNewMessage;
		dojo.toggleClass(this.domNode, "itemWithNewMessage", hasNewMessage);
	},
	
	setOffline: function(isOffline) {
		dojo.toggleClass(this.domNode, "itemOffline", isOffline);
	},
	
	setLabel: function(label) {
		this.titleNode.innerHTML = label;
	},
	
	onMouseOver: function(evt) {
		this.closeButton.style.display = "";
	},
	onMouseOut: function(evt) {
		this.closeButton.style.display = "none";
	},
	
	// StackContainer connects to these handlers
	onClick: function(evt) {},
	onClickCloseButton: function(evt) {
	}
});
