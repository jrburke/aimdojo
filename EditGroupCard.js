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
dojo.provide("aim.EditGroupCard");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.html");
dojo.require("aim.wim");
dojo.require("aim.widget.Dialogs");
dojo.require("aim.widget.util");

dojo.declare("aim.EditGroupCard", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "EditGroupCard.html"),
	widgetsInTemplate: true,
	
	setGroup: function(group) {
		 this._group = group;
	},

	onOpen: function() {
		aim.widget.dropShadow(this.domNode);
		
		var idx = aim.lang.findByProp(aim.wim.groups, "name", this._group);
		var group =  aim.wim.groups[idx];
		if (group){
			var countTxt = aim.string.substituteParams(this.strings.IM_Group_Buddycount, group.buddies.length);
			aim.html.setInnerText(this.buddyCount, countTxt);
		}

		this.groupNameTextbox.focus();
		this.groupNameTextbox.value = this._group;
		aim.html.selectInputText(this.groupNameTextbox);
		
		aim.widget.fixFFCursor(this.inputDiv);
	},

	onClickCloseButton: function(evt) {
		aim.widget.popup.close(this);
	},

	onClickCancelButton: function(evt) {
		aim.widget.popup.close(this);
	},

	onClickSaveButton: function(evt) {
        if (aim.lang.encode(this.groupNameTextbox.value).length > 48){
			aim.widget.Dialogs.ok(aim.string.substituteParams(this.strings.AddGroup_Label_GroupNameTooLong));
			return;
        }
		if (this.groupNameTextbox.value != this._group)
			aim.wim.renameGroup(this._group, this.groupNameTextbox.value);
		aim.widget.popup.close(this);
	},

	onClickDelete: function(evt) {
		var idx = aim.lang.findByProp(aim.wim.groups, "name", this._group);
		var group =  aim.wim.groups[idx];
		aim.widget.Dialogs.yesNo(
			aim.string.substituteParams(this.strings.DeleteGroup_Label, this._group, group.buddies.length),
			dojo.hitch(this, function(yes) {
				if (yes){
					aim.wim.removeGroup(this._group);
				}
			})
		);
		aim.widget.popup.close(this);
	}
});