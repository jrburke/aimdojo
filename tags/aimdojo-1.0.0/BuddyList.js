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
dojo.provide("aim.BuddyList");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.html");
dojo.require("aim.dom");
dojo.require("aim.date");
dojo.require("aim.wim");
dojo.require("aim.EditGroupCard");
dojo.require("aim.sound");
dojo.require("aim.widget.BuddyIcon");
dojo.require("aim.widget.HoverCardManager");
dojo.require("aim.settings");

dojo.declare("aim.BuddyList", [aim._AimTemplatedWidget], {
	templateString:
		'<div class="buddyList">' +
		'	<div dojoAttachPoint="buddyListDisplay"></div>' +
		'	<div dojoAttachPoint="noMatchesNode" class="noMatches" style="display: none;">${strings.NoMatchesFound}</div>' +
		'</div>',

	buddyListDisplay: null,
	htmlIdMap: {},
	
	//Properties that affect where and how the buddy hover card is positioned.
	hoverCardOrient: {'TL': 'TR'},
	hoverCardPointerSide: "right",
	hoverCardPointer: "hidden",
	hoverCardPadding: [aim.widget.pointerWidth, -27],
	hoverCardManager: null, //Initialized after widget created.

	//Allow adding other actions to the hover card. Array items
	//should be objects with a "node" and "action" properties.
	//"node" should be a DOM node of a DIV that has "actionLink" as 
	//one of the CSS classes on it. "action" should be a function
	//reference. This function will be attached to the BuddyListHoverCard
	//instance, so the "this" inside that function will be the BuddyListHoverCard
	//instance. The function can use this.aimId to get the aimId of the
	//currently displayed buddy in the HoverCard.
	hoverCardActions: [],

	//Start aim.wim.listener methods			
	onSessionEnd: function(){
		this._setOffline();
	},

	onBuddyListLoad: function(){
		var groups = aim.wim.groups;
		var html = ["<ul class='groupList'>"];
		if(groups){
			for(var i = 0; i < groups.length; i++){
				html.push(this._getGroupHtml(groups[i]));
			}
		}
		html.push("</ul>");

		this.buddyListDisplay.innerHTML = html.join("");
		this.renderOfflineGroup();
		this.attachGroupEvents();
	},

	attachGroupEvents: function(){
		var ctrls = dojo.query(".groupTitle", this.buddyListDisplay);
		for (var i=0; i<ctrls.length; i++){
			dojo.connect(ctrls[i], "onmouseover", dojo.hitch(this, this.onMouseOverItem, ctrls[i]));
			dojo.connect(ctrls[i], "onmouseout", dojo.hitch(this, this.onMouseOutItem, ctrls[i]));
		}
	},

	onMouseOverItem: function(item)
	{	
		dojo.addClass(item, "groupItemHover");
		var ctrls = dojo.query(".groupEdit", item);
		if (ctrls.length > 0)
			ctrls[0].style.display = "";
	},
	
	onMouseOutItem: function(item)
	{
		dojo.removeClass(item, "groupItemHover");
		var ctrls = dojo.query(".groupEdit", item);
		if (ctrls.length > 0)
			ctrls[0].style.display = "none";
	},
	
	onPresenceChanged: function(data){
		this.updateBuddy(data.aimId, data.oldValues);
	},

	onGroupRemoved: function(){
		dojo.publish("AimFeedbackStart", [this.strings.IM_Notice_GroupDeleted, true]);
	},

	onGroupRenamed: function(){
		dojo.publish("AimFeedbackStart", [this.strings.IM_Notice_GroupRenamed, true]);
	},

	onBuddyAdded: function(){
		dojo.publish("AimFeedbackStart", [this.strings.IM_Notice_BuddyAdded, true]);
	},

	onBuddyRemoved: function(){
		dojo.publish("AimFeedbackStart", [this.strings.IM_Notice_BuddyDeleted, true]);
	},
	//End aim.wim.listener methods
	
	startup: function(){
		// Workaround Dojo bug 5252: startup gets called twice
		if (this._started) return;
		this._started = true;
		
		this._setOffline();
		aim.wim.listeners.push(this);
		dojo.subscribe("aimWimGroupNodeClicked", this, "groupNodeClicked");
		dojo.subscribe("aimWimGroupNodeEdit", this, "groupNodeEdit");
		dojo.subscribe("aimWimBuddyNodeClicked", this, "buddyNodeClicked");
		
		var _self = this;
		this.hoverCardManager = new aim.widget.HoverCardManager(
			this.buddyListDisplay,
			aim.BuddyListHoverCard,
			"buddy",
			{
				buddyList: this,
				hoverCardActions: this.hoverCardActions
			},
			function(hoverNode){
				var aimId = _self.htmlIdMap[hoverNode.id].aimId;
				var buddy = aim.wim.buddies[aimId];
				return true;
			},
			{
				hoverCardOrient: this.hoverCardOrient,
				hoverCardPointerSide: this.hoverCardPointerSide,
				hoverCardPointer: this.hoverCardPointer,
				hoverCardPadding: this.hoverCardPadding
			}
		);

		// Suppress context menu
		dojo.connect(this.domNode, "oncontextmenu", function(e) { e.stopPropagation(); e.preventDefault(); });
	},

	groupNodeClicked: function(/*DOMNode*/domNode){
		//summary: handles a click on a group.
		
		//Get the containing list element so we can figure
		//out if we should expand or contract the list containing
		//the buddies.
		var groupItemNode = aim.dom.findAncestorByClass(domNode, "groupItem");
		if (!groupItemNode) {
			return;
		}
		//Open/close list of buddies
		var groupBuddiesNodes = dojo.query(".buddiesList", groupItemNode, "ul");
		if(groupBuddiesNodes[0]){
			dojo.toggleClass(groupBuddiesNodes[0], "buddiesCollapsed");
		}

		//Update the twisty image next to the group name.
		var twistyImgNodes = dojo.query(".groupTwisty", groupItemNode);
		if(twistyImgNodes){
			dojo.toggleClass(twistyImgNodes[0], "groupTwistyClosed");
		}
	},

	groupNodeEdit: function(/*DOMNode*/domNode){
		if (!this.editGroupCard) {
			this.editGroupCard = new aim.EditGroupCard();
			this.editGroupCard.startup();
		}
		this.editGroupCard.setGroup(this.htmlIdMap[domNode.parentNode.parentNode.id].groupName);
		aim.widget.popup({
			popup: this.editGroupCard,
			around: domNode,
			orient: {TL: "TL"},
			padding: [10, 10]
		});
	},

	renderOfflineGroup: function() {
		var offlineName = aim.wim._offlineGroupName;
		var offlineHtmlId = this.makeHtmlId(offlineName);
		if (dojo.byId(offlineHtmlId + "-buddiesList")) return;
		
		//Get the offline group data model.
		var groups = aim.wim.groups;
		var idx = aim.lang.findByProp(groups, "name", offlineName);
		var offlineGroup = groups[idx];

		//Get the HTML for the buddies and add to the DOM.
		var buddyHtml = this._getBuddiesHtml(offlineGroup.buddies, offlineGroup, true);
		dojo.byId(offlineHtmlId).innerHTML += buddyHtml;
	},

	buddyNodeClicked: function(/*DOMNode*/domNode){
		//summary: handles clicks from buddy DOM nodes.
		var buddyInfo = this.htmlIdMap[domNode.parentNode.id];
		var data = {
			groupName: buddyInfo.groupName,
			aimId: buddyInfo.aimId,
			useSMS: false
		};
		dojo.publish("aimWimBuddyClicked", [buddyInfo]);
	},

	_getGroupHtml: function(/*Object*/group){
		//summary: generates the HTML for a group.
		var html = [];
		var buddies = group.buddies;
		var groupid = this.makeHtmlId(group.name);
		html.push(
			'<li class="groupItem" id="' 
				+ groupid
				+ '"><h2 class="groupTitle"><a href="#" id="' 
				+ groupid
				+ '-groupLink" onclick="dojo.publish(\'aimWimGroupNodeClicked\', [this]); return false;">',
			'<img class="groupTwisty', (group.isOfflineGroup ? ' groupTwistyClosed' : ''), '" src="' + this.spacer + '" border="0"/> ',
				aim.string.escapeXml(group.displayName),
			'</a>' + (aim.wim.isEditableGroup(group.name)?'<span class="groupEdit aimLink" onclick="dojo.publish(\'aimWimGroupNodeEdit\', [this]); return false;" style="display: none;">'+this.strings.Label_GroupEdit+'</span>':"") +
			'</h2>'
		);
		if(!group.isOfflineGroup){
			html.push(this._getBuddiesHtml(buddies, group, group.isOfflineGroup));
		}
		html.push('</li>');

		return html.join("");
	},

	_getBuddiesHtml: function(/*Array*/buddies, /*Object*/group, /*boolean*/isClosed){
		var html = [];
		if(buddies){
			var buddyObjects = aim.wim.buddies;
			html.push('<ul id="' 
				+ this.makeHtmlId(group.name)
				+ '-buddiesList" class="buddiesList '
				+ (group.isOfflineGroup ? " offlineGroup" : "")
				+ (isClosed ? " buddiesCollapsed" : "")
				+ '">');
			for(var i = 0; i < buddies.length; i++){
				var buddyObject = buddyObjects[buddies[i]];
				html.push(this._getBuddyHtml(buddyObject, group));
			}
			html.push('</ul>');
		}
		return html.join("");
	},

	_getBuddyHtml: function(/*Object*/buddy, /*Object*/group){
		//summary: generates the HTML for a buddy in a group.
		return [
			'<li id="', this.makeHtmlId(group.name, buddy.aimId), '" class="buddy ', this.makePresenceStyle(buddy), '">',
			'<a href="#" onclick="dojo.publish(\'aimWimBuddyNodeClicked\', [this]); return false;">',
				'<img src="', this._getMiniIconUrl(buddy), '" class="icon" align="absmiddle" onerror="aim.BuddyList.prototype.miniIconFailed(this, \'',
				buddy.aimId, '\')">',
				'<span class="name">', aim.string.escapeXml(buddy.displayId), '</span>',
			'</a></li>'
		].join("");
	},

	updateBuddy: function(aimId, oldValues) {
		//summary: update the buddy's entries in every group he belongs to, based
		//		   on the latest presence info
		var buddy = aim.wim.buddies[aimId];
		var isOfflineClosed = this._isGroupClosed(aim.wim._offlineGroupName);

		dojo.forEach(buddy.groups || [], function(groupName) {
			if(groupName != aim.wim._offlineGroupName || !isOfflineClosed) {
				var node = dojo.byId(this.makeHtmlId(groupName, aimId));
				var qfcls = "";
				if (node.className.match(/buddyMatched/i) != null) {
					qfcls = "buddyMatched ";
				}
				node.className = "buddy " +qfcls+ this.makePresenceStyle(buddy);
				
				var nameNode = dojo.query(".name", node)[0];
				nameNode.innerHTML = buddy.displayId;

				dojo.query(".icon", node)[0].src = this._getMiniIconUrl(buddy);
			}
		}, this);

		if (aim.settings.chatSoundSignin && buddy.state == "online" && 
			oldValues.state && oldValues.state == "offline") {
			aim.sound.play(aim.settings.baseSoundUrl + "dooropen.mp3");
		}
		else if (aim.settings.chatSoundSignout && buddy.state == "offline" 
				 && oldValues.state && oldValues.state == "online") {
			aim.sound.play(aim.settings.baseSoundUrl + "doorslam.mp3");
		}
	},

	_getMiniIconUrl: function(/*Object*/buddy){
		//See miniIconFailed() for icon precedence.
		return ((buddy.state == "online") && aim.wim.isBuddyAllowed(buddy.aimId)) ?
			"http://api.oscar.aol.com/expressions/get?type=miniIcon&f=redirect&t=" + buddy.aimId
		:
			this.spacer;
	},

	miniIconFailed: function(/*DOMNode*/node, /*String*/aimId){
		//summary: The buddy icon in the buddy list is determined in this order:
		// 1) Use the getExpression API through WIM to get the 'miniIcon'. Sometimes this
		//    returns an error if it is a "custom" buddy icon, like the ones set through ichat
		// 2) Use the presence info's buddyIcon. This is a larger image that will be scaled down
		//    to 16x16. It might not look so good, but at least we show something. We do not use
		//    this icon as the very first option since it could be an animated gif and because of the
		//    scaling issues.
		// 3) The generic "online" presence icon.
		// 4) A transparent image.
		var buddy = aim.wim.buddies[aimId];
		if(node.src.indexOf("/get?") != -1 && buddy && buddy.buddyIcon){
			//getExpression API failed. Try scaled down buddy icon.
			node.src = buddy.buddyIcon;
		}else if(node.src.indexOf("/getAsset") != -1){
			//buddy.buddyIcon failed. Try the generic image.
			//Actually, just use spacer image since we know the path.
			node.src = this.spacer;
		}else{
			//last resort, a transparent image.
			node.src = this.spacer;
		}
	},

	makePresenceStyle: function(buddy){
		var presenceState = aim.wim.isBuddyAllowed(buddy.aimId) ? buddy.state : "blocked";
		return "buddy-" + presenceState;
	},
	
	makeHtmlId: function(/*String*/groupName, /*String*/buddyAimId){
		// convert non-word chars to codes
		function subCharCodes(match){
			return ("_" + match.charCodeAt(0).toString());
		}
		newBuddyAimId = (buddyAimId || "").toLowerCase().replace(/\W/g, subCharCodes);
		newGroupName = (groupName || "").toLowerCase().replace(/\W/g, subCharCodes);
		var htmlId = "aimWim-" + newGroupName + "-" + newBuddyAimId;
		this.htmlIdMap[htmlId] = {
			groupName: groupName,
			aimId: buddyAimId
		};
		
		return htmlId;
	},

	_isGroupClosed: function(/*Object*/groupName){
		//summary: Determines whether the group is opened or closed in the UI.
		//Use the group's name (not displayName) as input.
		//If the dom node does not exist, then true is returned.
		var node = dojo.byId(this.makeHtmlId(groupName) + "-buddiesList");
		var result = !node;
		if(node){
			result = dojo.hasClass(node, "buddiesCollapsed");
		}
		return result;
	},

	_setOffline: function(){
		this.buddyListDisplay.innerHTML = "";
	},

	quickFind: function(searchString) {
		searchString = searchString.toLowerCase().replace(/\s/g, "");
		dojo.toggleClass(this.domNode, "buddyListQuickFind", !!searchString);
		
		if (!searchString) {
			this.buddyListDisplay.style.display = "";
			this.noMatchesNode.style.display = "none";
			return;
		}
		
		var anyMatch = false;
		
		dojo.forEach(aim.wim.groups, function(grp) {
			grp.quickFindMatch = false;
		});
		
		var nodes = dojo.filter(this.buddyListDisplay.getElementsByTagName("li"), function(node) {
			return (node.className.indexOf("buddy") != -1);
		});
		
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var info = this.htmlIdMap[node.id];
			var group = aim.wim.getGroup(info.groupName);
			var match = (info.aimId.indexOf(searchString) != -1);
			dojo.toggleClass(node, "buddyMatched", match);
			var isOffline = aim.wim.buddies[info.aimId].state == "offline";
			var show = group.isOfflineGroup ? isOffline : !isOffline;
			group.quickFindMatch = group.quickFindMatch || (match && show);
			anyMatch = anyMatch || (match && show);
		}
		
		nodes = dojo.filter(this.buddyListDisplay.getElementsByTagName("li"), function(node) {
			return (node.className.indexOf("groupItem") != -1);
		});
		
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var info = this.htmlIdMap[node.id];
			var group = aim.wim.getGroup(info.groupName);
			dojo.toggleClass(node, "groupItemMatched", group.quickFindMatch);
		}
		
		aim.html.setShowing(this.buddyListDisplay, anyMatch);
		aim.html.setShowing(this.noMatchesNode, !anyMatch);
	}
});


