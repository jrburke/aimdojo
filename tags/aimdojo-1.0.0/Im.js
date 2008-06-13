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
dojo.provide("aim.Im");

dojo.require("dojo.string");
dojo.require("aim._AimTemplatedWidget");
dojo.require("dijit._Container");
dojo.require("aim.LayoutContainer");
dojo.require("aim.StackContainer");
dojo.require("aim.browser");
dojo.require("aim.html");
dojo.require("aim.date");
dojo.require("aim.KnockKnock");
dojo.require("aim.wim");
dojo.require("aim.lang");
dojo.require("aim.widget.DefaultTextbox");
dojo.require("aim.widget.Pane");
dojo.require("aim.widget.AimButton");
dojo.require("aim.settings");

dojo.declare("aim.Im", [aim._AimTemplatedWidget, dijit._Contained], {
	templatePath: dojo.moduleUrl("aim.templates", "Im.html"),
	widgetsInTemplate: true,
	closable: true,

	//The ImGroup widget that owns this widget.
	imGroup: null,
	
	//The aimId associated with this IM.
	buddyAimId: "",
	phoneMode: false,

	startup: function(){
		//summary: standard call in Dojo widget lifecycle.
		aim.wim.listeners.push(this);

		dojo.addClass(this.imLink, "imLinkModeSelect");

		if(!aim.settings.showMobileIcon)
			this.phoneLink.style.display = "none";
		
		this.sendButton.onKeyPress = dojo.hitch(this, function(e){
			 if (aim.wim.user && (e.keyCode == dojo.keys.ENTER || e.keyIdentifier == "Enter"))
				 this.onInputSubmit();
		});

		this._updateTypingInterval = window.setInterval(dojo.hitch(this, "_updateTypingStatus"), 3000);

		//Populate conversation field any any historical IM data.
		this._showSavedConversation();

		//Show or hide screen name field depending on if this is a new IM or one addressed
		//to a real person.
		if (this.isAnon()) {
			this.screenNamePane.show();
			aim.lang.setTimeout(this.mainPane, "resize", 0);
		}

		if (this.buddyAimId[0] == '+') 
			this.phoneInput.value = this.buddyAimId;

		this.title = this.getImTitleHtml();

		var knownUser = aim.wim.isInBuddyList(this.buddyAimId) || this.isAnon() || aim.wim.acceptedBuddies[this.buddyAimId];
		// defer knock-knock creation to fix a weird FF bug
		if (!knownUser && !this.isUserInitiated)
			aim.lang.setTimeout(this, "setupKnockKnock", 0);

		if (aim.wim.user)			
			this.showIfUserIsOffline();

		aim.browser.focus(this.messageInput);
	},
	
	isAnon: function() {
		return this.buddyAimId.indexOf(this.imGroup.anonIdPrefix) == 0;
	},
	
	close: function(){
		//summary: closes this IM.
		this.getParent().closeChild(this);
	},

	_showSavedConversation: function(){
		//summary: populates the conversation window with the saved messages
		//for an IM.
		var buddy = aim.wim.buddies[this.buddyAimId];
		if(buddy && buddy.im){
			var imList = buddy.im;
			var html = "";
			for(var i = 0; i < imList.length; i++){
				html += this._formatMessage(imList[i], true);
			}
			this.conversationPane.domNode.innerHTML = html;
			aim.html.targetLinksToNewWindow(this.conversationPane.domNode);			

			//Scroll to end of conversation.
			this.conversationPane.domNode.scrollTop = this.conversationPane.domNode.scrollHeight;
		}
	},

	clearWindow: function(){
		var buddy = aim.wim.buddies[this.buddyAimId];
		if(buddy){
			buddy.im = [];
		}
		this.conversationPane.domNode.innerHTML = "";
	},

// 	onShow: function(){
// 		//summary: Overriding onShow from this class' superclass.
// 		this.inherited(arguments);
//
// 		var _self = this;
// 		setTimeout(function(){
// 			aim.browser.focus(_self.messageInput);
// 		}, 500);
//
// 		this.scrollToEnd();
// 	},

	addMessage: function(/*object*/data){
		//summary: adds a message to the IM conversation area.

		//Store the message in the model, if pref allows.
		aim.wim._storeIm(this.buddyAimId, data);

		//TODO: hyperlink URLs that are in plain text.

		//Turn off typing indicator.
		if (data.senderAimId == this.buddyAimId)
			this.typingChanged("none");
			
		//Add the message to the conversation display.
		this._appendToConversationDisplay(this._formatMessage(data, false));

		// send away message
		if (aim.wim.user && !data.autoresponse && (aim.wim.user.state == "away") && (data.senderAimId == this.buddyAimId)){
			if (this.buddyAimId != aim.wim.user.aimId) {
				aim.wim.sendIm(this.buddyAimId, aim.wim.user.awayMsg, false, true);					
			}
			var im = {
				senderAimId: aim.wim.user.aimId,
				message: aim.wim.user.awayMsg,
				autoresponse: true,
				timestamp: data.timestamp
			};
			this._appendToConversationDisplay(this._formatMessage(im, false));
		}
		
		//Make sure we properly show an active conversation window.
		dojo.removeClass(this.conversationPane.domNode, "conversationDisabled");
	},

	onKeyUp: function(e){
		if (this.phoneMode) {
			var chars = 130 - this.messageInput.value.length;
			aim.html.setInnerText(this.typingIndicator.domNode,
				aim.string.substituteParams(this.strings.IM_Notice_SMS_size, chars));
		}
	},

	onKeyPress: function(e){
		if (e && aim.settings.chatEnterKey && (e.keyCode == dojo.keys.ENTER || e.keyIdentifier == "Enter") && !e.shiftKey) {
			e.preventDefault();
			
			if (aim.wim.user)	// check if signed in
				this.onInputSubmit();
		} else {
			if (!this.phoneMode) {
				this._lastKeyPress = new Date();
				this._updateTypingStatus();
			}
			else {
				var chars = 130 - this.messageInput.value.length;
				if (e && chars <= 0){
					if (e.keyCode > 47 || e.keyCode == dojo.keys.SPACE || e.charCode)
						e.preventDefault();
				}
			}
		}
	},

	onPhoneKeyPress: function(e) {
	},
	
	_updateTypingStatus: function() {
		if (!aim.wim.user || this.phoneMode) return;
		
		var status = "none";
		if (this.messageInput.value) {
			if ((new Date()) - this._lastKeyPress > 3000)
				status = "typed";
			else
				status = "typing";
		}
		
		if (status != this._lastTypingStatus) {
			aim.wim.setTyping(this.buddyAimId, status);
			this._lastTypingStatus = status;
		}
	},
	_lastTypingStatus: "none",
	
	uninitialize: function() {
		if (aim.wim.user && this.buddyAimId)
			aim.wim.setTyping(this.buddyAimId, "none");
		window.clearInterval(this._updateTypingInterval);
	},

	onBlurTextarea: function() {
		// Argh.. In Firefox, if a textarea or input element is focused, and
		// the user clicks to another window, onblur gets fired for the textarea,
		// but does not bubble up.  So we have to manually bubble it up to
		// aim.browser to keep isWindowFocused current.
		if (dojo.isMoz)
			aim.browser._onblur();
	},
	
	onInputSubmit: function(){
		//summary handles submitting a new message from the user.
		if (!aim.wim.user) {
			this._appendToConversationDisplay(this._formatMessage({
				message: this.strings.SignOnStatus_Offline_SignInForIm + " " + this.buddyAimId,
				senderAimId: aim.wim._systemAimId
			}, false));
			if(this.buddyAimId) {
				if(this.phoneMode)
					aim.widget.Dialogs.ok(this.strings.SignInAIMToSendTextToBuddy + " " + this.buddyAimId);
				else
					aim.widget.Dialogs.ok(this.strings.SignInAIMToSendIMToBuddy + " " + this.buddyAimId);
			} else {
				if(this.phoneMode)
					aim.widget.Dialogs.ok(this.strings.SignInAIMToSendText);		
				else
					aim.widget.Dialogs.ok(this.strings.SignInAIMToSendIM);		
			}
			return;
		}
		
		if (this.phoneMode)
			this.onSMSSubmit();
		else {
			if(this.isAnon()){
				//This is a new IM with a new name. Get the new name.
				var buddyAimId = this.screenNameTextbox.getValue();
				buddyAimId = dojo.trim(buddyAimId || "");
				if(!buddyAimId){
					aim.widget.Dialogs.ok(this.strings.IM_Label_NoRecipient);
					return;
				}
	
				//Update our tracking and this widget to use the right name,
				this.imGroup.updateImGroup(this, this.buddyAimId, buddyAimId);
				this.buddyAimId = buddyAimId;
				this.updateTitle();
				
				// Hide the screen name input
				this.screenNamePane.hide();
				this.mainPane.resize();
			}
	
			// Sending an IM implicitly changes your typing status to none, so make
			// sure we don't send an explicit typing status change.
			this._lastTypingStatus = "none";
			
			//Send the message
			var message = dojo.trim(this.messageInput.value || "");
			this.messageInput.value = "";
			aim.browser.focus(this.messageInput);
			//Only send a message if there is one to send, and the user
			//is still signed on (aim.wim.user has a value).
			if(message && aim.wim.user){
				message = aim.string.escapeXml(message);
				message = message.replace(/\n/g, "<br>");
				var displayId = aim.wim.getDisplayId(this.buddyAimId);
				var tod = new Date();
				// avoid sending sending messages that are way too large,
				// they'll just get kicked back anyway
				if (message.length > 2000) {
					message = aim.string.substituteParams(this.strings.IM_Notice_MessageNotSent, displayId) + " ";
					message += aim.string.substituteParams(this.strings.IM_Notice_MessageTooLarge, displayId);
					this.addMessage({
						message: message, 
						senderAimId: aim.wim._systemAimId,
						autoresponse: false,
						timestamp: tod.getTime()/1000
						});
					return;
				}
				if (!aim.wim.isBuddyAllowed(this.buddyAimId)){
					message = aim.string.substituteParams(this.strings.IM_Notice_RemoteUserBlocked, displayId);
					this.addMessage({
						message: message, 
						senderAimId: aim.wim._systemAimId,
						autoresponse: false,
						timestamp: tod.getTime()/1000
						});
					return;
				}
				this.addMessage({
					message: message, 
					senderAimId: aim.wim.user.displayId,
					autoresponse: false, 
					timestamp: tod.getTime()/1000
				});
				aim.wim.sendIm(this.buddyAimId, message, true, false);					
	
				if (aim.settings.chatSoundSend) {
					aim.wim.playEventSound("imSound", aim.wim.user.aimId);
				}
			}
		}
	},

	onSMSSubmit: function() {
		var phnum = this.phoneInput.value;
		phnum = phnum.replace(/[^0-9]/g, "");
		phnum = "+" + phnum;
		this.phoneInput.value = phnum;

		if(this.isAnon()){
			this.imGroup.updateImGroup(this, this.buddyAimId, phnum);
			this.buddyAimId = phnum;
			this.updateTitle();
		}

		var message = dojo.trim(this.messageInput.value || "").substr(0, 130);
		aim.wim.sendSMS(this.buddyAimId, phnum, message);					
		this.messageInput.value = "";
		this.onPhoneKeyPress(null);
		this.savePhoneNum(phnum.substr(1));

		var tod = new Date();
		this.addMessage({
			message: message, 
			senderAimId: aim.wim.user.displayId,
			autoresponse: false,
			timestamp: tod.getTime()/1000
			});
	},

	onClickSendButton: function() {
		this.onInputSubmit();
	},
	
	typingChanged: function(/*String*/typingStatus){
		//summary: typing status for buddy changed.
		if (!this.phoneMode){
			var str = {
				typing:	this.strings.IM_Notice_UserTyping,
				typed:	this.strings.IM_Notice_UserTyped,
				none:	""
			}[typingStatus];
			
			aim.html.setInnerText(this.typingIndicator.domNode,
				aim.string.substituteParams(str, aim.wim.getDisplayId(this.buddyAimId)));
		}
	},

	updateTitle: function() {
		this.title = this.getImTitleHtml();
		this.imGroup._updateTabLabel(this);
	},
	getImTitleHtml: function(){
		return this.isAnon() ? this.strings.IM_Title_NewIM : aim.wim.getDisplayId(this.buddyAimId);
	},

	onResized: function() {
		this.inherited(arguments);
		
		if (this.screenNamePane.isShowing()) {
			var width = dojo.contentBox(this.screenNamePane.domNode).w;
			var labelWidth = dojo.marginBox(this.screenNameLabel).w;
			dojo.marginBox(this.screenNameTextbox.domNode, {w: width - labelWidth - 5});
		}
		
		dojo.marginBox(this.messageInput, {w: dojo.contentBox(this.messageInput.parentNode).w});
	},
	
	_formatMessage: function(/*object*/data, /*boolean*/includeImBlock){
		//summary: formats the message to be added to the conversation display.
		
		var displayId = aim.wim.getDisplayId(data.senderAimId);

		if (data.autoresponse)
			displayId = this.strings.IM_Label_AutoResponsePrefix + displayId;

		//Make sure hyperlink tags go to a new window.
		var message = data.message.replace(/("http(s)?\:\S+")\s*>/g, '$1 target="_blank">');
		// must remove empty tags, they aren't handled well by innerHTML
		message = message.replace(/<[^<]*\/>/g, "");
		message = this._insertSmileyImages(message);
		var formattedMessage = "";
		var tstamp = "";
		if (aim.settings.chatTimeStamp) {
			var ts = new Date(data.timestamp*1000);
			tstamp = " " + aim.wim.makeTimeStamp(ts);
		}
		if(data.senderAimId.toLowerCase() == this.buddyAimId.toLowerCase()){
			formattedMessage += '<span class="buddyImName">' + displayId + 
				'</span><span class="buddyImName imTimeStamp">' + tstamp + 
				': </span><span class="userIm">';
		}else if(data.senderAimId == aim.wim._systemAimId){
			formattedMessage += '<span class="systemIm">';
		}else if(data.senderAimId.length == 0){
			formattedMessage += '<span class="localMessage">';
		}else{
			formattedMessage += '<span class="userImName">' + displayId + 
				'</span><span class="userImName imTimeStamp">' + tstamp + 
				': </span><span class="userIm">';
		}
		formattedMessage += message + "</span>";
		
		if (data.autoresponse){
			formattedMessage = "<hr>" + formattedMessage + "<hr>";
		}
		
		if(includeImBlock){
			formattedMessage = '<div class="imBlock">' + formattedMessage + '</div>';
		}
		
		return formattedMessage;
	},

	_appendToConversationDisplay: function(/*String*/html){
		//summary: appends a message to the conversation display.

		var messageDiv = dojo.doc.createElement("div");
		messageDiv.className = "imBlock";
		messageDiv.innerHTML = html;
		aim.html.targetLinksToNewWindow(messageDiv);		
		this.conversationPane.domNode.appendChild(messageDiv);
		this.scrollToEnd();
	},
	
	scrollToEnd: function() {	
		this.conversationPane.domNode.scrollTop = this.conversationPane.domNode.scrollHeight;			
	},

	smiliesRegExps: [
		{image:'shock',     regexp: /=-O/gi},
		{image:'greed',     regexp: /:-\$/gi},
		{image:'indecision',regexp: /:-\\/gi},
		{image:'frown',     regexp: /:-\(/gi},
		{image:'kiss',      regexp: /:-\*/gi},
		{image:'foot',      regexp: /:-!/gi},
		{image:'cry',       regexp: /:\'\(/gi},
		{image:'yell',      regexp: />:O/gi},
		{image:'shame',     regexp: /:-\[/gi},
		{image:'bigkiss',   regexp: /:-X/gi},
		{image:'wink',      regexp: /;-\)/gi},
		{image:'tongue',    regexp: /:-P/gi},
		{image:'cool',      regexp: /8-\)/gi},
		{image:'halo',      regexp: /O:-\)/gi},
		{image:'smile',     regexp: /:-\)/gi},
		{image:'smile',     regexp: /:\)/gi},
		{image:'smile',     regexp: /:=\)/gi},
		{image:'grin',      regexp: /:-D/gi}
	],

	_smileyImagePath: aim.settings.baseSmileyUrl,
	_insertSmileyImages: function(message){
		for(var i = 0; i < this.smiliesRegExps.length; i++){
			var smileyInfo = this.smiliesRegExps[i];
			var smImage = '<img src="' + this._smileyImagePath  + smileyInfo.image + '.gif" align="absmiddle">';
			message = message.replace(smileyInfo.regexp, smImage);
		}
		return message;
	},
	
	// If buddy is offline, display a message that IM's might be delievered when he signs on.
	showIfUserIsOffline: function(sn) {
		sn = sn || this.buddyAimId;
		if (sn.indexOf(this.imGroup.anonIdPrefix) == 0) return;
		if (aim.wim.isBuddyAllowed(sn)){
			var buddy = aim.wim.buddies[sn];
			if (buddy)
				this._showIfUserIsOffline(buddy);
			else if (!buddy)
				aim.wim.getPresence(sn, dojo.hitch(this, "_showIfUserIsOffline"));
		}
	},

	addOfflineLinks: function() {
		var aimId = this.isAnon() ? this._lastCheckedScreenName : this.buddyAimId;
		var emailLink = aim.string.substituteParams("<span class='aimLink' onclick='dojo.publish(\"aimWimSendEmail\", [\""+aimId+"\"]); return false;'>{0}</span>", this.strings.SendEmail);
		var textLink = aim.string.substituteParams(" | <span class='aimLink' onclick='dojo.publish(\"aimWimSetPhoneMode\", [\""+aimId+"\"]); return false;'>{0}</span>", this.strings.Text_Message);
		if(!aim.settings.showMobileIcon)
			textLink = "";

		var tod = new Date();
		
		this.addMessage({
			message: aim.string.substituteParams(this.strings.IM_Notice_OfflineLinks, emailLink + textLink, ""),
			autoresponse: false, 
			senderAimId: "",
			timestamp: tod.getTime()/1000
		});
	},

	_showIfUserIsOffline: function(data) {
		if (data.state == "offline"){
			this.addMessage({
				message: aim.string.substituteParams(this.strings.IM_Notice_RemoteUserOfflineMaybe, data.displayId),
				senderAimId: aim.wim._systemAimId
			});
			this.addOfflineLinks();
		}
	},

	onBlurScreenName: function() {
		var sn = this.screenNameTextbox.getValue();
		if (sn && (sn != this._lastCheckedScreenName)) {
			this._lastCheckedScreenName = sn;
			this.showIfUserIsOffline(sn);
		}
	},

	setupKnockKnock: function() {
		var pane = new aim.KnockKnock({buddyAimId: this.buddyAimId});
		this.stackWidget.addChild(pane);
		this.stackWidget.selectChild(pane);
		dojo.connect(pane, "onClickAccept", this, "onAcceptKnockKnock");
		dojo.connect(pane, "onClickDecline", this, "onDeclineKnockKnock");
		dojo.connect(pane, "onClickBlock", this, "onDeclineKnockKnock");
	},
	onAcceptKnockKnock: function() {
		// changed this to work around strange FF bugs.
		// the originally created im page doesn't work right after the knock-knock
		// goes away.
		var buddy = this.buddyAimId;
		this.getParent().closeChild(this);
		dojo.publish("aimWimBuddyClicked", [{aimId: buddy}]);
	},
	onDeclineKnockKnock: function() {
		this.getParent().closeChild(this);
	},

	clearImHistory: function(){
	},

	_getTimezoneString: function(d){
		var offset = (-d.getTimezoneOffset());
		return ((offset>=0)?"+":"-") + 
			dojo.string.pad(Math.floor(Math.abs(offset)/60), 2) + 
			dojo.string.pad(Math.abs(offset)% 60, 2);
	},

	_formatMessageMF: function(/*object*/data, /*boolean*/includeImBlock){
		if (data.senderAimId.length == 0) return "";

		var displayId = aim.wim.getDisplayId(data.senderAimId) || data.senderAimId;
		if (data.autoresponse)
			displayId = this.strings.IM_Label_AutoResponsePrefix + displayId;

		//Make sure hyperlink tags go to a new window.
		var message = data.message.replace(/("http(s)?\:\S+")\s*>/g, '$1 target="_blank">');

		message = this._insertSmileyImages(message);
		var formattedMessage = "";
		var tstamp = "";
		var extra = "";
		var ts = new Date(data.timestamp*1000);
		if (aim.settings.chatTimeStamp) {
			tstamp = " " + aim.wim.makeTimeStamp(ts);
		}
		if(data.senderAimId.toLowerCase() == this.buddyAimId.toLowerCase()){
			formattedMessage += '<span class="username buddyImName" style="font-weight: bold; color: blue;">' + displayId + 
				'</span><abbr class="timestamp imTimeStamp" style="font-weight: normal; font-size: 10px;" title="'+
				aim.date.formatISO8601(ts)+this._getTimezoneString(ts) + '">' + tstamp + 
				': </abbr><span class="messageData userIm">';
		}else if(data.senderAimId == aim.wim._systemAimId){
			extra = ' status';
			formattedMessage += '<span class="username" style="display: none">'+data.aboutAimId+'</span>'+
				'<abbr class="timestamp imTimeStamp" style="font-weight: normal; font-size: 10px;" title="'+
				aim.date.formatISO8601(ts)+this._getTimezoneString(ts) + '">' + tstamp + ': </abbr>'+
				'<span class="type" title="'+data.state+'" style="display: none">'+ (data.awayMessage?data.awayMessage:'') +'</span>'+
				'<span class="messageData systemIm" style="color: gray; text-align: left; font-size: 11px;">';
		}else{
			formattedMessage += '<span class="username userImName" style="font-weight: bold; color: red;">' + 
				displayId + '</span><abbr class="timestamp imTimeStamp" style="font-weight: normal; font-size: 10px;" title="' +
				aim.date.formatISO8601(ts)+this._getTimezoneString(ts) + '">' + tstamp + 
				': </abbr><span class="messageData userIm">';
		}
		formattedMessage += message + "</span>";

		if (data.autoresponse){
			formattedMessage = "<hr>" + formattedMessage + "<hr>";
		}

		if(includeImBlock){
			formattedMessage = '<div style="display: block;" class="message imBlock'+extra+'">' + formattedMessage + '</div>\n';
		}

		return formattedMessage;
	},

	getParticipantMarkup: function(){
		var html = '<div class="participants" style="display: none">\n'+
			'<div class="vcard" style="display: none" uid="'+ aim.wim.user.aimId +'">' +
			' <div class="fn" style="display: none">'+ aim.wim.user.aimId +'</div></div>\n'+
			'<div class="vcard" style="display: none" uid="'+ this.buddyAimId +'">' +
			' <div class="fn" style="display: none">'+ this.buddyAimId +'</div></div>\n'+
			'</div>\n';
		return html;
	},

	getConversationMarkup: function(){
		var html = "";
		var buddy = aim.wim.buddies[this.buddyAimId];
		if(buddy && buddy.im){
			var imList = buddy.im;
			var ts = new Date(imList[0].timestamp*1000);
			var title = aim.string.substituteParams(this.strings.IMSave_Title, aim.date.formatDateTime(ts, "MMM d"));
			html = '<div class="hChat" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 16px;">\n<div class="title" style="display: none;">'+title+'</div>\n'+
				'<div class="service" style="display: none">AIM</div>\n';
			html += this.getParticipantMarkup();
			for(var i = 0; i < imList.length; i++){
				html += this._formatMessageMF(imList[i], true);
			}
			html += '</div>';
		}
		return html;
	},

	_getMessageTitle: function(){
		 var title = "";
		 var buddy = aim.wim.buddies[this.buddyAimId];
		 if(buddy && buddy.im){
			 var imList = buddy.im;
			 var imcount = 0;
			 for (var i=imList.length-1; i>=0; i--){
				 if (imList[i].senderAimId != aim.wim._systemAimId && imList[i].senderAimId.length>0){
					 imcount++;
					 if (title.length>50) continue;
					 title += (title.length>0?" | ":"") + imList[i].message.replace(/\<.*?\>|&.*?;|\r\n/g, " ");
				 }
			 }
		 }
		 return aim.string.substituteParams(this.strings.IMSave_subject_prefix, imcount)+title.substr(0, 50);
	},

	saveConversation: function(folder, displayName, updateMenu){
		var body = this.getConversationMarkup();
		if (body.length == 0) {
			var tod = new Date();
			this.addMessage({
				message: this.strings.IMSave_Empty, 
				senderAimId: aim.wim._systemAimId,
				autoresponse: false,
				timestamp: tod.getTime()/1000
				});
			return;
		}

		dojo.publish("AimFeedbackStart", [this.strings.IM_Notice_Saving]);		
	},

	sendMail: function() {
		var aimId = this.isAnon() ? this._lastCheckedScreenName : this.buddyAimId;
		console.log("TODO: sendMail not implemented.");
	},

	getBestPhone: function(){
		console.log("TODO: implement getBestPhone?");
		return "";
	},

	_ignoreResponse: function(){
	},

	savePhoneNum: function(phnum){
		console.log("TODO savePhoneNum");
	},

	setIMmode: function() {
		if (this.phoneMode){
			this.phoneMode = false;
			this.phonePane.hide();
			dojo.addClass(this.imLink, "imLinkModeSelect");
			dojo.removeClass(this.phoneLink, "mobileLinkModeSelect");
			aim.html.setInnerText(this.typingIndicator.domNode, "");
			if (this.isAnon()) 
				this.screenNamePane.show();
			this.mainPane.resize();
			aim.browser.focus(this.messageInput);
			this.updateTitle();
			var tod = new Date();
			this.addMessage({
				message: this.strings.IM_Notice_AIM, 
				senderAimId: aim.wim._systemAimId,
				autoresponse: false,
				timestamp: tod.getTime()/1000
				});
		}
	},

	setPhonemode: function() {
		if (!this.phoneMode && aim.settings.showMobileIcon){
			this.phoneMode = true;
			this.phonePane.show();
			dojo.addClass(this.phoneLink, "mobileLinkModeSelect");
			dojo.removeClass(this.imLink, "imLinkModeSelect");
			this.screenNamePane.hide();

			if (this.phoneInput.value.length == 0 && this.buddyAimId.length > 0){
				var ph = this.getBestPhone();
				if (ph.length > 0){
					this.phoneInput.value = "+" + ph;
					aim.browser.focus(this.messageInput);
				}
				else {
					this.phoneInput.value = this.strings.IM_Notice_PhoneNumber;
					aim.browser.focus(this.phoneInput);
					aim.lang.setTimeout(function(phoneInput) {
						try {
							phoneInput.select();
						} catch (e) {console.log(e);}
					}, 50, this.phoneInput);
				}
			}

			this.mainPane.resize();
			this.updateTitle();
			this.onKeyUp(null);
			var tod = new Date();
			this.addMessage({
				message: this.strings.IM_Notice_SMS, 
				senderAimId: aim.wim._systemAimId,
				autoresponse: false,
				timestamp: tod.getTime()/1000
				});
			this.addMessage({
				message: this.strings.IM_Notice_SMSDisclaimer, 
				senderAimId: aim.wim._systemAimId,
				autoresponse: false,
				timestamp: tod.getTime()/1000
				});
			if (this.strings.SMSLegalInfoURL.length > 0){
				this.addMessage({
					message: aim.string.substituteParams("<a target=_blank href='{0}'>{1}</a>", this.strings.SMSLegalInfoURL, this.strings.IM_Notice_SMSInfo),
					senderAimId: aim.wim._systemAimId,
					autoresponse: false,
					timestamp: tod.getTime()/1000
					});
			}
		}
	}
});

