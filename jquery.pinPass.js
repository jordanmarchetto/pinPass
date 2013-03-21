//Global Variables, each different passbox will access their values from these
var PINS = [];
var PAPERS = [];
var CONNECTIONS = [];
var LASTPINS = [];
var debug = true;

//Print message to the console
function log(msg){
    if(debug==true)
        console.log(msg);
}      
 

//create our passbox structure
//<optional input field>
//<wrapper>
//   <static pin>  <pin>  </static pin>
//             ...
//   <static pin>  <pin>  </static pin>
//   <toggle button>
//</wrapper>
function createDiv(thisID, options){
    var pinCount = options.pinCount;
    var divStr='';
    
    //make sure we should have our view password button
    if(options.allowPasswordPeek == true || options.allowPasswordToggle == true){
        divStr+= '<input type="text" value="tempPass" autocomplete="off" id="' + thisID+ '_passToggleText" style="display:none"/>';
    }
    divStr+= '<div id="' + thisID + '_pinPassBox" class="pinPassBox">';  

    for(i=1; i<=pinCount; i++){
        divStr+= '<div class="staticPin" id="' + thisID + '_staticPin_' + i + '"><div class="pin" id="' + thisID + '_pin_' + i + '"></div></div>';
    }
    //make sure we should have our view password button
    if(options.allowPasswordPeek == true || options.allowPasswordToggle == true){
        divStr+= '<div id="' + thisID+ '_passToggle" class="passToggle">View Password</div>';
    }
    divStr+= '</div>';
    return divStr;                                     
}

//GPass functions
//Take X,Y coord, return the pin it intersects with, or false
function intersects(x, y, pins, tolerance){
    for(i in pins){
        //log("mid: " + pins[i].midX);
        xlow = pins[i].midX - tolerance;
        xhigh = pins[i].midX + tolerance;
        ylow = pins[i].midY - tolerance;
        yhigh = pins[i].midY + tolerance;
        if(   (x > xlow) && (x < xhigh) && (y > ylow) && (y < yhigh) ){
            //log("intersects() found an intersect: " + pins[i].id);
            return pins[i];
        }
    }    
    return false;               
}

//Draw all of the current connections
function drawConnections(connections, paper){
    for(x in connections){
        line = connections[x];
        paper.line(line.startX, line.startY, line.endX, line.endY,4, line.gPassId);
    }
}

