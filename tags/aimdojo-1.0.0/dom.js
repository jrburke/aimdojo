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
dojo.provide("aim.dom");

aim.dom = {
	forEachNode: function(node, fncBefore, fncAfter) {
		var children = node.childNodes;
		for (var i = 0; i < children.length; i++) { 
			var childNode = children[i];
			var ignore = false;
			if (fncBefore != null)
				ignore = fncBefore(childNode); 
			if (!ignore) {
				aim.dom.forEachNode(childNode, fncBefore, fncAfter); 
				if (fncAfter != null)
					i += fncAfter(childNode);
			}
		} 
	},
	
	findAncestorByClass: function(node, cls) {
		while (node) {
			if (dojo.hasClass(node, cls))
				return node;
			node = node.parentNode;
		}
		return null;
	},

	insertBefore: function(node, ref, force) {
		if(	(force != true)&&
			(node === ref || node.nextSibling === ref)){ return false; }
		var parent = ref.parentNode;
		parent.insertBefore(node, ref);
		return true;
	}
};
