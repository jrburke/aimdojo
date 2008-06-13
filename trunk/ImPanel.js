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
dojo.provide("aim.ImPanel");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.LayoutContainer");
dojo.require("aim.StackContainer");
dojo.require("aim.browser");
dojo.require("aim.AddBuddyCard");
dojo.require("aim.BuddyList");
dojo.require("aim.ImGroup");
dojo.require("aim.ImUser");
dojo.require("aim.wim");
dojo.require("aim.widget.Pane");
dojo.require("aim.widget.AimButton");
dojo.require("aim.settings");
dojo.require("aim.widget.Dialogs");


dojo.declare("aim.ImPanel", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "ImPanel.html"),
	widgetsInTemplate: true,
	
	//This flag tells the widget to check with OpenAuth once the widget
	//is created to see if a token can be retrieved from OpenAuth
	//without the user signing in via a new window. This avoids an extra
	//dialog prompt during the sign-in process.
	enableTokenOnStartup: true,
	
	//Properties that affect where and how the buddy hover card is positioned.
	//Passed down to the BuddyList widget.
	hoverCardOrient: "'TL': 'TR'",
	hoverCardPointerSide: "right",
	hoverCardPointer: "visible",
	hoverCardPadding: aim.widget.pointerWidth + ", -27",

	startup: function() {
		if ((dojo.isIE == 6) && aim.browser.win98) {
			// For WIN98 IE 6.0 - show unsupported browser message
			this.unsupportedBrowserMessage.style.display = "";
			this.signInDiv.style.display = "none";
		}
		else
		{
			aim.wim.listeners.push(this);
			dojo.subscribe("aimWimBuddyClicked", this, "openIm");
			
			if (aim.settings.chatAutoSignOn == "True")
				this.signOn();
				
			dojo.subscribe("aimSignIn", this, "onClickSignOn");	

			// Checkbox doesn't get checked on IE unless it's in a timeout for some reason!
			aim.lang.setTimeout(this, "updateAutoSignOnCheckbox", 0);
			
			dojo.subscribe("SettingsChanged/Chat", this, "updateAutoSignOnCheckbox");	
		}
		
		this.selectPane("offlinePane");
		
		if(this.enableTokenOnStartup){
			//Do the work in a dojo.addOnLoad, to allow other onload listeners
			//to set up aim.wim before we do token checks.
			dojo.addOnLoad(this, "_checkTokenOnStartup");
		}
	},
	
	resize: function() {
		//Handle resizing the buddy list area. Avoiding using layout widgets inside the
		//IM/buddy list templates.
		this.inherited("resize", arguments);
		var coords = dojo.marginBox(this.buddyListWidget.domNode);
		var style = dojo.getComputedStyle(this.buddyListWidget.domNode);
		var paneCoords = dojo.marginBox(this.domNode);
		var paneStyle = dojo.getComputedStyle(this.domNode);
		
		var newHeight = paneCoords.h
			- coords.t
			- (parseInt(paneStyle.borderTopWidth, 10) || 0)
			- (parseInt(paneStyle.borderBottomWidth, 10) || 0)
			- (parseInt(style.borderTopWidth, 10) || 0)
			- (parseInt(style.borderBottomWidth, 10) || 0);

		//Weird, off by one error, but only in FF 2. FF3 is fine.
		//Don't like this, since it may be theme dependent, but
		//Hopefully FF 2 will be going away soon.
		if(dojo.isFF && dojo.isFF < 3){
			newHeight -= 1;
		}

		if(newHeight < 0){
			newHeight = 0;
		}
		
		this.buddyListWidget.domNode.style.height = newHeight + "px";
	},

	onShow: function() {
	},
	
	//Start aim.wim.listener methods
	onError: function(data) {
		var friendlyError = this.strings.Error_AimGeneric;
		var errorString = data.errorMsg;
		if(typeof errorString == "object"){
			//Ignore IM sending errors, and let the IM
			//widget handle those.
			if(data["action"]
				&& data.action == "im/sendIM"
 			    && data.statusCode != 401
				&& data.statusCode != 450
				&& data.statusCode != 460) {
				return;
			}
			errorString = "";
			for(var param in data) {
				if(param != "params"){
					errorString += param + ": " + data[param] + ", ";
				}
			}
			if ((data.statusCode == 430)||(data.statusCode == 607)) {
				friendlyError = this.strings.Error_RateLimited;
			}
		}

		if (data.statusCode == 401) {
			data.errorType = 1;
			aim.wim.resetUserData();
		}
		// only show the server error string if english.  otherwise use a code
		if (dojo.locale.substr(0,2) != "en"){
			errorString = aim.string.substituteParams(this.strings.IM_Notice_ErrorCode, data.statusCode);
		}

		switch (data.errorType) {
		case 1: // fatal
			aim.html.setInnerText(this.errorMsgNode, friendlyError);
			aim.html.setInnerText(this.errorCodeNode, errorString);
			this.onSessionEnd();
			//If the user seems to be logged on, be sure to try and log them off.
			if(aim.wim["user"] && aim.wim.user["aimId"]){
				setTimeout(function(){aim.wim.end();}, 100);
			}
			break;
		case 5: // inform (modal)
		case 6: // this option should be non-modal in the future
			if(data["action"]){
				if(data.action == "buddylist/addBuddy" && ((data.statusCode == 400)||(data.statusCode == 462))){
					aim.widget.Dialogs.ok(this.strings.ChatError_AddBuddy);
					break;
				}
				if(data.action == "buddylist/removeBuddy"){
					aim.widget.Dialogs.ok(this.strings.ChatError_RemoveBuddy);
					break;
				}
				if(data.action == "buddylist/removeGroup"){
					aim.widget.Dialogs.ok(this.strings.ChatError_RemoveGroup);
					break;
				}
				if(data.action == "buddylist/renameGroup"){
					aim.widget.Dialogs.ok(this.strings.ChatError_RenameGroup);
					break;
				}
			}
			aim.widget.Dialogs.ok(this.strings.UnspecifiedError+"("+data.statusCode+")");
			break;
		case 9: // ignore
			// except for some polling recovery
			if(data["action"]){
				// session ID expired. polling may have been blocked by user action
				// (like opening a browser modal dialog) so we should retry.
				if(data.action == "fetchEvents" && data.statusCode == 460){
					aim.wim._restartSession();
				}
			}
			break;
		default:
			break;
		}
	},

	onNeedAuth: function() {
		if(this.signingOn){
			aim.widget.Dialogs.show(this.strings.needAuth, [this.strings.Cancel, this.strings.SignIn], dojo.hitch(this, function(i) {
				if (i == 1) {
					aim.wim.launchAuth();
				} else {
					this.onSessionEnd();
				}
			}));
		}else{
			this._needAuth = true;
		}
	},

	onNeedConsent: function() {
		if(!this.consentFrame){
			this.consentFrame = new aim.widget.Dialogs.IFrameDialog();
			dojo.body().appendChild(this.consentFrame.domNode);
			this.consentFrame.show('<iframe src="' + aim.wim.getAuthUrl() + '" frameborder="0"></iframe>');
		}
	},

	onAuthConsentReceived: function() {
		if(this.consentFrame){
			this.consentFrame.hide();
			this.consentFrame = null;
		}
	},

	onAuthCancel: function() {
		this.onSessionEnd();
	},

	onConsentCancel: function() {
		this.onSessionEnd();
	},

	onConsentInvalidToken: function() {
		this.onError("InvalidToken");
	},
	
	onTokenComplete: function() {
		if(this._needAuth){
			this._needAuth = false;
			setTimeout(function(){aim.wim._startSession();}, 10);
		}
	},

	onIm: function(data) {
		this._addToImDisplay(data.senderAimId, data, false);
		if (aim.settings.chatSoundSend) {
			aim.wim.playEventSound("imSound", data.senderAimId);
		}
	},
	
	onBuddyListLoad: function(data) {
		// need to resize before selecting onlinePane or
		// IE6 will lock up.  yes, that's screwy
		//TODO: test if we need this on IE6 now.
		this.selectPane("onlinePane");
		this.resize();

		if (this._signOnCallback) {
			this._signOnCallback();
			this._signOnCallback = null;
		}
		
		this.signingOn = false;
	},
	
	onSessionEnd: function() {
		this.statusNode.innerHTML = "<span class='statusSmall'><p>" + this.strings.SignOnStatus_Offline + "</p></span>";
		if ((aim.wim.lastIMStatusCode == 430) || (aim.wim.lastIMStatusCode == 607)) {
			aim.html.setInnerText(this.errorMsgNode, this.strings.Error_RateLimited);
			aim.html.setInnerText(this.errorCodeNode, "");
		}
		this.signOnButton.show();
		aim.html.setShowing(this.errorArea, this.errorMsgNode.innerHTML.length > 0);
		this.autoSignOnArea.style.display = "";
		this.selectPane("offlinePane");
		this.quickFindTextbox.clear();
	},

	onTypingChanged: function(data) {
		 if (this.imGroup)
			 this.imGroup.typingChanged(data.aimId, data.status);
	},
	//End aim.wim.listener methods

	onAuthClick: function(){
		aim.wim.launchAuth();
		dojo.byId("authDialog").style.display = "none";
	},

	onAuthCancelClick: function(){
		dojo.byId("authDialog").style.display = "none";
		this.onError();					
	},

	onConsentClick: function(){
		aim.wim.launchAuth();
		dojo.byId("consentDialog").style.display = "none";
	},
	
	onConsentCancelClick: function(){
		dojo.byId("consentDialog").style.display = "none";
		this.onError();					
	},

	onClickImButton: function(evt) {
		this.openIm();
	},

	onPanelSelected: function() {
		this._signOnCallback = null;
		this.statusNode.innerHTML = "<span class='statusSmall'><p>" + this.strings.SignOnStatus_Offline + "</p></span>";
		this.errorArea.style.display = "none";
		aim.html.setInnerText(this.errorMsgNode, "");
		aim.html.setInnerText(this.errorCodeNode, "");
	},

	openIm: function(data) {
		//summary: opens an IM with a buddy. If IM already is open,
		//adds to existing one, and brings it to the front.
		//data should have an "aimId" (of the buddy) and "message" property.
		//If the user is not signed on, they will be prompted to sign on first.
		data = data || {};

		var tod = new Date();
		this._addToImDisplay(data.aimId, {
			message: data.message, 
			senderAimId: aim.wim.user ? aim.wim.user.displayId : "", 
			autoresponse: false, 
			timestamp: tod.getTime()/1000
		}, true, data.useSMS);

		if (data.aimId && data.message && this.isSignedOn()) {
			aim.wim.sendIm(data.aimId, data.message, true);
		}
	},

	onClickSignOn: function(evt) {
		if(this._needAuth){
			aim.wim.launchAuth();
		}else{
			this.signingOn = true;
			this.signOn();
			this.onChangeAutoSignOn();
		}
	},

	onStatusNodeClick: function(evt) {
		//Handles statusNode clicks, mainly to get the cancel click.
		var href = evt.target.href;
		if(href){
			dojo.stopEvent(evt);
			href = href.split("#")[1];
			if(href == "cancel"){
				this.onSessionEnd();
			}
		}
	},

	animationUrl: dojo.moduleUrl("aim.themes.aimDefault.images", "progressAnimation.gif"),

	signOn: function(callback) {
		//summary: starts the signon process.  The optional callback will be called
		// when signon is complete and the buddy list has loaded.
		this.statusNode.innerHTML = '<img src="' + this.animationUrl + '" width="12" height="12"> ' + this.strings.SignOnStatus_Connecting + '<br /><a class="statusNodeCancel" href="#cancel">' + this.strings.Cancel + '</a>';
		aim.html.setInnerText(this.errorMsgNode, "");
		aim.html.setInnerText(this.errorCodeNode, "");
		this.signOnButton.hide();
		this.autoSignOnArea.style.display = "none";
		this.errorArea.style.display = "none";
		aim.wim.start();
		if(callback) {
			this._signOnCallback = callback;
		}
	},
	isSignedOn: function() {
		return aim.wim.user != null;
	},
	
	updateAutoSignOnCheckbox: function() {
		this.autoSignOnCheckbox.checked = (aim.settings.chatAutoSignOn === true) || (aim.settings.chatAutoSignOn !== false);
	},
	onChangeAutoSignOn: function(evt) {
		var val = this.autoSignOnCheckbox.checked ? "True" : "False";
		if (val != aim.settings.chatAutoSignOn) {
			aim.settings.chatAutoSignOn = val;
		}
	},
	
	addBuddy: function() {
		if (!this.addBuddyCard) {
			this.addBuddyCard = new aim.AddBuddyCard();
			this.addBuddyCard.startup();
		}
		
		aim.widget.popup({
			popup: this.addBuddyCard,
			around: this.buttonsPane,
			orient: {TR: "TR"},
			padding: [10, 10]
		});
	},
	
	_addToImDisplay: function(/*string*/senderAimId, /*object*/data, /*boolean*/isSelected, /*boolean*/useSMS){
		//summary: private method that makes sure the ImGroup widget is created,
		//and displays the message in the ImGroup widget.
		if (!this.imGroup) {
			this.imGroup = new aim.ImGroup();
			dojo.body().appendChild(this.imGroup.domNode);
			this.imGroup.startup();
		}

		this.imGroup.addIm(senderAimId, data, isSelected, false, useSMS);
	},
	
	quickFind: function() {
		aim.lang.defer(this, function() {
			this.buddyListWidget.quickFind(this.quickFindTextbox.getValue());
		}, 500, "buddyListQuickFind");
	},
	onFocusQuickFind: function() {
		// Pre-render the offline group now so we don't have to do it after the user types something
		aim.lang.setTimeout(this.buddyListWidget, "renderOfflineGroup", 0);
	},

	refreshWindow: function(user){
		var im = this.imGroup.imMap[user];
		if (im){
			im._showSavedConversation();
		}
	},
	
	selectPane: function(/*String*/paneName){
		this.offlinePane.style.display = (paneName == "offlinePane" ? "block" : "none");
		this.onlinePane.style.display = (paneName == "onlinePane" ? "block" : "none");
	},
	
	_checkTokenOnStartup: function(){
		//summary: checks the OpenAuth servers for a token. If a token cannot be retrieved,
		//then the widget will know to launch the sign in window when the user clicks Start.
		if(!aim.wim._token){
			aim.wim.getToken(false);
		}
	}
});