dojo.declare("aim.BuddyListHoverCard", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "BuddyListHoverCard.html"),
	widgetsInTemplate: true,

	buddyInfoWindowOptions: "width=600,height=500,menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes",

	manager: null,
	buddyList: null,
	
	//See comments in aim.BuddyList widget
	hoverCardActions: [],
	
	startup: function() {
		if(!aim.settings.enableDeleteBuddy){
			this.deleteLink.style.display = "none";
		}
		
		for(var i= 0; i < this.hoverCardActions.length; i++){
			var actionItem = this.hoverCardActions[i];
			
			//Attach action to HoverCard
			this["actionItemClick" + i] = actionItem.action;
			
			//Bind action to onclick on dom node
			dojo.connect(actionItem.node, "onclick", this, "actionItemClick" + i);

			//Add DOM node to action list.
			this.actionLinkNode.appendChild(actionItem.node);
		}
	},
	
	populate: function(hoverNode) {
		this.aimId = this.buddyList.htmlIdMap[hoverNode.id].aimId;
		this.groupName = this.buddyList.htmlIdMap[hoverNode.id].groupName;
		var buddy = aim.wim.buddies[this.aimId];
		var blocked = aim.wim.blockedBuddies[this.aimId];

		this.buddyIcon.show({screenName: this.aimId});
		
		aim.html.setInnerText(this.screenNameNode, buddy.displayId);
		if (blocked){
			dojo.addClass(this.offlineIndicator, "blockedIndicator");
			aim.html.setInnerText(this.offlineIndicator, this.strings.BuddyStatus_Label_Blocked);
		}
		else{
			dojo.removeClass(this.offlineIndicator, "blockedIndicator");
			aim.html.setInnerText(this.offlineIndicator, this.strings.BuddyStatus_Label_Offline);
		}
		aim.html.setShowing(this.offlineIndicator, buddy.state == "offline" || blocked);
		
		aim.html.setShowing(this.onlineTimeContainer, buddy.onlineTime > 0);
		if (buddy.onlineTime) {
			var onlineTime = buddy.onlineTime + ((new Date() - buddy.baseTime) / 1000);
			aim.html.setInnerText(this.onlineTimeNode, aim.date.readableDuration(onlineTime));
		}
		
		aim.html.setShowing(this.idleTimeContainer, buddy.idleTime > 0);
		if (buddy.idleTime) {
			var idleTime = (buddy.idleTime * 60) + ((new Date() - buddy.baseTime) / 1000);
			aim.html.setInnerText(this.idleTimeNode, aim.date.readableDuration(idleTime));
		}
		
		aim.html.setShowing(this.awayMessageNode, !!buddy.awayMsg || !!buddy.statusMsg);
		var msg = buddy.awayMsg || buddy.statusMsg || "";
		this.awayMessageNode.innerHTML = aim.wim.replaceMsgTokens(msg);
		aim.html.targetLinksToNewWindow(this.awayMessageNode);
		
		var isBlocked = aim.wim.blockedBuddies[this.aimId];
		aim.html.setShowing(this.blockLink, !isBlocked);
		aim.html.setShowing(this.unblockLink, isBlocked);
		
		if(!aim.settings.showMobileIcon)
			this.mobileLink.style.display = "none";
			
		return true;
	},

	onClickBuddyInfo: function(evt) {
		var url = aim.wim.getBuddyInfoUrl(this.aimId);
		if(this.buddyInfoWindowOptions){
			window.open(url, "aimBuddyInfo", this.buddyInfoWindowOptions).focus();
		}else{
			window.open(url, "aimBuddyInfo").focus();
		}

		this.hide();
	},

	onClickBlock: function(evt) {
		aim.wim.blockBuddy(this.aimId);
		this.hide();
	},

	onClickUnblock: function(evt) {
		aim.wim.unblockBuddy(this.aimId);
		this.hide();
	},

	// deleting someone from the offline group means deleting from all the groups they are in	
	onClickDelete: function(evt) {
		var _self = this;
		aim.widget.Dialogs.yesNo(
			aim.string.substituteParams(this.strings.DeleteBuddy_Label, aim.wim.buddies[this.aimId].displayId),
			dojo.hitch(this, function(yes) {
				if (yes){
					if (_self.groupName == "Offline") {
						dojo.forEach(aim.wim.buddies[_self.aimId].groups, function(grp) {
							if (grp != "Offline")
								aim.wim.removeBuddy(_self.aimId, grp);
						})
					}
					else
						aim.wim.removeBuddy(_self.aimId, _self.groupName);
				}
			})
		);
		this.hide();
	},
	
	sendMail: function() {
		if(this.aimId) {
			var aimId = this.aimId;
			console.log("TODO: sendMail not implemented.");
		}	
		this.manager.close();
	},
	
	sendIM: function() {
		var buddyInfo = {
			aimId: this.aimId,
			useSMS: false
		}
		dojo.publish("aimWimBuddyClicked", [buddyInfo]);
		this.manager.close();
	},
	
	sendSMS: function() {
		var buddyInfo = {
			aimId: this.aimId,
			useSMS: true
		}
		dojo.publish("aimWimBuddyClicked", [buddyInfo]);
		this.manager.close();
	}
});