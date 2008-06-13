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

dojo.provide("aim.widget.BuddyIcon");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.presence");

dojo.declare("aim.widget.BuddyIcon", [aim._AimTemplatedWidget], {
	contact: null,
	size: 48,	// can be 32, 48, or 64
	borderSize: 1,
	templateString:
		'<div class="buddyIcon" style="height: ${size}px; width: ${size}px; position: relative;">' +
		'	<img src="${spacer}" dojoAttachPoint="defaultIcon" class="defaultIcon" style="border: ${borderSize}px solid #85817c; height: ${size}px; width: ${size}px;">' +
		'	<img src="${spacer}" dojoAttachPoint="icon" dojoAttachEvent="onload: onLoad, onclick: onClick, onerror: onError" style="border: ${borderSize}px solid #85817c; display: none; background-color: #FFFFFF; width: ${size}px; height: ${size}px; position: absolute;">' +
		'</div>',
	
	postCreate: function() {
		this.defaultIcon.style.backgroundPosition = {
			"32": "-45px -30px",
			"48": "-90px -30px",
			"64": "-150px -30px"
		}[this.size];
	},
		
	show: function(contact) {
		this.contact = contact;
		this.icon.style.display = "none";
		var url = aim.presence.getBuddyIconUrl(contact);
		this.showIcon = (url != null);
		if (url)
			this.icon.src = url;		
	},
	
	onLoad: function() {
		if (this.showIcon)
			this.icon.style.display = "";
	},
	
	onClick: function()	{
		var screenName = aim.presence.getScreenNameForContact(this.contact);
		if (screenName)
			aim.presence.launchIM(screenName);
	},
	
	onError: function() {
		// Go back to the default icon if the buddy icon failed to load
		this.icon.style.display = "none";
	}
});


