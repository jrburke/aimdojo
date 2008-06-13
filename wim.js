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

dojo.provide("aim.wim");

dojo.require("dojo.io.script");
dojo.require("aim.sound");
dojo.require("aim.date");
dojo.require("aim.settings");
dojo.require("dojo.i18n");

dojo.requireLocalization("aim", "strings");

/*
This module uses some datatypes from wim which can be found here:
http://developer.aim.com/ref_api
(see the "Enumerations" and "Types" sections)
*/

aim.wim = {
	//"listeners" properyt is an array of listeners to wim callbacks.
	//You can add a listener via aim.wim.listeners.push().
	//Listeners can implement the following function names:
	//		onError(dataObject): An error occurred. dataObject is the error. Could be a
	//		                     string or an object.
	//		onNeedAuth(): The user needs to go to the AIM site to authenticate.
	//		ononNeedConsent(): The user needs to go to the AIM site to consent to the web site to receiving and 		//		                   sending information on their behalf.
	//		onAuthCancel(): The user canceled auth.
	//		onConsentCancel(): The user did not allow access to buddy list.
	//		onConsentInvalidToken(): The consent screen might send this sometimes. It seems
	//		                         to happen when clicking "Always Allow". Not sure what it
	//		                         means yet.
	//		onAuthConsentReceived(): The response from an auth or consent window/iframe was received.
	//		                         The response may or may not be valid. Use this to close down any
	//		                         iframes/dialogs opened for the auth/consent flow.
	//		onTokenComplete(): Indicates an OpenAuth token was successfully retrieved.
	//		onUserLoad(): User's identity has been received. Should be the first successful
	//		              callback after start() is called. To get the user's info, check
	//		              aim.wim.user.
	//		onSessionStart(): The user's session has started.
	//		onSessionEnding(): The user's session is about to end. Functions that handle this event should
	//		                   do their job quickly.
	//		onSessionEnd(): The user's session has ended.
	//		onBuddyListLoad(): User's buddy list has been loaded. use aim.wim.groups
	//		                   and aim.wim.buddies to build up the buddy list UI.
	//		onIm(dataObject): An IM has been received. dataObject properties:
	//		                  senderAimId: String. Buddy's aimId.
	//		                  message: String. HTML instant message.
	//		                  autoresponse: boolean. True if this is an auto response IM.
	//		                  timestamp: integer. UTC timestamp when message was sent.
	//		onPresenceChanged(dataObject): If a value in the presence info for
	//		                               a buddy changes, this event will be
	//		                               sent with the following data:
	//		                               aimId: String. Buddy's aimId.
	//		                               oldValues: hashmap of changed presence properties.
	//		                                          The old values are in this object.
	//		                                          See aim.wim.buddies[data.aimId]
	//		                                          for the new/current values.	
	//		onTypingChanged(dataObject): The typing status has changed for one of
	//		                             buddies. dataObject properties:
	//		                             aimId: String. Buddy's aimId.
	//		                             status: TypingStatus (see wim docs).
	//		onGroupRemoved(): the requested group was deleted.
	//		onGroupRenamed(): the requested group was renamed.
	//		onBuddyAdded(): buddy was added
	//		onBuddyRemoved(): buddy was removed

	listeners: [],
	
	//Set this value to your WebAIM API Key before calling any methods on this object.
	apiKey: null,
	
	//The *complete*, full URL to the auth.html page. This is page is used
	//to handle the the authentication callback from OpenAuth. This page needs to live
	//in the same directory as the URL registered with the the WIM
	//key. Set it before calling start().
	authPageUrl: null,
	
	//Indicates if authentication cookies should
	//be cleared with the AIM session ends. This is important to do 
	//on public, shared computers. Set this value to true before calling
	//aim.wim.end() to clear the auth cookies.
	clearAuthOnSignOut: false,

	//Force a particular locale for the webAIM startSession call. May be needed for Safari, where it reports just "en"
	//instead of something like "en-us".
	locale: null,

	//The type of events to fetch.
	//This module does not support data IMs yet.
	events: "buddylist,presence,im,typing,offlineIM",

	//Data model for the logged in user. It is a Presence
	//data type (see wim docs).
	user: null,

	//A quick lookup for buddies. Key name is the aimId
	//of the buddy. The data for the buddy is the Presence
	//type (see wim docs), and an additional "groups"
	//property is added that contains an array of group
	//names the buddy is in.
	buddies: {},

	// mapping SMS phone numbers to buddies
	phones: {},

	//A hashtable of screen names who the user has accepted
	//and declined knock-knock's from (during this WebSuite
	//session), respectively.
	//AOLSystemMsg gets a free pass.
	acceptedBuddies: {"aolsystemmsg": true},
	declinedBuddies: {},
	// lists of ignored and blocked names
	ignoredBuddies: {},
	blockedBuddies: {},
	allowedBuddies: {},
	pdMode: "permitAll",
		
	//Array of groups. Each group contains the following data:
	//	name: name of group.
	//  buddies: array of strings of buddies. String names
	//	         are aimIds for the buddies. Look up the Presence info
	//	         for the buddy in aim.wim.buddies.
	groups: [],

	use24hour: false,

	//A preference to indicate if the OpenAuth mini-UI should be used.
	useOpenAuthMiniUi: true,

	//Set this to a string that has properties for the window.open call
	//used to launch the OpenAuth sign-in/consent windows.
	authWindowProps: "width=320,height=480,menubar=no,toolbar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes,directories=no",
	
	//A preference indicating if SSL connections should be used
	//to communicate with the AIM servers. Note that this only guarantees
	//secure connections from client to the AIM server, and not from the
	//AIM server to the eventual IM recipient.
	//TODO: Not fulling implemented yet.
	useSsl: false,

	resetUserData: function(){
		//Clears out user data. Called internally
		//when aim.wim.end() is called.
		this._token = null;
		this._tokenExpiresIn = 0;
		this._aimsid = null;
		this._fetchBaseUrl = null;
		this._redirectUrl = null;
		this._fetchFailures = 0;
		//reset the model objects.
		this.user = null;
		this.buddies = {};
		this.groups = [];
		this.customOnlineMessages = [];
		this.customAwayMessages = [];
		this.ignoredBuddies = {};
		this.blockedBuddies = {};
		this.allowedBuddies = {};
		this.pdMode = "permitAll";
	},

	getToken: function(/*Boolean?*/startAfterToken){
		//summary: retrieves an auth token from OpenAuth to use 
		//with the API calls.
		this._token = null;
		this._startAfterToken = startAfterToken;
		this._call("auth/getToken", "_getTokenResponse", 1, {
			language: dojo.locale
		});
	},
	
	getCannedAwayMessages: function(){
		//summary: fetches the canned away messages. Need a function
		//instead of accessing a property, since they are localized values
		//and we need to fetch them after all the modules and bundles load.
		
		//Do initial i18n setup. Need to do it here since we need to wait
		//for after dojo.addOnLoad has fired.
		if(!this.strings){
			this.strings = dojo.i18n.getLocalization("aim", "strings");
			//List of canned away messages for the logged in user.
			//Check to make sure they do not exist -- maybe outside
			//developer defined their own.
			if(!this.cannedAwayMessages){
				this.cannedAwayMessages = [
					this.strings.BuddyStatus_Label_IAmAway,
					this.strings.BuddyStatus_Label_OnThePhone,
					this.strings.BuddyStatus_Label_BeRightBack
				];
			}
		}

		return this.cannedAwayMessages;
	},

	getExpressionsUrl: function(/*String?*/windowOptions){
		//summary: generates URL to AIM Expressions site.
		var url = this._wimUrl
			+ "aim/getExpressionsPage?k="
			+ this.apiKey
			+ "&f=html";

		if(this.locale){
			url += "&language=" + this.locale
		}

		return url;
	},

	getBuddyInfoUrl: function(/*String*/buddyAimId) {
		//summary: constructs the URL to view the Buddy Info for the
		//given buddyAimId. Use this URL in a new window or an iframe
		//in the page to show the Buddy Info.
		return this._wimUrl
			+ "aim/getHostBuddyInfo?f=html&k=" + this.apiKey
			+ "&aimsid=" + this._aimsid
			+ "&a=" + this._token
			+ "&t=" + encodeURIComponent(buddyAimId);
	},

	start: function(){
		//summary: starts up a wim session. Will prompt the user to
		//log in/allow this site to use wim. Listener callbacks
		//will start happening after start is called.

		//Reset end guard.
		this._endCalled = false;
		
		var _self = this;
		dojo.addOnLoad(function(){
			if(!_self._token){
				_self.getToken(true);
			}else{
				_self._startSession();
			}
		});

		//Set up an unload listener to disconnect.
		if(!this._isUnloadRegistered){
			var unload = function(){
				aim.wim.end(true);
			};
	
			//Do this onbeforeunload so we have a chance that the response
			//will be received before dojo is torn down.
			if(typeof(window.addEventListener) == 'undefined'){
				window.attachEvent("onbeforeunload", unload);
			}else{
				window.addEventListener('beforeunload', unload, false);
			}

			this._isUnloadRegistered = true;
		}

		var dstr = (new Date()).toLocaleTimeString();
		this.use24hour = (dstr.charAt(dstr.length - 1) != "M");
	},
	
	end: function(/*boolean*/isUnloading){
		//summary: call this to end the wim session.
		this._stopFetchEvents();
		
		//Make sure we don't keep calling end multiple times.
		//This could happen in the error case where we call end as
		//part of an error handler.
		if(this._endCalled) {
			return;
		}
		this._endCalled = true;

		var callbackName = "_sessionEndResponse";

		try{
			this._notify("onSessionEnding");
		}catch(e){
			//Just eat it.
		}

		if(isUnloading){
			//Kill event fetching and kill script tags since IE may still try to process
			//script tag response after dojo goes away, causing an error.
			this._stopFetchEvents();

			callbackName = null;
		}

		this._call("aim/endSession", callbackName, 1, {
			aimsid: this._aimsid
		});


		//Log out of OpenAuth too, if desired. Need to pop a 
		//window so we can properly clear cookies for browsers like Safari.
		if(this.clearAuthOnSignOut){
			this._authAction = "auth/signOut";
			var signOutUrl = this._makeAuthUrl("http://api.screenname.aol.com/auth/logout?a=" + encodeURIComponent(this._token));
			window.open(signOutUrl, "aimWimAuth", this._signOutWindowProps).focus();
		}

		//Wait a little bit for the script request to be sent out.
		var startTime = (new Date()).getTime();
		var endTime = startTime;
		while(startTime + 1000 > endTime){
			endTime = (new Date()).getTime();
		}
	},

	setState: function(/*PresenceState*/state, /*String?*/message, /*Integer*/idleTime){
		//summary: sets the presence state for the user. This will trigger
		//an onUserLoad() callback when the response from the server
		//is received. PresenceState values or "offline" or "mobile"
		//will not be accepted by the server.
		//If state is "away", then the message argument will be used
		//as the user's away message. If the state is "online", then
		//the message will be the user's status message.
		//
		//If state is "idle" then idleTime should be the idle time in
		//seconds.
		
		message = message || "";
		var awayMessage = "";
		message = message.replace(/^\s+/, "").replace(/\s+$/, "");

		if(state == "away"){
			awayMessage = message;
		}

		//Set the final state.
		this._call("presence/setState", "_setStateResponse", 9, {
			aimsid: this._aimsid,
			view: state,
			away: awayMessage,
			idle: idleTime
		});

		if(state == "online"){
			//Set status message, since it is a different call for
			//online (if going offline, can piggyback on setState)
			this.tmpStatus = message;
			this._call("presence/setStatus", "_setStatusResponse", 9, {
				aimsid: this._aimsid,
				statusMsg: message
			});
		}
	},

	setTyping: function(/*String*/targetAimId, /*String*/state){
		if (aim.settings.chatPrivacyTyping){
			this._call("im/setTyping", "_discardResponse", 9, {
				aimsid: this._aimsid,
				typingStatus: state,
				t: targetAimId
			 });
		}
	},

	sendSMS: function(/*String*/targetAimId, /*String*/phone, /*String*/message) {
		this.phones[phone] = targetAimId;
		this.sendIm(phone, message, false, false);
	},

	sendIm: function(/*String*/targetAimId, /*String*/message, /*boolean*/allowOfflineIm, /*boolean*/autoresp){
		//summary: sends an instant message to the targetAimId. If the user is not online,
		//set allowOfflineIm to true to allow offline IM delivery.
		//This method should not generate any callbacks, except if there is an error.
		//See wim docs for sendIM method's error codes.
		allowOfflineIm = allowOfflineIm || false;

		//Create an object for the message, and save it in memory.
		var im = {
			senderAimId: this.user.aimId,
			message: message,
			autoresponse: autoresp,
			timestamp: (new Date()).getTime()
		};
		this.lastIMStatusCode = 0;

		// User presumably doesn't want to ignore the buddy if he sends him an IM.
		delete this.declinedBuddies[targetAimId];
		delete this.ignoredBuddies[targetAimId];

		this._call("im/sendIM", "_discardResponse", 9, {
			aimsid: this._aimsid,
			t: targetAimId,
			message: message,
			offlineIM: allowOfflineIm,
			autoResponse: autoresp
		});
	},

	restoreConversation: function(/*String*/touser, /*String*/markup){
		var node = document.createElement("div");
		dojo.body().appendChild(node);
		node.innerHTML = markup;
		var user="";

		// setup users
		var participants = dojo.query(".vcard", node);
		if (participants.length > 2){
			// might be a chat room we can't support yet
			return false;
		}

		for (var i=0; i<participants.length; i++){
			user = participants[i].getAttribute("uid");
			if (user == touser) 
				break;
		}
		if (!user || (user.length == 0)) {
			// no participants? user talking to self?
			return false;
		}

		// clear previous history
		var buddy = aim.wim.buddies[user];
		if(buddy){
			buddy.im = [];
		}
		// store the data
		var msgs = dojo.query(".message", node);
		for (var m=0; m<msgs.length; m++){
			var im = {senderAimId: "", message: "", autoresponse: false, timestamp: 0};
			if (msgs[m].hasChildNodes()){
				var status = dojo.hasClass(msgs[m], "status");
				for (var n=0; n<msgs[m].childNodes.length; n++){
					if (dojo.hasClass(msgs[m].childNodes[n], "username")){
						if (status)
							im.senderAimId = this._systemAimId;
						else {
							var anchors = msgs[m].childNodes[n].getElementsByTagName("a");
							if (anchors.length == 0)
								im.senderAimId = msgs[m].childNodes[n].innerHTML;
							else
								im.senderAimId = anchors[0].innerHTML;
						}
					}
					else if (dojo.hasClass(msgs[m].childNodes[n], "messageData")){
						im.message = msgs[m].childNodes[n].innerHTML;
					}
					else if (dojo.hasClass(msgs[m].childNodes[n], "timestamp")){
						var datestr = msgs[m].childNodes[n].getAttribute("title");
						var date = aim.date.GetDateFromFormat(datestr.substr(0, 15), "yyyyMMddTHHmmss");
						if (date != 0)
							im.timestamp = date/1000;
					}

				}
			}
			if (im.senderAimId && im.senderAimId.length > 0)
				this._storeIm(user, im);
		}
		dojo._destroyElement(node);
		aim.presence.launchAIMPanel(user, false, false, true);
		return true;
	},

	addBuddy: function(/*String*/buddyName, /*String*/groupName){
		//summary: adds the buddyName to the groupName specified.
		//This function should not generate any callbacks unless
		//there was an error.
		this._call("buddylist/addBuddy", "_addBuddyResponse", 5, {
			aimsid: this._aimsid,
			buddy: buddyName,
			group: groupName
		});
	},
	
	removeBuddy: function(/*String*/buddyName, /*String*/groupName){
		this._call("buddylist/removeBuddy", "_removeBuddyResponse", 5, {
			aimsid: this._aimsid,
			buddy: buddyName,
			group: groupName
		});
	},

	removeGroup: function(/*String*/groupName){
		 this._call("buddylist/removeGroup", "_removeGroupResponse", 5, {
			 aimsid: this._aimsid,
			 group: groupName
		 });
	},

	renameGroup: function(/*String*/groupName, /*String*/newName){
		 this._call("buddylist/renameGroup", "_renameGroupResponse", 5, {
			aimsid: this._aimsid,
			oldGroup: groupName,
			newGroup: newName
		 });
	},

	getPresence: function(/*String*/buddyName, /*Function*/callback) {
		this._getPresenceCallback = callback;
		this._call("presence/get", "_getPresenceResponse", 9, {
			aimsid: this._aimsid,
			t: buddyName
		});
	},

	blockBuddy: function(/*String*/buddyName){
		this.pdMode = "denySome";
		this._call("preference/setPermitDeny", "_discardResponse", 5, {
			aimsid: this._aimsid,
			pdBlock: buddyName,
			pdMode: this.pdMode
		});
		this.blockedBuddies[buddyName] = true;
		this._notify("onPresenceChanged", {
			aimId: buddyName,
			oldValues: this.buddies[buddyName]
		});
	},

	unblockBuddy: function(/*String*/buddyName){
		this._call("preference/setPermitDeny", "_discardResponse", 5, {
			aimsid: this._aimsid,
			pdBlockRemove: buddyName,
			pdMode: this.pdMode
		});
		delete this.blockedBuddies[buddyName];
		this._notify("onPresenceChanged", {
			aimId: buddyName,
			oldValues: this.buddies[buddyName]
		});
	},

	ignoreBuddy: function(/*String*/buddyName, flag){
        if (flag)
    		this.ignoredBuddies[buddyName] = flag;
        else
            delete this.ignoredBuddies[buddyName];
		this._notify("onPresenceChanged", {
			aimId: buddyName,
			oldValues: this.buddies[buddyName]
		});
	},

	makeTimeStamp: function(/*Date*/d){
		var fmt = this.use24hour ? "H:mm" : "h:mma";
		return aim.date.formatTime(d, fmt).toLowerCase();
	},

	_getPresenceResponse: function(data) {
		if (data.users && data.users[0])
			this._getPresenceCallback(data.users[0]);
	},

	_removeGroupResponse: function(data) {
		this._notify("onGroupRemoved");
	},

	_renameGroupResponse: function(data) {
		this._notify("onGroupRenamed");
	},

	_addBuddyResponse: function(data) {
		this._notify("onBuddyAdded");
	},

	_removeBuddyResponse: function(data) {
		this._notify("onBuddyRemoved");
	},

	isInBuddyList: function(/*String*/buddyAimId) {
		// If buddy list hasn't loaded yet, assume they are a buddy.. most likely we're
		// dealing with an offline IM (because they may be received before the buddyList
		// event), which is only allowed for users on the buddy list.
		return (aim.wim.groups.length == 0) ||
			   !!(this.buddies[buddyAimId] && this.buddies[buddyAimId].groups);
	},
	
	isEditableGroup: function(group){
		 return ((group != "Offline") && (group != "Recent Buddies"));
		 // these probably don't need to be localized??
// 		 return ((group != this.strings.BuddyList_Label_GroupOffline) &&
// 			 (group != this.strings.BuddyList_Label_GroupRecentBuddies));
	},

	isBuddyAllowed: function(buddy){
		var pd = (this.pdMode != "denyAll") &&
					((this.pdMode == "permitAll") ||
					(this.pdMode == "denySome" && !(buddy in this.blockedBuddies)) ||
					(this.pdMode == "permitSome" && (buddy in this.allowedBuddies)) ||
					(this.pdMode == "permitOnList" && this.isInBuddyList(buddy)));

		var ret = (!(buddy in this.ignoredBuddies) && pd);
		return ret;
	},

	getGroup: function(grpName) {
		var idx = aim.lang.findByProp(aim.wim.groups, "name", grpName);
		return aim.wim.groups[idx];
	},

	normalize: function(/*String*/aimId) {
		return aimId.toLowerCase().replace(/\W/g, "");
	},
	
	getDisplayId: function(/*String*/aimId) {
		if (this.user && (aimId == this.user.aimId))
			return this.user.displayId;
		else if (this.buddies[aimId] && this.buddies[aimId].displayId)
			return this.buddies[aimId].displayId;
		else
			return aimId;
	},

	getExpressions: function(/*String*/aimId, /*Function*/callback) {
		// Fetch the user's expressions if we don't already have them.
		aimId = this.normalize(aimId);
		if (this._expressions[aimId]) {
			if (callback) callback(this._expressions[aimId]);
		} else {
			this._call("expressions/get", function(data) {
				this._expressions[aimId] = data.expressions;
				if (callback) callback(data.expressions);
			}, 9, {t: aimId});
		}
	},
	_expressions: {},
	
	playEventSound: function(/*String*/expType, /*String*/aimId) {
		this.getExpressions(aimId, dojo.hitch(this, function(exp) {
			var idx = aim.lang.findByProp(exp, "type", expType);
			if (idx == -1) {
				// If the user doesn't have the specified expression, pick a default sound.
				var defaults = {
					imSound: (aimId == this.user.aimId) ? "imsend.mp3" : "imrcv.mp3",
					arriveSound: "dooropen.mp3",
					departSound: "doorslam.mp3"
				};
				var url = aim.settings.baseSoundUrl + defaults[expType];
			} else {
				var url = exp[idx].url;
			}
			
			aim.sound.play(url);
		}));
	},
	
	replaceMsgTokens: function(/*String*/msg){
		 var tod = new Date();
		 var nmsg = msg.replace(/%n/gi, aim.wim.user.displayId);
		 nmsg = nmsg.replace(/%t/gi, tod.toLocaleTimeString());
		 nmsg = nmsg.replace(/%d/gi, tod.toLocaleDateString());
		 return nmsg;
	},

	_getTokenResponse: function(/*Object*/data){
		//summary: handles server response for getToken calls.
		if(data["token"]){
			this._token = data.token.a;
			this._tokenExpiresIn = data.token.expiresIn;
			var _self = this;
			this._notify("onTokenComplete");
			if(this._startAfterToken){
				setTimeout(function(){_self._startSession();}, 10);
			}
		}else{
			this._notify("onError", this.strings.Error_BadGetTokenResponse + data);			
		}
	},

	_startSessionResponse: function(/*Object*/data){
		//summary: handles server response for startSession calls.
		if(data["fetchBaseURL"]){
			this._sessionFailures = 0;
			this._aimsid = data.aimsid;
			this._fetchBaseUrl = data.fetchBaseURL;
			this.user = data.myInfo;
			this._notify("onSessionStart");
			this._notify("onUserLoad");
			this._getPermitDeny();
			//Start fetching. Use a fairly long delay. There is chance
			//that if fetching starts too soon, two buddy list events might
			//be sent. Avoid recreating the buddy list twice. Right now,
			//wait more than 500ms to try and avoid 2 buddy list events.
			//This is a server config thing and it could change in the future,
			//so you could still get two events.
			this._fetchTimeoutId = setTimeout(this._fetchEvents, 700);
		}else{
			this._notify("onError", this.strings.Error_BadStartSessionResponse + data);			
		}
	},

	_startSession: function(){
		//summary: starts a session with the wim server.
		this._call("aim/startSession", "_startSessionResponse", 1, {
			events: this.events,
			assertCaps: "",
			interestCaps: "",
			language: this.locale || dojo.locale
		});
	},

	_restartSession: function(){
		 this._stopFetchEvents();
		 this.resetUserData();
		 this.start();
	},

	_getPermitDeny: function(){
		this._call("preference/getPermitDeny", "_permitDenyResponse", 9, {
			aimsid: this._aimsid
		});
	},

	_permitDenyResponse: function(/*Object*/data){
		this.blockedBuddies = {};
		this.allowedBuddies = {};
		this.pdMode = data.pdMode;
		if (data.blocks)
			dojo.forEach(data.blocks, dojo.hitch(this, function(buddy) {
				this.blockedBuddies[buddy] = true;
			}));
		if (data.allows)
			dojo.forEach(data.allows, dojo.hitch(this, function(buddy) {
				this.allowedBuddies[buddy] = true;
			}));

	},

	_fetchEvents: function(){
		//summary: calls wim server to get any new events.
		//DO NOT use "this" in here, since it is called from
		//setTimeout (not from aim.wim). Don't want to use
		//"this" since it probably means a closure was created
		//to get "this" to work, and want to avoid them to avoid
		//leaking.

		//Send the fetch
		if(aim.wim._fetchTimeoutId != 0){
			aim.wim._call("fetchEvents", "_fetchEventsResponse", 9, {
				timeout: aim.wim._fetchTimeout
			});
		}
	},
	//Fetch timeout settings taken from wim js file.
	_fetchTimeout: dojo.isMoz ? 2000 : 20000,

	_fetchEventsResponse: function(/*Object*/data){
		//summary: processes events from the result of a fetchEvents call.
		//console.log(" ");
		//console.log(" ");
		//console.log("====================");
		//console.log("FETCHED EVENTS: ");
		//console.log("====================");
		//console.log("Wait time: " + data.timeToNextFetch);
		//console.log("fetch URL: " + data.fetchBaseURL);
		
		if(data.fetchBaseURL){
			this._fetchBaseUrl = data.fetchBaseURL;
		}

		var keepFetching = true;
		var events = data.events;
		this._fetchFailures = 0;

		if(events){
			//console.log("FETCH EVENTS RETURNED #EVENTS: " + events.length);
			for(var i = 0; i < events.length; i++){
				var evt = events[i];
				if(evt.type == "sessionEnded"){
					keepFetching = false;
					//Clear the user's data.
					this.resetUserData();
					this._notify("onSessionEnd");
				}else if(evt.type == "buddylist"){
					this._unpackBuddyList(evt.eventData);
					this._notify("onBuddyListLoad");
				}else if(evt.type == "presence"){
					this._presenceChanged(evt.eventData);
				}else if(evt.type == "im" || evt.type == "offlineIM"){
					var imData = evt.eventData;
					var buddyAimId = imData.aimId || imData.source.aimId;
					// map phone number to screenname
					if (this.phones[buddyAimId])
						buddyAimId = this.phones[buddyAimId];

					if (evt.type == "offlineIM")
						imData.message = aim.string.substituteParams(this.strings.IM_Notice_OfflineIM, aim.date.timeAgo(imData.timestamp * 1000)) + " " + imData.message;

					if (imData.source) {	// Present only for im, not offlineIM
						//The im may not be from a buddy in the buddy list, but
						//that's OK, they just won't be associated with any groups.
						if(!this.buddies[buddyAimId]){
							this.buddies[buddyAimId] = imData.source;
						}else{
							//See if anything changed about the buddy.
							this._presenceChanged(imData.source);
						}
					}
					// check for ignored before accepting
					if (this.isBuddyAllowed(buddyAimId)){
						// strip out a div tag on msg that may been added by the host
						var im = {
							senderAimId: buddyAimId,
							message: imData.message,
							autoresponse: imData.autoresponse,
							timestamp: imData.timestamp
						};
	
						this._notify("onIm", im);
					}
				}else if(evt.type == "typing"){
					if (this.isBuddyAllowed(evt.eventData.aimId)){
						this._notify("onTypingChanged", {aimId: evt.eventData.aimId, status: evt.eventData.typingStatus});
					}
				}else{
					console.log("EVENT: " + dojo.toJson(evt));
				}
			}
		}
		
		if(keepFetching){
			this._fetchTimeoutId = setTimeout(this._fetchEvents, data.timeToNextFetch);
		}else{
			this._stopFetchEvents();
		}
	},

	_sessionEndResponse: function(/*Object*/data){
		//summary: callback for a sessionEnd request.
		this._notify("onSessionEnd");
		this.resetUserData();
	},

	_storeIm: function(/*String*/targetAimId, /*Object*/im){
		//summary: stores an message for an im session with the
		//buddy it is associated with. The im argument should be
		//an object with at least the following properties:
		//senderAimId: the message sender's aimId.
		//message: the message
		//autoresponse: boolean indicated if it is an autoresponse.
		//timestamp: timestamp of the message
		var buddy = this.buddies[targetAimId];
		if(!buddy){
			buddy = this.buddies[targetAimId] = {aimId: targetAimId, displayId: targetAimId};
		}
		if(!buddy["im"]){
			buddy.im = [];
		}						
		if(!buddy["groups"]){
			buddy.groups = [this._offlineGroupName];
		}						
		buddy.im.push(im);
	},

    _decodePresence: function(data){
	    if (data.awayMsg)
            data.awayMsg = data.awayMsg;
	    if (data.statusMsg)
            data.statusMsg = data.statusMsg;
    },
	
	_setStateResponse: function(/*Object*/data){
		//summary: handles server response for setState call.
        this._decodePresence(data.myInfo);
		this.user = data.myInfo;
		this._notify("onUserLoad");
	},

	_setStatusResponse: function(data){
	    this.user.statusMsg = this.tmpStatus;
        this._decodePresence(this.user);
		this._notify("onUserLoad");
	},

	_presenceChanged: function(/*Presence*/newPresence){
		//summary: Updated presence, and checks for presence changes.
		//If there are presence changes, notify listeners.
		var oldValues = null;
        this._decodePresence(newPresence);

		var presence = this.buddies[newPresence.aimId];
		if (newPresence.aimId == this.user.aimId)
			this.user = newPresence;

		if(!presence){
			presence = this.buddies[newPresence.aimId] = newPresence;
			//There are no old values, everything new. Still need
			//to notify in that case.
			oldValues = {};
		}else{
			for(var param in newPresence){
				if(!presence[param] || presence[param] != newPresence[param]){
					if(!oldValues){
						oldValues = {};
					}
					oldValues[param] = presence[param];
					presence[param] = newPresence[param];
				}
			}
			
			if (presence.awayMsg && !newPresence.awayMsg) {
				oldValues.awayMsg = presence.awayMsg;
				presence.awayMsg = null;
			}
			if (presence.statusMsg && !newPresence.statusMsg) {
				oldValues.statusMsg = presence.statusMsg;
				presence.statusMsg = null;
			}
		}
		
		presence.baseTime = new Date();

		//Notify listeners of any presence changes.
		if(oldValues){
			this._notify("onPresenceChanged", {
				aimId: newPresence.aimId,
				oldValues: oldValues
			});
		}
	},

	_stopFetchEvents: function(){
		clearTimeout(this._fetchTimeoutId);
		this._fetchTimeoutId = 0;
	},

	// errorType values:
	//   1		fatal, error should end session
	//   2		fatal, but retries are possible
	//   5		non-fatal, user should be informed (modal)
	//   6      non-fatal, user should be informed (non-modal)
	//   9		non-fatal, ignore or optional inform
	_call: function(/*String*/action, /*String or function*/callbackName, /*int*/errorType, /*Object*/args){
		//summary: private method to handle server requests.
		if(!args){
			args = {};
		}

		var url = "";
		if("fetchEvents" == action){
			url = this._fetchBaseUrl;
		}else if("auth/getToken" == action){
			url = this._snsUrl + action;
		}else{
			url = this._wimUrl + action;
		}
		if (url == null) {
			return;
		}

		if(this.useSsl){
			url = url.replace(/http\:/, "https:");
		}

		args.r = this._requestId++;
		args.k = this.apiKey;
		args.f = "json";
		if(this._token){
			args.a = this._token;
		}

		var timeoutSeconds = 7;
		if(args["timeout"]){
			timeoutSeconds += args.timeout / 1000;
		}
		
		dojo.io.script.get({
			url: url,
			callbackParamName: "c",
			content: args,
			load: dojo.hitch(this, "_loadResponse"),
			error: dojo.hitch(this, "_errorResponse"),
			timeout: timeoutSeconds * 1000,
			preventCache: true,
			_wimAction: action,
			_wimCall: callbackName,
			_wimErrorType: errorType
		});
	},

	_loadResponse: function(data, kwArgs){
		//summary: handles successful io callbacks.
		data = data.response;
		kwArgs = kwArgs.args;
		
		var status = data.statusCode;
		if(status== 200){
			if(kwArgs._wimCall){
				if (dojo.isFunction(kwArgs._wimCall))
					kwArgs._wimCall.apply(this, [data.data]);
				else
					this[kwArgs._wimCall](data.data);
			}
		}else if((status == 330 || status == 401 || status == 450) && data.data && data.data.redirectURL){
			this._waitingBindArgs = kwArgs;
			//alert(data.data.redirectURL + " :: " + kwArgs._wimAction);
			this._needAuth(data.data.redirectURL, kwArgs._wimAction);
		}else{
			this._notify("onError", {
				action: kwArgs._wimAction,
				statusCode: data.statusCode,
				statusText: data.statusText,
				params: kwArgs.content,
				errorType: kwArgs._wimErrorType,
				errorMsg: data.statusText
			});
			//Set type to error for further processing below.
			type = "error";
		}
	},
	
	_errorResponse: function(data, kwArgs){
		// handles failed io callbacks
		kwArgs = kwArgs.args;
		
		if (kwArgs._wimAction == "aim/startSession"){
			if (this._sessionFailures == 0) {
				this._sessionFailures++;
				this._restartSession();
				return;
			}
		}
		//If there was an error or timeout with endSession, be sure to
		//delete the user's data anyway.
		if(kwArgs._wimAction == "aim/endSession"){
			this.resetUserData();
			return;
		}

		if (data && data.dojoType == "timeout") {
			// retry thresholds
			if (kwArgs._wimAction == "fetchEvents") {
				if (++this._fetchFailures > 2){
					this._restartSession();
				}
				else{
					this._fetchTimeoutId = setTimeout(this._fetchEvents, 700);
				}
				return;
			}
			this._notify("onError", {
				errorType: kwArgs._wimErrorType,
				errorMsg: this.strings.Error_ActionTimedOut + kwArgs._wimAction
			});
		} else {
			this._notify("onError", {
				errorType: kwArgs._wimErrorType,
				errorMsg: data
			});
		}
	},

	_notify: function(/*String*/message, /*Object?*/data){
		//summary: Notifies listeners of a message.
		var notified = false;
		for(var i = 0; i < this.listeners.length; i++){
			var listener = this.listeners[i];
			if(listener[message]){
				listener[message](data);
				notified = true;
			}
		}

		if(!notified){
			console.log("aim.wim message: " + message + ", data: ", data);
		}
	},

	_needAuth: function(url, authAction){
		//Need to ask the user for some permissions.
		//Reset things first.
		this._redirectUrl = url;
		this._authAction = authAction;

		//Watch for auth response
		var _self = this;
		_self._currentHash = window.location.href.split("#")[1];
		this._authInterval = setInterval(function(){
			_self._watchAuth();
		}, 200);
		
		//Notify application that we need an auth window jump.
		if("auth/getToken" == authAction){
			this._notify("onNeedAuth");
		}else{
			this._notify("onNeedConsent");
		}
		//Launch the auth iframe
		//Does not work in Safari or Opera.
		//If we try to launch a new window here,
		//it is blocked by popup blockers.
		//this.launchAuth();	
	},

	_watchAuth: function(){
		//summary: watches for auth/consent callbacks.
		var fragId = window.location.hash;
		if(fragId && fragId != "#"){
			var statusIndex = "#AUTHDONE|#AUTHCANCEL|#CONSENTDONE|#CONSENTCANCEL|#CONSENTINVALIDTOKEN".indexOf(fragId);
			if(statusIndex != -1){
				clearTimeout(this._authInterval);
				this._authInterval = 0;
				if(this._currentHash){
					location.replace("#" + this._currentHash);
				}else{
					window.location.replace("#");
				}
				this._notify("onAuthConsentReceived");

				if(fragId == "#AUTHDONE" || fragId == "#CONSENTDONE"){
					dojo.io.script.get(this._waitingBindArgs);
				}else if(fragId == "#AUTHCANCEL"){
					this._notify("onAuthCancel");
				}else if(fragId == "#CONSENTCANCEL"){
					this._notify("onConsentCancel");
				}else if(fragId == "#CONSENTINVALIDTOKEN"){
					this._notify("onConsentInvalidToken");
				}else{
					this._notify("onError", this.strings.Error_InvalidAuthState + fragId);				
				}
			}
		}
	},
	
	_makeAuthUrl: function(url){
		return (this.useSsl ? url.replace(/http\:/, "https:") : url)
			+ (url.indexOf("?") == -1 ? "?" : "&")
			+ "k=" + this.apiKey
			+ (this.useOpenAuthMiniUi ? "&uiType=mini" : "")
			+ "&refresh=" + (new Date()).getTime()
			+ "&succUrl=" + encodeURIComponent(this.authPageUrl + "?authAction=" + encodeURIComponent(this._authAction));
	},

	getAuthUrl: function(){
		//summary: gets the auth URL (either sign-in or consent URL).
		return this._makeAuthUrl(this._redirectUrl);
	},

	launchAuth: function(){
		window.open(this.getAuthUrl(), "aimWimAuth", this.authWindowProps).focus();	
	},

	_unpackBuddyList: function(serverBuddyList){
		//summary: the buddy list data from the wim server
		//is an array of groups. and each group contains an array
		//of presence info for each buddy in the group. This makes
		//it hard to look up a buddies' info just by the buddy name.
		//This method makes a map of the buddy names
		//to allow easy buddy lookup. It also makes a list
		//of groups that the buddy is in. It attaches the info
		//in an "groups" property on the Presence type (see wim docs)
		//for the buddy. The Presence type is the data that is
		//returned when querying via buddy's aimId.
		if(serverBuddyList && serverBuddyList.groups){
			var oldBuddies = this.buddies;
			this.buddies = {};
			this.groups = [];

			//Create a special offline group that will contain all buddies
			var offlineGroup = {displayName: this.strings.BuddyList_Label_GroupOffline, name: this._offlineGroupName, buddies: [], isOfflineGroup: true};
			
			//Create the groups array and the buddies hashmap
			var blGroups = serverBuddyList.groups;
			for(var i = 0; i < blGroups.length; i++){
				var groupName = blGroups[i].name;	
				var buddies = blGroups[i].buddies;
				var budLength = buddies.length;
				
				// recent buddies is a fake group and needs to be localized 
				// (cannot be renamed)
				var displayGroupName = (groupName=="Recent Buddies") ? this.strings.BuddyList_Label_GroupRecentBuddies : groupName;
				
				//Add group to array.
				var newGroup = {
					displayName: displayGroupName,
					name: groupName,
					buddies: []
				};
				this.groups.push(newGroup);

				//Add buddy to hashmap and to the group's "buddies"
				//array.
				for(var j = 0; j < budLength; j++){
					var buddyName = buddies[j].aimId;
					var buddyEntry = this.buddies[buddyName];
					if(!buddyEntry){
						buddyEntry = this.buddies[buddyName] = buddies[j];
						buddyEntry.groups = [this._offlineGroupName];
						offlineGroup.buddies.push(buddyName);
						// keep any existing history
						if (oldBuddies[buddyName] && oldBuddies[buddyName]["im"])
							buddyEntry.im = oldBuddies[buddyName].im;
					}
					buddyEntry.baseTime = new Date();
					buddyEntry.groups.push(groupName);
					newGroup.buddies.push(buddyName);
				}
			}

			// Add "Offline" as the last group.
			offlineGroup.buddies = offlineGroup.buddies.sort();
			this.groups.push(offlineGroup);
		}
	},

	_discardResponse: function(){
		//summary: just a function to use when we do not care about
		//the server response (errors will be handled in the _call
		//method).
	},

	_wimUrl: "http://api.oscar.aol.com/",
	_snsUrl: "https://api.screenname.aol.com/",
	_token: null,
	_tokenExpiresIn: 0,
	_startAfterToken: true,
	_aimsid: null,
	_fetchBaseUrl: null,
	_requestId: 1,
	_fetchFailures: 0,
	_sessionFailures: 0,
	_signOutWindowProps: "width=100,height=100",
	lastIMStatusCode: 0,
	_offlineGroupName: "Offline",
	//A fake aimId to be used for system messages.
	_systemAimId: ">>$y$tem<<"
};


