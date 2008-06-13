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
dojo.provide("aim.html");

dojo.require("dojo.io.iframe");
dojo.require("aim.browser");
dojo.require("aim.string");

aim.html = {
	// setInnerText()
	//
	// This is a cover function to set the text of the given element.
	// It turns out that while innerHTML is supported by everyone, it
	// can be significantly slower than using innerText or other
	// equivalents. This is most likely because innerHTML is just more
	// powerful; it parses out HTML and actually adds the content to the
	// DOM. So, wherever we only need to change text, we'd get a big
	// performance gain using innerText or an equivalent.
	//
	// It looks like innerText is supported in both IE and in Safari 1.3.
	// The equivalent in Mozilla/Firefox is textContent.
	//
	// @el the element to apply the text to
	// @text the text to inject into el
	setInnerText: function(el, text) {
		text = text || "";
		
		if (dojo.isIE)
			el.innerText = text;
		else if (dojo.isMoz)
			el.textContent = text;
		else if (dojo.isSafari)
			el.innerText = text;
		else
			el.innerHTML = aim.string.escapeXml(text);
	},
	
	setShowing: function(el, show) {
		el.style.display = (show ? "" : "none");
	},

	// addHoverClass()
	//
	// There are two ways to add roll-over styles to an element:
	//
	// 1) :hover pseudo-class -- This works fine in Mozilla/Safari, but in IE (prior to 7.0),
	//    it only works on <A> elements.  In quirks mode, though, Mozilla requires the CSS
	//    selector to have at least a tag name, not just a class name.  So "div.myElem:hover"
	//    works, but ".myElem:hover" doesn't.
	//
	// 2) Event handlers -- onmouseout is not reliable for any element that has child
	//    nodes.  The IE-only events onmouseenter and onmouseleave work well though.  You
	//    can call this function to add these handlers.
	//
	// The best approach I've found is to use event handlers for IE and pseudo-classes
	// for the rest.  So a CSS rule would look like:
	//
	//     .myElemHover,
	//     div.myElem:hover {
	//          border-color: red;
	//     }
	addHoverClass: function(el, cl) {
		if (!dojo.isIE) return;
		if (!cl) cl = "hover";
		
		dojo.connect(el, "onmouseenter", function() {
			dojo.addClass(el, cl);
		});
		
		dojo.connect(el, "onmouseleave", function() {
			dojo.removeClass(el, cl);
		});
	},

	// targetLinksToNewWindow modifies all the links within a node to open
	// in a new window.
	targetLinksToNewWindow: function(node) {
		dojo.forEach(node.getElementsByTagName("a"), function(link) {
			link.target = "_blank";
		});
	},

	// summary:
	//	Returns whether the mouse is over the passed element.
	//	Element must be display:block (ie, not a <span>)
	overElement: function(element, evt){
		//When the page is unloading, if this method runs it will throw an
		//exception.
		if(typeof(dojo)=="undefined"){return false;}
		element = dojo.byId(element);
		var m = {x: evt.pageX, y: evt.pageY};
		var bb = dojo._getBorderBox(element);
		var absl = dojo.coords(element, true);
		var left = absl.x;
		var top = absl.y;

		return (m.x >= left
			&& m.x <= (left + bb.w)
			&& m.y >= absl.y
			&& m.y <= (top + bb.h)
		);	//	boolean
	},
	
	selectInputText: function(element){
		// summary: select all the text in an input element
		var _window = dojo.global;
		var _document = dojo.doc;
		element = dojo.byId(element);
		if(_document["selection"] && dojo.body()["createTextRange"]){ // IE
			if(element.createTextRange){
				var range = element.createTextRange();
				range.moveStart("character", 0);
				range.moveEnd("character", element.value.length);
				range.select();
			}
		}else if(_window["getSelection"]){
			var selection = _window.getSelection();
			// FIXME: does this work on Safari?
			if(element.setSelectionRange){
				element.setSelectionRange(0, element.value.length);
			}
		}
		element.focus();
	},
	
	getScrollbar : function(){
		//	summary
		//	returns the width of a scrollbar.
		
		//	set up the test nodes.
		var scroll = document.createElement("div");
		scroll.style.width="100px";
		scroll.style.height="100px";
		scroll.style.overflow="scroll";
		scroll.style.position="absolute";
		scroll.style.top="-300px";
		scroll.style.left="0px"
		
		var test = document.createElement("div");
		test.style.width="400px";
		test.style.height="400px";
		scroll.appendChild(test);
		dojo.body().appendChild(scroll);

		var width=scroll.offsetWidth - scroll.clientWidth;

		dojo.body().removeChild(scroll);
		scroll.removeChild(test);
		scroll=test=null;

		//	we return an object because we may add additional info in the future.
		return { w: width };	//	object
	},
	
	setFloat: function(el, flt) {
		el.style[aim.html.floatAttr] = flt;
	},
	getFloat: function(el) {
		return el.style[aim.html.floatAttr];
	},
	floatAttr: dojo.isIE ? "styleFloat" : "cssFloat"
};