(function($){
    $.fn.extend({ 
	//plugin name - pinPass
	pinPass: function(options) {
	    //Settings list and the default values
	    var defaults = {
    	    pinCount: 9,               //number of pins
    	    tolerance: 17,             //higher = more likely for path to "snap" to a pin
    	    passLength: 10,            //how many chars in the final password                                                  
    	    shaOffset: 5,              //where to start grabbing chars in regards to what's generated
    	    salt: "pinPass",           //salt to be used during hashing
    	    dynamicSalt: false,        //allow salt to be grabbed from another field, pass in "#id"
    	    allowPasswordInput: true,  //if false, set password field to disabled
    	    allowPasswordToggle: false, //if true, user can toggle the password to be plain text
            allowPasswordPeek: true,   //if true, a 'view password' button will be displayed allowing 
                                                    //the user to "peek" at the generated password 
            hidePasswordField: false,  //hide the password input box                                              
	    };
	    
        //apply the options
	    var options = $.extend(defaults, options);

	    return this.each(function() {
    		var obj = $(this);   		
            
            //initialize identifiers            
            var thisID =  obj.attr("id");
            var gPassId = "#" + thisID + '_pinPassBox';
            
            //set up options
            var o = options;
            var pinCount = o.pinCount;
            var tolerance = o.tolerance;

            //create our passbox structure            
            var ourDiv = createDiv(thisID, o);
  
            //insert the passbox	       
    		$(ourDiv).insertAfter(obj);
    		//position the passbox
    		$("#"+ thisID + "_pinPassBox").css("margin-left", ($(this).position().left-5));
    		
    		//apply hidePasswordField - not yet working
    		if(o.hidePasswordField == true){
    		  $(this).hide();
    		}
    		//apply allowPasswordInput option
            if (o.allowPasswordInput == false){
                $(this).prop('disabled', true);
            }
            
            //apply allowPasswordPeek            
            if(o.allowPasswordPeek == true){ 
                //dynamically adjust the height to allow for the button
                var height = $("#"+ thisID + "_pinPassBox").css("height");
                var buttonHeight = $("#"+ thisID + "_passToggle").css("height");
                var margin = $("#"+ thisID + "_passToggle").css("margin-bottom"); 
                var newHeight = parseInt(height) + parseInt(buttonHeight) + parseInt(margin);
                //apply the height change
                $("#"+ thisID + "_pinPassBox").css("height", newHeight);  

                //set up the toggle feature                
                $("#" + thisID +"_passToggle").mousedown(function(){
                    $('#' + thisID + "_passToggleText").val($("#" + thisID).val());
                    $("#" + thisID + "_passToggleText").show();
                    $("#" + thisID).hide();
                }).mouseup(function(){
                    $("#" + thisID + "_passToggleText").hide();
                    $("#" + thisID).show();
                });
            } 
            
            //apply allowPasswordToggle
            if(o.allowPasswordToggle == true){ 
                //dynamically adjust the height to allow for the button
                var height = $("#"+ thisID + "_pinPassBox").css("height");
                var buttonHeight = $("#"+ thisID + "_passToggle").css("height");
                var margin = $("#"+ thisID + "_passToggle").css("margin-bottom"); 
                var newHeight = parseInt(height) + parseInt(buttonHeight) + parseInt(margin);
                //apply the height change
                $("#"+ thisID + "_pinPassBox").css("height", newHeight);  

                //set up the toggle feature                
                $("#" + thisID +"_passToggle").click(function(){
                    $('#' + thisID + "_passToggleText").val($("#" + thisID).val());
                    $("#" + thisID + "_passToggleText").toggle();
                    $("#" + thisID).toggle();
                });
                $("#" + thisID + "_passToggleText").change(function(){
                    $('#' + thisID ).val($("#" + thisID + "_passToggleText").val());
                });
            }
		 
                                        
            //show that it's working               
            //$(this).css('border', '1px solid red');
            
            ///////////////////////////////////////////////////////
            //Generate the password given a list of connections
            ///////////////////////////////////////////////////////
            function generatePassword(conns){
                var salt = o.salt;
                if(o.dynamicSalt){
                    salt = $( o.dynamicSalt).val();
                }
                var res = salt;       //start our string to include the salt
                var off = o.shaOffset;  //used to offset which bits we take
                var len = o.passLength; //length of password
                for(i in conns){
                    res+="-" + conns[i].startID;
                }
                res+="-" + conns[i].endID; //make sure we get that last pin
                log(res);
                res = Sha1.hash(res, false);
                                 
                //make sure that we don't try to grab bits outside of our range
                if(off + len > res.length){
                    off = 0;                
                }                                                                                  
                res = res.substring(off, off + len);
                return res;
            }


            //make the draggable pins visible on mouseover
            $(gPassId + " > .staticPin").mouseover(function(){
                var id = $(this).attr("id");
                id = id.split("_")[2];
                $("#" + thisID + "_pin_" + id).show();
                //log("pin: " + thisID + "_pin_" + id);
            }).mouseout(function(){
                var id = $(this).attr("id");
                id = id.split("_")[2];
                $("#" + thisID + "_pin_" + id).hide();
            });            
                
            //Create all of our pins
            var pins = [];
            $(gPassId + " > .staticPin").each(function(){
                var id = $(this).attr("id");
                id = id.split("_")[2];
                //make a pin object for each pin div
                var pin = new Object();
                pin.id = id;
                pin.width = $(this).width();
                pin.height = $(this).height();
                pin.x = $(this).position().left;
                pin.y = $(this).position().top;
                //for some reason adding 2 fixes the midpoint
                pin.midX = pin.x + (pin.width/2) +2;
                pin.midY = pin.y + (pin.height/2) +2;
                pin.obj = $(this);
                pin.legalVisit = true;
                
                pins.push(pin);
            });
            //Store our local pins variable globally
            PINS[thisID] = pins;

                
            //make our paper/svg/canvas thing to be under our passbox
            tempx = $(gPassId).offset().left;
            tempy = $(gPassId).offset().top;
            paper = new Raphael(tempx,tempy, 150, 150);
            //paper =    new Raphael(0,0, 1500, 1500);
            //store this globally
            PAPERS[thisID] = paper;
            CONNECTIONS[thisID] = [];
            //push the canvas to the background
            $("svg").css("z-index", "-900");
            $("svg").each(function(){
                var svgid = $(this).attr("id");                 
                if(!svgid){
                    $(this).attr("id", (thisID+"_svg"));
                }
            });
           
           //make an arrow object thing to later draw on the svg     
           Raphael.fn.arrow = function (x1, y1, x2, y2, size, someID) {
                //var gPassId = someID;
                //log(someID);
                x1 = x1 - $(someID).offset().left+7;
                x2 = x2 - $(someID).offset().left+7;
                y1 = y1 - $(someID).offset().top+7;
                y2 = y2 - $(someID).offset().top+7;
                //log("draw: {" + someID + "} x1: " + x1 + ", y1: " + y1 + " - x2: " + x2 + ", y2: " + y2);
        		var angle = Math.atan2(x1-x2,y2-y1);
        		angle = (angle / (2 * Math.PI)) * 360;
        		var arrowPath = this.path("M" + x2 + " " + y2 + " L" + (x2  - size) + " " + (y2  - size) + " L" + (x2  - size)  + " " + (y2  + size) + " L" + x2 + " " + y2 ).attr("fill","black").rotate((90+angle),x2,y2);
        		var linePath = this.path("M" + x1 + " " + y1 + " L" + x2 + " " + y2);
        		return [linePath,arrowPath];
        	};
        	
        	//make a line object to draw ... it's really the same as the arrow
        	Raphael.fn.line = function (x1, y1, x2, y2, size, someID) {
        	    x1 = x1 - $(someID).offset().left+7;
                x2 = x2 - $(someID).offset().left+7;
                y1 = y1 - $(someID).offset().top+7;
                y2 = y2 - $(someID).offset().top+7;
        		var angle = Math.atan2(x1-x2,y2-y1);
        		angle = (angle / (2 * Math.PI)) * 360;
        		var arrowPath = this.path("M" + x2 + " " + y2 + " L" + (x2  - size) + " " + (y2  - size) + " L" + (x2  - size)  + " " + (y2  + size) + " L" + x2 + " " + y2 ).attr("fill","black").rotate((90+angle),x2,y2);
        		var linePath = this.path("M" + x1 + " " + y1 + " L" + x2 + " " + y2);
        		return [linePath,arrowPath];
        	};
 

            $(gPassId + " > .staticPin > .pin").draggable({ opacity: 0.35, 
                    //Snapping code is currently commented out.  My intersects() code seems to replace it
                    //snap: true, snapTolerance: tolerance, snapMode: "inner", stack: ".staticPin", 
                    revert: function(obj){
                            connStr = ""
                            connections = CONNECTIONS[thisID];
                            for(x in connections)
                                connStr += connections[x].startID + "-" + connections[x].endID + ", ";
                            log(connStr);
                            
                            //set the password
                            pass = generatePassword(CONNECTIONS[thisID]);
                            log("Password: " + pass);                                
                            $("#"+thisID).val(pass);                            
                            
                            //clear the lines
                            PAPERS[thisID].clear();
                            //change the pin colors
                            $(gPassId + ' > .staticPin').removeClass("visited");
                            //make all the pins legal visits
                            for(i=0;i<PINS[thisID].length;i++){
                                PINS[thisID][i].legalVisit = true;
                                //log("reseting: PINS." + thisID + "[" + i + "]");
                            }
                            //reset the last pin (so that it gets reinitialized)
                            LASTPINS[thisID] = null;
                            //reset all the connections
                            CONNECTIONS[thisID] = [];
                            return true;
                    }, 
                    containment: gPassId,  
                    revertDuration: 150, 
                    drag: function(event, ui) {
                            //get the ID of this pin
                            var thisPin = $(this).attr("id").split("_")[2];
                            
                            //This whole function is called on each drag event
                            // i.e. every mouse movement while dragging
                            // shifting this point by 5 seems to make it more correct
                            var x = event.pageX - 5;
                            var y = event.pageY - 5;
                                                                  
                            //Check to see if we already have our "lastPin"
                            //if not, make it this one
                            if(!LASTPINS[thisID]){
                                //log("make new lastpin: " + $(this).attr("id").split("_")[1]);
                                LASTPINS[thisID] = PINS[thisID][thisPin-1];  
                                //pins[thisID-1].legalVisit = false;
                            }                              
                            PAPERS[thisID].clear();
                                                         
                            //log("drag: {" + gPassId + "} x1: " + LASTPINS[thisID].midX + ", y1: " + LASTPINS[thisID].midY + " - x2: " + x + ", y2: " + y);
                            var arrow = PAPERS[thisID].arrow(LASTPINS[thisID].midX,LASTPINS[thisID].midY,x,y,4,gPassId);
                                                          
                            //log("Calling: drawConnections with " +  CONNECTIONS[thisID] + ", and " +  PAPERS[thisID]);
                            drawConnections(CONNECTIONS[thisID], PAPERS[thisID]);
                                                            
                            //see if there's a pin under the mouse
                            var pin = intersects(x,y, PINS[thisID], tolerance);
                            if(pin.legalVisit){                                    
                                //log("intersect found: " + pin.id);
                                pin.obj.addClass("visited");
                                pin.legalVisit = false;
                                
                                //push the line to the list of connections     
                                if(pin.id != LASTPINS[thisID].id){
                                    //log("connecting: " + pin.id + " and " + LASTPINS[thisID].id);
                                    //create a line object to add to our list of lines
                                    var line = new Object();
                                    line.startX  = LASTPINS[thisID].midX;
                                    line.startY  = LASTPINS[thisID].midY;
                                    line.startID = LASTPINS[thisID].id;
                                    line.endX    = pin.midX;
                                    line.endY    = pin.midY;
                                    line.endID   = pin.id;
                                    line.gPassId = gPassId;
                                    CONNECTIONS[thisID].push(line);
                                }                              
                                LASTPINS[thisID] = pin;         
                            }//end legal visit
                    },  //end drag 
            }); //end draggable();
		
          });//end the return/pinPass bind
	}
    });
})(jQuery);


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  SHA-1 implementation in JavaScript | (c) Chris Veness 2002-2010 | www.movable-type.co.uk      */
/*   - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                             */
/*         http://csrc.nist.gov/groups/ST/toolkit/examples.html                                   */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