//
// Idle monitor
//
aim.wim.listeners.push({
	onSessionStart: function() {
		this.mouseMoveHandler = dojo.connect(dojo.body(), "onmousemove", this, "onMouseMove");
		clearInterval(this.updateInterval);
		this.updateInterval = setInterval(dojo.hitch(this, "updateIdleState"), 60000);
		this.lastActivity = new Date();
		this.lastStateToken = "online";
	},
	
	onSessionEnd: function() {
		clearInterval(this.updateInterval);
		dojo.disconnect(this.mouseMoveHandler);
		clearInterval(this.updateInterval);
	},
	
	onMouseMove: function() {
		this.lastActivity = new Date();
		
		// If user was idle, update immediately.
		if (this.lastStateToken != "online")
			this.updateIdleState();
	},
	
	updateIdleState: function() {
		if (!aim.settings.chatShowIdleTime || (aim.wim.user == null))
			return;
			
		var state = aim.wim.user.state;
		if (state == "invisible" || state == "away")
			return;
			
		var idleTime = Math.round(((new Date()) - this.lastActivity) / 1000);
		var isIdle = (idleTime > 15*60);
		var stateToken = isIdle ? this.lastActivity : "online";
		
		// Make a setState call to the server only if the state is different
		// from the last time we did a setState.
		if (stateToken != this.lastStateToken) {
			aim.wim.setState(isIdle ? "idle" : "online", null, idleTime);
			this.lastStateToken = stateToken;
		}
	}
});

//
// Debug listener
//
if(dojo.config.aimUseDebugListener){
	aim.wim.listeners.push({
		onError:			function(data)	{ console.log("wim.onError:", data); console.log(dojo.toJson(data)); },
		onAuthCancel:		function()		{ console.log("wim.onAuthCancel"); },
		onConsentCancel:	function()		{ console.log("wim.onConsentCancel"); },
		onUserLoad:			function()		{ console.log("wim.onUserLoad:", aim.wim.user); },
		onSessionStart:		function()		{ console.log("wim.onSessionStart"); },
		onSessionEnd:		function()		{ console.log("wim.onSessionEnd"); },
		onBuddyListLoad:	function()		{ console.log("wim.onBuddyListLoad:", aim.wim.buddies); },
		onIm:				function(data)	{ console.log("wim.onIm:", data); },
		onPresenceChanged:	function(data)	{ console.log("wim.onPresenceChanged:", data, "new value:", aim.wim.buddies[data.aimId]); },
		onTypingChanged:	function(data)	{ console.log("wim.onTypingChanged:", data); }
	});
}
