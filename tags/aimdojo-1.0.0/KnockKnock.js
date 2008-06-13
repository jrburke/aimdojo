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
dojo.provide("aim.KnockKnock");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.LayoutContainer");
dojo.require("aim.wim");
dojo.require("aim.string");
dojo.require("aim.widget.Pane");
dojo.require("aim.widget.AimButton");
dojo.require("aim.widget.AimToolbar");

dojo.declare("aim.KnockKnock", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "KnockKnock.html"),
	widgetsInTemplate: true,
	
	buddyAimId: "",
	
	startup: function() {
		this.promptNode.innerHTML = aim.string.substituteParams(this.strings.KnockKnock_Label_Prompt, "<span class='sn'>" + aim.wim.getDisplayId(this.buddyAimId) + "</span>");
	},
	
	onClickAccept: function() {
		aim.wim.acceptedBuddies[this.buddyAimId] = true;
	},
	
	onClickDecline: function() {
		aim.wim.declinedBuddies[this.buddyAimId] = true;
	},

	onClickBlock: function() {
		aim.wim.blockBuddy(this.buddyAimId);
	}
});
