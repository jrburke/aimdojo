## Description ##
A collection of AIM-related JavaScript modules that are designed to work with the [Dojo JavaScript Toolkit](http://dojotoolkit.org). The modules include a wrapper for the [Web AIM API](http://developer.aim.com/ref_api) and UI widgets that show a user's presence, buddy list and allow sending and receiving instant messages (IMs).

By using these modules, you can get a fully functioning AIM-based text IM client running in a web page.

The modules are designed for Dojo 1.1 and above.

The modules are open source versions (new BSD license) of the modules used by [AOL Webmail](http://webmail.aol.com/). Two other open source components are bundled and used with these modules:
  * SoundBridge.swf from the BSD-licensed [JavaScript Sound Kit](http://sourceforge.net/projects/jssoundkit/).
  * The aim.date module includes some functions from the MIT-licensed [Matt Kruse's Javascript Toolbox](http://www.javascripttoolbox.com/lib/date/source.php).

In addition to wrapping the [Web AIM API](http://developer.aim.com/ref_api), these modules use AOL's [OpenAuth](http://dev.aol.com/api/openauth) to handle user authentication. This means the modules do not handle a user's name and password.

## Latest News and Examples ##
The first release, 1.0.0 is available in the [Downloads](http://code.google.com/p/aimdojo/downloads/list) area. For information on how to use the code, download  the 1.0.0 source, and open the index.html file.

The code is also usable from the AOL CDN, so you do not have to install all the code on your server. Examples that use the AOL CDN are here (same examples in the source downloads, but configured to use the AOL CDN):
  * [Simple.html](http://jburke.dojotoolkit.org/demos/aim/1.0.0/Simple.html): Just shows the simplest usage of the modules, using aim.ImPanel with the default options.
  * [ResizableFloatWithHoverCard.html](http://jburke.dojotoolkit.org/demos/aim/1.0.0/ResizableFloatWithHoverCard.html): Shows how to use aim.ImPanel inside other dijit widgets that allow the buddy list to be dragged and resized. Also shows configuration options for the HoverCard (the info card that shows up as you hover over buddy names).