var Sha1 = {};  // Sha1 namespace

/**
 * Generates SHA-1 hash of string
 *
 * @param {String} msg                String to be hashed
 * @param {Boolean} [utf8encode=true] Encode msg as UTF-8 before generating hash
 * @returns {String}                  Hash of msg as hex character string
 */
Sha1.hash = function(msg, utf8encode) {
  utf8encode =  (typeof utf8encode == 'undefined') ? true : utf8encode;
  
  // convert string to UTF-8, as SHA only deals with byte-streams
  if (utf8encode) msg = Utf8.encode(msg);
  
  // constants [§4.2.1]
  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  
  // PREPROCESSING 
  
  msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]
  
  // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
  var l = msg.length/4 + 2;  // length (in 32-bit integers) of msg + ‘1’ + appended length
  var N = Math.ceil(l/16);   // number of 16-integer-blocks required to hold 'l' ints
  var M = new Array(N);
  
  for (var i=0; i<N; i++) {
    M[i] = new Array(16);
    for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
      M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) | 
        (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
    } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
  }
  // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
  // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
  // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
  M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14])
  M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;
  
  // set initial hash value [§5.3.1]
  var H0 = 0x67452301;
  var H1 = 0xefcdab89;
  var H2 = 0x98badcfe;
  var H3 = 0x10325476;
  var H4 = 0xc3d2e1f0;
  
  // HASH COMPUTATION [§6.1.2]
  
  var W = new Array(80); var a, b, c, d, e;
  for (var i=0; i<N; i++) {
  
    // 1 - prepare message schedule 'W'
    for (var t=0;  t<16; t++) W[t] = M[i][t];
    for (var t=16; t<80; t++) W[t] = Sha1.ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);
    
    // 2 - initialise five working variables a, b, c, d, e with previous hash value
    a = H0; b = H1; c = H2; d = H3; e = H4;
    
    // 3 - main loop
    for (var t=0; t<80; t++) {
      var s = Math.floor(t/20); // seq for blocks of 'f' functions and 'K' constants
      var T = (Sha1.ROTL(a,5) + Sha1.f(s,b,c,d) + e + K[s] + W[t]) & 0xffffffff;
      e = d;
      d = c;
      c = Sha1.ROTL(b, 30);
      b = a;
      a = T;
    }
    
    // 4 - compute the new intermediate hash value
    H0 = (H0+a) & 0xffffffff;  // note 'addition modulo 2^32'
    H1 = (H1+b) & 0xffffffff; 
    H2 = (H2+c) & 0xffffffff; 
    H3 = (H3+d) & 0xffffffff; 
    H4 = (H4+e) & 0xffffffff;
  }

  return Sha1.toHexStr(H0) + Sha1.toHexStr(H1) + 
    Sha1.toHexStr(H2) + Sha1.toHexStr(H3) + Sha1.toHexStr(H4);
}

//
// function 'f' [§4.1.1]
//
Sha1.f = function(s, x, y, z)  {
  switch (s) {
  case 0: return (x & y) ^ (~x & z);           // Ch()
  case 1: return x ^ y ^ z;                    // Parity()
  case 2: return (x & y) ^ (x & z) ^ (y & z);  // Maj()
  case 3: return x ^ y ^ z;                    // Parity()
  }
}

//
// rotate left (circular left shift) value x by n positions [§3.2.5]
//
Sha1.ROTL = function(x, n) {
  return (x<<n) | (x>>>(32-n));
}

//
// hexadecimal representation of a number 
//   (note toString(16) is implementation-dependant, and  
//   in IE returns signed numbers when used on full words)
//
Sha1.toHexStr = function(n) {
  var s="", v;
  for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s += v.toString(16); }
  return s;
}


