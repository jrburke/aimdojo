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
dojo.provide("aim.AddBuddyCard");

dojo.require("aim._AimTemplatedWidget");
dojo.require("aim.html");
dojo.require("aim.wim");
dojo.require("aim.string");

dojo.declare("aim.AddBuddyCard", [aim._AimTemplatedWidget], {
	templatePath: dojo.moduleUrl("aim.templates", "AddBuddyCard.html"),
	widgetsInTemplate: true,
	
	postCreate: function() {
		// do my stuff, then...
		this.inherited("postCreate", arguments);
	},

	onOpen: function() {
		aim.widget.dropShadow(this.domNode);
		
		this.screenNameTextbox.value = this.strings.AIM_ScreenName;
		this.screenNameTextbox.focus();

		var _self = this;
		this.groupSelect.updateMenu = function(){		
			var menuDef = [];
			dojo.forEach(aim.wim.groups, function(group) {
				if (aim.wim.isEditableGroup(group.name)){
					menuDef.push({
						caption: aim.string.escapeXml(group.displayName),
						onClick: dojo.hitch(_self, "setGroup", group.name, group.displayName)
					});
				}
			}, this);
			menuDef.push({separator: true});
			menuDef.push({caption: this.strings.Menu_AddGroup, _onClick: dojo.hitch(_self, "newGroup")});
			if (menuDef.length > 2){
				_self.setGroup(menuDef[0].caption, menuDef[0].caption);
			}
			this.setMenuDefinition(menuDef);
			this.createMenu();
		}		
		this.groupSelect.updateMenu();

		aim.html.selectInputText(this.screenNameTextbox);

		// not using aim.widget.fixFFCursor here
		// because it loses the selection, which we need
		if (dojo.isMoz){
			this.inputDiv.style.overflow = "hidden";
			aim.lang.setTimeout(this, function() {
				this.inputDiv.style.overflow = "auto";
				aim.html.selectInputText(this.screenNameTextbox);
			}, 0);
		}
		else
			aim.html.selectInputText(this.screenNameTextbox);
	},

	setGroup: function(name, dName){
		this._group = name;
		this.groupSelect.setLabel(dName);
	},

	setGroupCB: function(args){
		var grp = args.newName.substr(0, 48);
        if (aim.lang.encode(grp).length > 48){
			aim.widget.Dialogs.ok(aim.string.substituteParams(this.strings.AddGroup_Label_GroupNameTooLong));
			return;
        }
		var idx = aim.lang.findByProp(aim.wim.groups, "displayName", grp);
		if (idx != -1) {
			aim.widget.Dialogs.ok(aim.string.substituteParams(this.strings.AddGroup_Label_DuplicateGroupName, grp));
			return;
		}
		this.setGroup(grp, grp);
	},

	newGroup: function(evt){
		if (evt)
			evt.stopPropagation();

		var menu = this.groupSelect.menu;
		if(!menu) {
			 return;
		}  
		var items = menu.getChildren();
		this.newGroupMenu = items[items.length-1];
		this.newGroupMenu.hide();		 

		this.newGroupInputMenu = new aim.widget.AimInputableMenuItem({
			okCB: dojo.hitch(this, "setGroupCB"),
			defaultValue: " ",
			originalMenuItem: this.newGroupMenu,
			maxlength: 48
		});
		// In IE6 the Enter key press event bubbles up to AimInputableMenuItem whose onKeyPress() picks it up
		// and proceeds.  A timeout fixes this.
		aim.lang.setTimeout(this, function() {
			menu.addChild(this.newGroupInputMenu);
			this.newGroupInputMenu.show();
			
			this.newGroupInputMenu.initializeText("");
		}, 0);
	},

	onKeyPress: function(e){
		 if (e.keyCode == dojo.keys.ENTER) {
			 this.onClickAddButton(e);
		 }
	},
	
	onClickCloseButton: function(evt) {
		aim.widget.popup.close(this);
	},
	
	onClickAddButton: function(evt) {
		var sn = this.screenNameTextbox.value;
		
		if (!sn || sn == this.strings.AIM_ScreenName) {
			aim.widget.Dialogs.ok(this.strings.AddBuddy_Label_NoScreenName);
			return;
		}
		
		aim.wim.addBuddy(sn, this._group);
		aim.widget.popup.close(this);
	}
});
