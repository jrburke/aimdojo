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
dojo.provide("aim.presence");

dojo.require("dojo.io.iframe");
dojo.require("dojo.io.script");
dojo.require("aim.string");
dojo.require("aim.widget.Dialogs");
dojo.require("aim.wim");
dojo.require("aim.settings");
dojo.require("dojo.i18n");

dojo.requireLocalization("aim", "strings");

aim.presence = {
	getBuddyIconUrl: function(contact, skipONS) {
		var screenName = aim.presence.getScreenNameForContact(contact, skipONS);
					  
		if (screenName)
			return "http://api.oscar.aol.com/expressions/get?k=" + encodeURIComponent(aim.wim.apiKey) + "&type=buddyIcon&f=native&t=" + encodeURIComponent(screenName);
		else
			return null;
	},

	getPresenceIconForScreenName: function (screenName, url) {
		var theUrl = url || "http://api.oscar.aol.com/presence/icon?k=" + encodeURIComponent(aim.wim.apiKey) + "&emailLookup=1&notFound=1&t=" + encodeURIComponent(screenName); 
		return aim.string.substituteParams("<a href=\"#\"><img align='absmiddle' src=\"{0}\" border=\"0\"></a>",theUrl);	
	},

	getPresenceIconUrl: function(presenceState) {		
		var url = aim.settings.basePresenceIconUrl;
		switch(presenceState) {
			case 1: /*online*/
				url += "online.gif";
				break;
			case 2: /*offline*/
				url += "offline.gif";
				break;
			case 5: /*idle*/
				url += "idle.gif";
				break;
			case 6: /*away*/
				url += "away.gif";
				break;
			case 7: /*mobile1way*/
				url += "mobile.gif";
				break;
			case 8: /*mobile2way*/
				url += "mobile.gif";
				break;
			default:
				url = "about:blank";
		}
		return url;
	},	
	
	ableToGetIM: function(presenceState){
		return (presenceState == 1 || presenceState == 5 || presenceState == 6 || presenceState == 7 || presenceState == 8);
	},
	
	getPresenceIcon: function(contact) {	        
		var screenName = aim.presence.getScreenNameForContact(contact);
		
		if (screenName)	{
			return this.getPresenceIconForScreenName(screenName);
		} else {
			return "&nbsp;";
		}
	},

	getScreenNameForContact: function(contact, skipONS) {
		// We'll pick the screen name according to this priority:
		//  1) If a screenName is explicitly listed, use it.
		//  2) If any of the email addresses is from a known domain like
		//     aol.com, aim.com, aol.fr, use the username of the that address.
		//  3) Use a whole email address (could be an ONS/PD account).
		var ret = contact.screenName ||
			   aim.presence.getScreenNameForAddress(contact.email) ||
			   aim.presence.getScreenNameForAddress(contact.email1) ||
			   aim.presence.getScreenNameForAddress(contact.email2);
		
		if (!skipONS)
			ret = ret || contact.email || contact.email1 || contact.email2;
			
		return ret;
	},
	
	knownDomains: ['aol.com', 'aim.com', 'aol.de', 'aol.ca', 'aol.co.uk', 'aol.fr'],

	getScreenNameForAddress: function(address) {
		var info = aim.presence.parseEmailAddress(address);
		if (info && dojo.indexOf(this.knownDomains, info.domain) != -1)
			return info.name;
		else
			return null;
	},
	
	_launchIM: function(sn, useSMS) {
		this.launchAIMPanel(sn, useSMS);
	},
	
	launchIM: function(snOrEmail, isONS, useSMS) {	
		// If we're given an email address, and it's not known to be an ONS screen
		// name, then perform a screen name lookup.
		if((snOrEmail.indexOf('@') >= 0) && !isONS) {
			var args = {};
			args.load = dojo.hitch(this, function(data) {
				if(!useSMS) {
					if(data.presenceState == 3)
						aim.widget.Dialogs.ok(snOrEmail + " " + this.strings.NoAIMAccount);
					else if(data.presenceState == 4)
						aim.widget.Dialogs.ok(this.strings.ErrorIMServer);		
					else 
						this._launchIM(data.screenName, useSMS);
				}else
					this._launchIM("", useSMS);					
			});
			args.content = {email: snOrEmail};
			this.getScreenNameFromEmail(args);
		}else {
			this._launchIM(snOrEmail, useSMS);
		}
	},

	// if noMessage=true, don't create an IM, just load the aim panel
	// if refresh=true, refresh the window with history changes
	launchAIMPanel: function(sn, sms, noMessage, refresh) {
		// If the panel is already signed on, just open an IM window.
		var panel = dijit.registry.byClass("aim.ImPanel").first();
		if (panel) {
			if (!noMessage) {
				panel.openIm({aimId: sn, useSMS: sms});
			}
			if (refresh){
				panel.refreshWindow(sn);
			}
		}
	},

	// Given an email address, extract the name and domain.
	parseEmailAddress: function (address) {
		if ((address == null) || (address == ""))
			return null;

		var name = "";
		var domain = "";

		// Split the address into "name" and "domain"
		var matchArray = address.match(/(.*)@(.*)/);
		if ((matchArray != null) && (matchArray.length == 3)) 
		{
			name = matchArray[1];
			domain = matchArray[2];

			if(name  != null) {
				name = name.replace(/\/M/gi, "");
				name = name.replace(/\/A/gi, "");
			}
			
			if (domain != null)
				domain = domain.toLowerCase();
		}

		return {name: name, domain: domain};
	},
	
	getScreenNameFromEmail: function(args) {
		console.log("TODO: getScreenNameFromEmail not implemented.");
	},

	getPresence: function(kwArgs) {
		var args = {
			f: "json", 
			k: aim.wim.apiKey, 
			t: kwArgs.users
		};
		dojo.io.script.get({
			url: "http://api.oscar.aol.com/presence/get",
			callbackParamName: "c",
			content: args,
			load: kwArgs.load,
			error: function(data) {
				console.log("getPresence error:", data);
				if (kwArgs.error) kwArgs.error();
			},
			timeout: kwArgs.timeout,
			preventCache: true
		});
	}
};

dojo.addOnLoad(function(){
	aim.presence.strings = dojo.i18n.getLocalization("aim", "strings");
	
});
