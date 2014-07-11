!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bitcoinaddress=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * bitcoinaddress.js
 *
 * Bitcoin address and payment helper.
 *
 * Copyright 2013 Mikko Ohtamaa http://opensourcehacker.com
 *
 * Licensed under MIT license.
 */


// Please note that script this depends on jQuery,
// but I did not find a solution for having UMD loading for the script,
// so that jQuery would be available through browserify bundling
// OR CDN. Include jQuery externally before including this script.

/* global module, require */
var qrcode = require("./qrcode.js");

// jQuery reference
var $;

module.exports = {

    config : null,

    /**
     * Create URL for bitcoin URI scheme payments.
     *
     * https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki#Examples
     *
     * http://bitcoin.stackexchange.com/questions/4987/bitcoin-url-scheme
     *
     * @param  {String} address Receiving address
     * @param  {String} amount  Amount as big decimal
     * @param  {String} label   [description]
     * @param  {[type]} message [description]
     * @return {[type]}         [description]
     */
    buildBitcoinURI : function(address, amount, label, message) {
        var tmpl = ["bitcoin:", address, "?"];

        if(amount) {
            tmpl = tmpl.concat(["amount=", encodeURIComponent(amount), "&"]);
        }

        if(label) {
            tmpl = tmpl.concat(["label=", encodeURIComponent(label), "&"]);
        }

        if(message) {
            tmpl = tmpl.concat(["message=", encodeURIComponent(message), "&"]);
        }
        // Remove prefixing extra
        var lastc = tmpl[tmpl.length-1];
        if(lastc == "&" || lastc == "?") {
            tmpl = tmpl.splice(0, tmpl.length-1);
        }

        return tmpl.join("");
    },

    /**
     * Build special HTML for bitcoin address manipulation.
     * @param  {DOM} elem   Templatized target
     * @param  {DOM} source Original source tree element with data attributes
     */
    buildControls : function(elem, source) {

        // Replace .bitcoin-address in the template
        var addr = elem.find(".bitcoin-address");

        // Add a maker class so that we don't reapply template
        // on the subsequent scans
        addr.addClass("bitcoin-address-controls");

        addr.text(source.attr("data-bc-address"));

        // Copy orignal attributes;
        $.each(["address", "amount", "label", "message"], function() {
            var attrName = "data-bc-" + this;
            elem.attr(attrName, source.attr(attrName));
        });

        // Build BTC URL
        var url = this.buildBitcoinURI(source.attr("data-bc-address"),
            source.attr("data-bc-amount"),
            source.attr("data-bc-label"),
            source.attr("data-bc-message"));

        elem.find(".bitcoin-address-action-send").attr("href", url);
    },

    /**
     * Get the template element defined in the options.
     * @return {[type]} [description]
     */
    getTemplate : function() {

        var template = document.getElementById(this.config.template);

        if(!template) {
            throw new Error("Bitcoin address template element missing:" + this.config.template);
        }

        template = $(template);

        if(template.size() != 1) {
            throw new Error("Bitcoin address template DOM does not contain a single element");
        }

        return template;
    },

    /**
     * Applies bitcoinaddress DOM template to a certain element.
     *
     * The `target` element must contain necessary data-attributes
     * from where we scoop the info.
     *
     * Also builds bitcoin: URI.
     *
     * @param {jQuery} elem jQuery selection of target bitcoin address
     * @param {jQuery} template (optional) Template element to be applied
     */
    applyTemplate : function(target, template) {

        if(!template) {
            template = this.getTemplate();
        }

        // Make a deep copy, so we don't accidentally modify
        // template elements in-place
        var elem = template.clone(false, true);

        this.buildControls(elem, target);

        // Make sure we are visible (HTML5 way, CSS way)
        // and clean up the template id if we managed to copy it around
        elem.removeAttr("hidden id");

        elem.show();

        target.replaceWith(elem);
    },

    /**
     * Scan the page for bitcoin addresses.
     *
     * Create user interface for all bitcoin address elements on the page-.
     * You can call this function multiple times if new bitcoin addresses become available.
     */
    scan: function() {
        var self = this;

        var template = this.getTemplate();

        // Optionally bail out if the default selection
        // is not given (user calls applyTemplate() manually)
        if(!this.config.selector) {
            return;
        }

        $(this.config.selector).each(function() {

            var $this = $(this);

            // Template already applied
            if($this.hasClass("bitcoin-address-controls")) {
                return;
            }

            // Make sure we don't apply the template on the template itself
            if($this.parents("#" + self.config.template).size() > 0) {
                return;
            }

            // Don't reapply templates on subsequent scans

            self.applyTemplate($this, template);
        });
    },

    /**
     * Prepare selection in .bitcoin-address-container for copy paste
     */
    prepareCopySelection : function(elem) {
        var addy = elem.find(".bitcoin-address");
        window.getSelection().selectAllChildren(addy.get(0));
        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-copy").slideDown();
    },

    /**
     * Send payment action handler
     */
    onActionSend : function(e) {
        var elem = $(e.target).parents(".bitcoin-address-container");
        // We never know if the click action was succesfully complete
        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-send").slideDown();
    },

    /**
     * Copy action handler.
     */
    onActionCopy : function(e) {
        e.preventDefault();
        var elem = $(e.target).parents(".bitcoin-address-container");
        this.prepareCopySelection(elem);
        return false;
    },


    /**
     * Generates QR code inside the target element.
     */
    generateQR : function(qrContainer) {

        var elem = qrContainer.parents(".bitcoin-address-container");
        //var addr = elem.attr("data-bc-address");

        var url = this.buildBitcoinURI(elem.attr("data-bc-address"),
            elem.attr("data-bc-amount"),
            elem.attr("data-bc-label"));

        console.log("QR address URL is ", url);

        var options = $.extend({}, this.config.qr, {
            text: url
        });
        var qrCode = new qrcode.QRCode(qrContainer.get(0), options);
    },

    /**
     * QR code generation action.
     */
    onActionQR : function(e) {
        e.preventDefault();
        var elem = $(e.target).parents(".bitcoin-address-container");
        var addr = elem.attr("data-bc-address");
        var qrContainer = elem.find(".bitcoin-address-qr-container");

        // Lazily generate the QR code
        if(qrContainer.children().size() === 0) {
            this.generateQR(qrContainer);
        }

        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-qr").slideDown();

        return false;
    },

    onClick : function(e) {
        var elem = $(e.target).parents(".bitcoin-address-container");
        this.prepareCopySelection(elem);
    },

    initUX : function() {
        var self = this;

        $(document.body).on("click", ".bitcoin-address-action-copy", $.proxy(this.onActionCopy, this));
        $(document.body).on("click", ".bitcoin-address-action-send", $.proxy(this.onActionSend, this));
        $(document.body).on("click", ".bitcoin-address-action-qr", $.proxy(this.onActionQR, this));
        $(document.body).on("click", ".bitcoin-address", $.proxy(this.onClick, this));

        // Hide any copy hints when user presses CTRL+C
        // on any part of the page
        $(document.body).on("copy", function() {
            $(".bitcoin-action-hint-copy").slideUp();
        });

        if(this.config.generateQREagerly) {
            $(".bitcoin-address-container").each(function() {
                var elem = $(this);
                var addr = elem.attr("data-bc-address");
                var qrContainer = elem.find(".bitcoin-address-qr-container");
                self.generateQR(qrContainer);
            });
        }

    },

    /**
     * Call to initialize the detault bitcoinprices UI.
     */
    init : function(_config) {
        var self = this;

        if(!_config) {
            throw new Error("You must give bitcoinaddress config object");
        }
        this.config = _config;
        $ = this.config.jQuery || jQuery;
        this.scan();
        this.initUX();
    }
};

},{"./qrcode.js":2}],2:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 *
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */

/* global document */

var QRCode;

(function () {
    //---------------------------------------------------------------------
    // QRCode for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //   http://www.opensource.org/licenses/mit-license.php
    //
    // The word "QR Code" is registered trademark of
    // DENSO WAVE INCORPORATED
    //   http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------
    function QR8bitByte(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
        this.parsedData = [];

        // Added to support UTF-8 Characters
        for (var i = 0, l = this.data.length; i < l; i++) {
            var byteArray = [];
            var code = this.data.charCodeAt(i);

            if (code > 0x10000) {
                byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
                byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
                byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[3] = 0x80 | (code & 0x3F);
            } else if (code > 0x800) {
                byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
                byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[2] = 0x80 | (code & 0x3F);
            } else if (code > 0x80) {
                byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
                byteArray[1] = 0x80 | (code & 0x3F);
            } else {
                byteArray[0] = code;
            }

            this.parsedData.push(byteArray);
        }

        this.parsedData = Array.prototype.concat.apply([], this.parsedData);

        if (this.parsedData.length != this.data.length) {
            this.parsedData.unshift(191);
            this.parsedData.unshift(187);
            this.parsedData.unshift(239);
        }
    }

    QR8bitByte.prototype = {
        getLength: function (buffer) {
            return this.parsedData.length;
        },
        write: function (buffer) {
            for (var i = 0, l = this.parsedData.length; i < l; i++) {
                buffer.put(this.parsedData[i], 8);
            }
        }
    };

    function QRCodeModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCodeModel.prototype={addData:function(data){var newData=new QR8bitByte(data);this.dataList.push(newData);this.dataCache=null;},isDark:function(row,col){if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col){throw new Error(row+","+col);}
    return this.modules[row][col];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var row=0;row<this.moduleCount;row++){this.modules[row]=new Array(this.moduleCount);for(var col=0;col<this.moduleCount;col++){this.modules[row][col]=null;}}
    this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7){this.setupTypeNumber(test);}
    if(this.dataCache==null){this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);}
    this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}},getBestMaskPattern:function(){var minLostPoint=0;var pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}
    return pattern;},createMovieClip:function(target_mc,instance_name,depth){var qr_mc=target_mc.createEmptyMovieClip(instance_name,depth);var cs=1;this.make();for(var row=0;row<this.modules.length;row++){var y=row*cs;for(var col=0;col<this.modules[row].length;col++){var x=col*cs;var dark=this.modules[row][col];if(dark){qr_mc.beginFill(0,100);qr_mc.moveTo(x,y);qr_mc.lineTo(x+cs,y);qr_mc.lineTo(x+cs,y+cs);qr_mc.lineTo(x,y+cs);qr_mc.endFill();}}}
    return qr_mc;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null){continue;}
    this.modules[r][6]=(r%2==0);}
    for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null){continue;}
    this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this.modules[row][col]!=null){continue;}
    for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}}}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}
    for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(this.errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this.modules[i][8]=mod;}else if(i<8){this.modules[i+1][8]=mod;}else{this.modules[this.moduleCount-15+i][8]=mod;}}
    for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this.modules[8][this.moduleCount-i-1]=mod;}else if(i<9){this.modules[8][15-i-1+1]=mod;}else{this.modules[8][15-i-1]=mod;}}
    this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1;var row=this.moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=(((data[byteIndex]>>>bitIndex)&1)==1);}
    var mask=QRUtil.getMask(maskPattern,row,col-c);if(mask){dark=!dark;}
    this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}
    row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,typeNumber));data.write(buffer);}
    var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++){totalDataCount+=rsBlocks[i].dataCount;}
    if(buffer.getLengthInBits()>totalDataCount*8){throw new Error("code length overflow. ("
    +buffer.getLengthInBits()
    +">"
    +totalDataCount*8
    +")");}
    if(buffer.getLengthInBits()+4<=totalDataCount*8){buffer.put(0,4);}
    while(buffer.getLengthInBits()%8!=0){buffer.putBit(false);}
    while(true){if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD1,8);}
    return QRCodeModel.createBytes(buffer,rsBlocks);};QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0;var maxDcCount=0;var maxEcCount=0;var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=0xff&buffer.buffer[i+offset];}
    offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}
    var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++){totalCodeCount+=rsBlocks[i].totalCount;}
    var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length){data[index++]=dcdata[r][i];}}}
    for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length){data[index++]=ecdata[r][i];}}}
    return data;};var QRMode={MODE_NUMBER:1<<0,MODE_ALPHA_NUM:1<<1,MODE_8BIT_BYTE:1<<2,MODE_KANJI:1<<3};var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0){d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)));}
    return((data<<10)|d)^QRUtil.G15_MASK;},getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0){d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)));}
    return(data<<12)|d;},getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}
    return digit;},getPatternPosition:function(typeNumber){return QRUtil.PATTERN_POSITION_TABLE[typeNumber-1];},getMask:function(maskPattern,i,j){switch(maskPattern){case QRMaskPattern.PATTERN000:return(i+j)%2==0;case QRMaskPattern.PATTERN001:return i%2==0;case QRMaskPattern.PATTERN010:return j%3==0;case QRMaskPattern.PATTERN011:return(i+j)%3==0;case QRMaskPattern.PATTERN100:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case QRMaskPattern.PATTERN101:return(i*j)%2+(i*j)%3==0;case QRMaskPattern.PATTERN110:return((i*j)%2+(i*j)%3)%2==0;case QRMaskPattern.PATTERN111:return((i*j)%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern);}},getErrorCorrectPolynomial:function(errorCorrectLength){var a=new QRPolynomial([1],0);for(var i=0;i<errorCorrectLength;i++){a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));}
    return a;},getLengthInBits:function(mode,type){if(1<=type&&type<10){switch(mode){case QRMode.MODE_NUMBER:return 10;case QRMode.MODE_ALPHA_NUM:return 9;case QRMode.MODE_8BIT_BYTE:return 8;case QRMode.MODE_KANJI:return 8;default:throw new Error("mode:"+mode);}}else if(type<27){switch(mode){case QRMode.MODE_NUMBER:return 12;case QRMode.MODE_ALPHA_NUM:return 11;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 10;default:throw new Error("mode:"+mode);}}else if(type<41){switch(mode){case QRMode.MODE_NUMBER:return 14;case QRMode.MODE_ALPHA_NUM:return 13;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 12;default:throw new Error("mode:"+mode);}}else{throw new Error("type:"+type);}},getLostPoint:function(qrCode){var moduleCount=qrCode.getModuleCount();var lostPoint=0;for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount;col++){var sameCount=0;var dark=qrCode.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||moduleCount<=row+r){continue;}
    for(var c=-1;c<=1;c++){if(col+c<0||moduleCount<=col+c){continue;}
    if(r==0&&c==0){continue;}
    if(dark==qrCode.isDark(row+r,col+c)){sameCount++;}}}
    if(sameCount>5){lostPoint+=(3+sameCount-5);}}}
    for(var row=0;row<moduleCount-1;row++){for(var col=0;col<moduleCount-1;col++){var count=0;if(qrCode.isDark(row,col))count++;if(qrCode.isDark(row+1,col))count++;if(qrCode.isDark(row,col+1))count++;if(qrCode.isDark(row+1,col+1))count++;if(count==0||count==4){lostPoint+=3;}}}
    for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount-6;col++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row,col+1)&&qrCode.isDark(row,col+2)&&qrCode.isDark(row,col+3)&&qrCode.isDark(row,col+4)&&!qrCode.isDark(row,col+5)&&qrCode.isDark(row,col+6)){lostPoint+=40;}}}
    for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount-6;row++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row+1,col)&&qrCode.isDark(row+2,col)&&qrCode.isDark(row+3,col)&&qrCode.isDark(row+4,col)&&!qrCode.isDark(row+5,col)&&qrCode.isDark(row+6,col)){lostPoint+=40;}}}
    var darkCount=0;for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount;row++){if(qrCode.isDark(row,col)){darkCount++;}}}
    var ratio=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5;lostPoint+=ratio*10;return lostPoint;}};var QRMath={glog:function(n){if(n<1){throw new Error("glog("+n+")");}
    return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0){n+=255;}
    while(n>=256){n-=255;}
    return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++){QRMath.EXP_TABLE[i]=1<<i;}
    for(var i=8;i<256;i++){QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];}
    for(var i=0;i<255;i++){QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;}
    function QRPolynomial(num,shift){if(num.length==undefined){throw new Error(num.length+"/"+shift);}
    var offset=0;while(offset<num.length&&num[offset]==0){offset++;}
    this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++){this.num[i]=num[i+offset];}}
    QRPolynomial.prototype={get:function(index){return this.num[index];},getLength:function(){return this.num.length;},multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));}}
    return new QRPolynomial(num,0);},mod:function(e){if(this.getLength()-e.getLength()<0){return this;}
    var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i);}
    for(var i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);}
    return new QRPolynomial(num,0).mod(e);}};function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount;}
    QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(typeNumber,errorCorrectLevel){var rsBlock=QRRSBlock.getRsBlockTable(typeNumber,errorCorrectLevel);if(rsBlock==undefined){throw new Error("bad rs block @ typeNumber:"+typeNumber+"/errorCorrectLevel:"+errorCorrectLevel);}
    var length=rsBlock.length/3;var list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0];var totalCount=rsBlock[i*3+1];var dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(totalCount,dataCount));}}
    return list;};QRRSBlock.getRsBlockTable=function(typeNumber,errorCorrectLevel){switch(errorCorrectLevel){case QRErrorCorrectLevel.L:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];case QRErrorCorrectLevel.M:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];case QRErrorCorrectLevel.Q:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];case QRErrorCorrectLevel.H:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];default:return undefined;}};function QRBitBuffer(){this.buffer=[];this.length=0;}
    QRBitBuffer.prototype={get:function(index){var bufIndex=Math.floor(index/8);return((this.buffer[bufIndex]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++){this.putBit(((num>>>(length-i-1))&1)==1);}},getLengthInBits:function(){return this.length;},putBit:function(bit){var bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0);}
    if(bit){this.buffer[bufIndex]|=(0x80>>>(this.length%8));}
    this.length++;}};var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];

    function _isSupportCanvas() {
        return typeof CanvasRenderingContext2D != "undefined";
    }

    // android 2.x doesn't support Data-URI spec
    function _getAndroid() {
        var android = false;
        var sAgent = navigator.userAgent;

        if (/android/i.test(sAgent)) { // android
            android = true;
            aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

            if (aMat && aMat[1]) {
                android = parseFloat(aMat[1]);
            }
        }

        return android;
    }

    var svgDrawer = (function() {

        var Drawing = function (el, htOption) {
            this._el = el;
            this._htOption = htOption;
        };

        Drawing.prototype.draw = function (oQRCode) {
            var _htOption = this._htOption;
            var _el = this._el;
            var nCount = oQRCode.getModuleCount();
            var nWidth = Math.floor(_htOption.width / nCount);
            var nHeight = Math.floor(_htOption.height / nCount);

            this.clear();

            function makeSVG(tag, attrs) {
                var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
                for (var k in attrs)
                    if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
                return el;
            }

            var svg = makeSVG("svg" , {'viewBox': '0 0 ' + String(nCount) + " " + String(nCount), 'width': '100%', 'height': '100%', 'fill': _htOption.colorLight});
            svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            _el.appendChild(svg);

            svg.appendChild(makeSVG("rect", {"fill": _htOption.colorDark, "width": "1", "height": "1", "id": "template"}));

            for (var row = 0; row < nCount; row++) {
                for (var col = 0; col < nCount; col++) {
                    if (oQRCode.isDark(row, col)) {
                        var child = makeSVG("use", {"x": String(row), "y": String(col)});
                        child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template")
                        svg.appendChild(child);
                    }
                }
            }
        };
        Drawing.prototype.clear = function () {
            while (this._el.hasChildNodes())
                this._el.removeChild(this._el.lastChild);
        };
        return Drawing;
    })();

    // Had to change this a bit, because of browserify.
    // document properties cannot be tested when the JS is loaded,
    // all window/document access should be done in the event handlers only.
    var useSVG;
    if(global) {
        // tape + Pure NodeJS
        useSVG = false;
    } else {
        useSVG = document.documentElement.tagName.toLowerCase() === "svg";
    }

    // Drawing in DOM by using Table tag
    var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function () {
        var Drawing = function (el, htOption) {
            this._el = el;
            this._htOption = htOption;
        };

        /**
         * Draw the QRCode
         *
         * @param {QRCode} oQRCode
         */
        Drawing.prototype.draw = function (oQRCode) {
            var _htOption = this._htOption;
            var _el = this._el;
            var nCount = oQRCode.getModuleCount();
            var nWidth = Math.floor(_htOption.width / nCount);
            var nHeight = Math.floor(_htOption.height / nCount);
            var aHTML = ['<table style="border:0;border-collapse:collapse;">'];

            for (var row = 0; row < nCount; row++) {
                aHTML.push('<tr>');

                for (var col = 0; col < nCount; col++) {
                    aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
                }

                aHTML.push('</tr>');
            }

            aHTML.push('</table>');
            _el.innerHTML = aHTML.join('');

            // Fix the margin values as real size.
            var elTable = _el.childNodes[0];
            var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
            var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;

            if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
                elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
            }
        };

        /**
         * Clear the QRCode
         */
        Drawing.prototype.clear = function () {
            this._el.innerHTML = '';
        };

        return Drawing;
    })() : (function () { // Drawing in Canvas
        function _onMakeImage() {
            this._elImage.src = this._elCanvas.toDataURL("image/png");
            this._elImage.style.display = "block";
            this._elCanvas.style.display = "none";
        }

        // Android 2.1 bug workaround
        // http://code.google.com/p/android/issues/detail?id=5141
        if (this._android && this._android <= 2.1) {
            var factor = 1 / window.devicePixelRatio;
            var drawImage = CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
                if (("nodeName" in image) && /img/i.test(image.nodeName)) {
                    for (var i = arguments.length - 1; i >= 1; i--) {
                        arguments[i] = arguments[i] * factor;
                    }
                } else if (typeof dw == "undefined") {
                    arguments[1] *= factor;
                    arguments[2] *= factor;
                    arguments[3] *= factor;
                    arguments[4] *= factor;
                }

                drawImage.apply(this, arguments);
            };
        }

        /**
         * Check whether the user's browser supports Data URI or not
         *
         * @private
         * @param {Function} fSuccess Occurs if it supports Data URI
         * @param {Function} fFail Occurs if it doesn't support Data URI
         */
        function _safeSetDataURI(fSuccess, fFail) {
            var self = this;
            self._fFail = fFail;
            self._fSuccess = fSuccess;

            // Check it just once
            if (self._bSupportDataURI === null) {
                var el = document.createElement("img");
                var fOnError = function() {
                    self._bSupportDataURI = false;

                    if (self._fFail) {
                        _fFail.call(self);
                    }
                };
                var fOnSuccess = function() {
                    self._bSupportDataURI = true;

                    if (self._fSuccess) {
                        self._fSuccess.call(self);
                    }
                };

                el.onabort = fOnError;
                el.onerror = fOnError;
                el.onload = fOnSuccess;
                el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
                return;
            } else if (self._bSupportDataURI === true && self._fSuccess) {
                self._fSuccess.call(self);
            } else if (self._bSupportDataURI === false && self._fFail) {
                self._fFail.call(self);
            }
        };

        /**
         * Drawing QRCode by using canvas
         *
         * @constructor
         * @param {HTMLElement} el
         * @param {Object} htOption QRCode Options
         */
        var Drawing = function (el, htOption) {
            this._bIsPainted = false;
            this._android = _getAndroid();

            this._htOption = htOption;
            this._elCanvas = document.createElement("canvas");
            this._elCanvas.width = htOption.width;
            this._elCanvas.height = htOption.height;
            el.appendChild(this._elCanvas);
            this._el = el;
            this._oContext = this._elCanvas.getContext("2d");
            this._bIsPainted = false;
            this._elImage = document.createElement("img");
            this._elImage.style.display = "none";
            this._el.appendChild(this._elImage);
            this._bSupportDataURI = null;
        };

        /**
         * Draw the QRCode
         *
         * @param {QRCode} oQRCode
         */
        Drawing.prototype.draw = function (oQRCode) {
            var _elImage = this._elImage;
            var _oContext = this._oContext;
            var _htOption = this._htOption;

            var nCount = oQRCode.getModuleCount();
            var nWidth = _htOption.width / nCount;
            var nHeight = _htOption.height / nCount;
            var nRoundedWidth = Math.round(nWidth);
            var nRoundedHeight = Math.round(nHeight);

            _elImage.style.display = "none";
            this.clear();

            for (var row = 0; row < nCount; row++) {
                for (var col = 0; col < nCount; col++) {
                    var bIsDark = oQRCode.isDark(row, col);
                    var nLeft = col * nWidth;
                    var nTop = row * nHeight;
                    _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                    _oContext.lineWidth = 1;
                    _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                    _oContext.fillRect(nLeft, nTop, nWidth, nHeight);

                    // 안티 앨리어싱 방지 처리
                    _oContext.strokeRect(
                        Math.floor(nLeft) + 0.5,
                        Math.floor(nTop) + 0.5,
                        nRoundedWidth,
                        nRoundedHeight
                    );

                    _oContext.strokeRect(
                        Math.ceil(nLeft) - 0.5,
                        Math.ceil(nTop) - 0.5,
                        nRoundedWidth,
                        nRoundedHeight
                    );
                }
            }

            this._bIsPainted = true;
        };

        /**
         * Make the image from Canvas if the browser supports Data URI.
         */
        Drawing.prototype.makeImage = function () {
            if (this._bIsPainted) {
                _safeSetDataURI.call(this, _onMakeImage);
            }
        };

        /**
         * Return whether the QRCode is painted or not
         *
         * @return {Boolean}
         */
        Drawing.prototype.isPainted = function () {
            return this._bIsPainted;
        };

        /**
         * Clear the QRCode
         */
        Drawing.prototype.clear = function () {
            this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
            this._bIsPainted = false;
        };

        /**
         * @private
         * @param {Number} nNumber
         */
        Drawing.prototype.round = function (nNumber) {
            if (!nNumber) {
                return nNumber;
            }

            return Math.floor(nNumber * 1000) / 1000;
        };

        return Drawing;
    })();

    /**
     * Get the type by string length
     *
     * @private
     * @param {String} sText
     * @param {Number} nCorrectLevel
     * @return {Number} type
     */
    function _getTypeNumber(sText, nCorrectLevel) {
        var nType = 1;
        var length = _getUTF8Length(sText);

        for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
            var nLimit = 0;

            switch (nCorrectLevel) {
                case QRErrorCorrectLevel.L :
                    nLimit = QRCodeLimitLength[i][0];
                    break;
                case QRErrorCorrectLevel.M :
                    nLimit = QRCodeLimitLength[i][1];
                    break;
                case QRErrorCorrectLevel.Q :
                    nLimit = QRCodeLimitLength[i][2];
                    break;
                case QRErrorCorrectLevel.H :
                    nLimit = QRCodeLimitLength[i][3];
                    break;
            }

            if (length <= nLimit) {
                break;
            } else {
                nType++;
            }
        }

        if (nType > QRCodeLimitLength.length) {
            throw new Error("Too long data");
        }

        return nType;
    }

    function _getUTF8Length(sText) {
        var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
        return replacedText.length + (replacedText.length != sText ? 3 : 0);
    }

    /**
     * @class QRCode
     * @constructor
     * @example
     * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
     *
     * @example
     * var oQRCode = new QRCode("test", {
     *    text : "http://naver.com",
     *    width : 128,
     *    height : 128
     * });
     *
     * oQRCode.clear(); // Clear the QRCode.
     * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
     *
     * @param {HTMLElement|String} el target element or 'id' attribute of element.
     * @param {Object|String} vOption
     * @param {String} vOption.text QRCode link data
     * @param {Number} [vOption.width=256]
     * @param {Number} [vOption.height=256]
     * @param {String} [vOption.colorDark="#000000"]
     * @param {String} [vOption.colorLight="#ffffff"]
     * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
     */
    QRCode = function (el, vOption) {
        this._htOption = {
            width : 256,
            height : 256,
            typeNumber : 4,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRErrorCorrectLevel.H
        };

        if (typeof vOption === 'string') {
            vOption = {
                text : vOption
            };
        }

        // Overwrites options
        if (vOption) {
            for (var i in vOption) {
                this._htOption[i] = vOption[i];
            }
        }

        if (typeof el == "string") {
            el = document.getElementById(el);
        }

        this._android = _getAndroid();
        this._el = el;
        this._oQRCode = null;
        this._oDrawing = new Drawing(this._el, this._htOption);

        if (this._htOption.text) {
            this.makeCode(this._htOption.text);
        }
    };

    /**
     * Make the QRCode
     *
     * @param {String} sText link data
     */
    QRCode.prototype.makeCode = function (sText) {
        this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
        this._oQRCode.addData(sText);
        this._oQRCode.make();
        this._el.title = sText;
        this._oDrawing.draw(this._oQRCode);
        this.makeImage();
    };

    /**
     * Make the Image from Canvas element
     * - It occurs automatically
     * - Android below 3 doesn't support Data-URI spec.
     *
     * @private
     */
    QRCode.prototype.makeImage = function () {
        if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
            this._oDrawing.makeImage();
        }
    };

    /**
     * Clear the QRCode
     */
    QRCode.prototype.clear = function () {
        this._oDrawing.clear();
    };

    /**
     * @name QRCode.CorrectLevel
     */
    QRCode.CorrectLevel = QRErrorCorrectLevel;
})();

exports.QRCode = QRCode;


},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWlra28vY29kZS90YXRpYW5hc3RvcmUvdGF0aWFuYXN0b3JlL3N0YXRpYy9iaXRjb2luYWRkcmVzcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21pa2tvL2NvZGUvdGF0aWFuYXN0b3JlL3RhdGlhbmFzdG9yZS9zdGF0aWMvYml0Y29pbmFkZHJlc3MvYml0Y29pbmFkZHJlc3MuanMiLCIvVXNlcnMvbWlra28vY29kZS90YXRpYW5hc3RvcmUvdGF0aWFuYXN0b3JlL3N0YXRpYy9iaXRjb2luYWRkcmVzcy9xcmNvZGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBiaXRjb2luYWRkcmVzcy5qc1xuICpcbiAqIEJpdGNvaW4gYWRkcmVzcyBhbmQgcGF5bWVudCBoZWxwZXIuXG4gKlxuICogQ29weXJpZ2h0IDIwMTMgTWlra28gT2h0YW1hYSBodHRwOi8vb3BlbnNvdXJjZWhhY2tlci5jb21cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZS5cbiAqL1xuXG5cbi8vIFBsZWFzZSBub3RlIHRoYXQgc2NyaXB0IHRoaXMgZGVwZW5kcyBvbiBqUXVlcnksXG4vLyBidXQgSSBkaWQgbm90IGZpbmQgYSBzb2x1dGlvbiBmb3IgaGF2aW5nIFVNRCBsb2FkaW5nIGZvciB0aGUgc2NyaXB0LFxuLy8gc28gdGhhdCBqUXVlcnkgd291bGQgYmUgYXZhaWxhYmxlIHRocm91Z2ggYnJvd3NlcmlmeSBidW5kbGluZ1xuLy8gT1IgQ0ROLiBJbmNsdWRlIGpRdWVyeSBleHRlcm5hbGx5IGJlZm9yZSBpbmNsdWRpbmcgdGhpcyBzY3JpcHQuXG5cbi8qIGdsb2JhbCBtb2R1bGUsIHJlcXVpcmUgKi9cbnZhciBxcmNvZGUgPSByZXF1aXJlKFwiLi9xcmNvZGUuanNcIik7XG5cbi8vIGpRdWVyeSByZWZlcmVuY2VcbnZhciAkO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGNvbmZpZyA6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgVVJMIGZvciBiaXRjb2luIFVSSSBzY2hlbWUgcGF5bWVudHMuXG4gICAgICpcbiAgICAgKiBodHRwczovL2dpdGh1Yi5jb20vYml0Y29pbi9iaXBzL2Jsb2IvbWFzdGVyL2JpcC0wMDIxLm1lZGlhd2lraSNFeGFtcGxlc1xuICAgICAqXG4gICAgICogaHR0cDovL2JpdGNvaW4uc3RhY2tleGNoYW5nZS5jb20vcXVlc3Rpb25zLzQ5ODcvYml0Y29pbi11cmwtc2NoZW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFkZHJlc3MgUmVjZWl2aW5nIGFkZHJlc3NcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFtb3VudCAgQW1vdW50IGFzIGJpZyBkZWNpbWFsXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBsYWJlbCAgIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcGFyYW0gIHtbdHlwZV19IG1lc3NhZ2UgW2Rlc2NyaXB0aW9uXVxuICAgICAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICBbZGVzY3JpcHRpb25dXG4gICAgICovXG4gICAgYnVpbGRCaXRjb2luVVJJIDogZnVuY3Rpb24oYWRkcmVzcywgYW1vdW50LCBsYWJlbCwgbWVzc2FnZSkge1xuICAgICAgICB2YXIgdG1wbCA9IFtcImJpdGNvaW46XCIsIGFkZHJlc3MsIFwiP1wiXTtcblxuICAgICAgICBpZihhbW91bnQpIHtcbiAgICAgICAgICAgIHRtcGwgPSB0bXBsLmNvbmNhdChbXCJhbW91bnQ9XCIsIGVuY29kZVVSSUNvbXBvbmVudChhbW91bnQpLCBcIiZcIl0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYobGFiZWwpIHtcbiAgICAgICAgICAgIHRtcGwgPSB0bXBsLmNvbmNhdChbXCJsYWJlbD1cIiwgZW5jb2RlVVJJQ29tcG9uZW50KGxhYmVsKSwgXCImXCJdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRtcGwgPSB0bXBsLmNvbmNhdChbXCJtZXNzYWdlPVwiLCBlbmNvZGVVUklDb21wb25lbnQobWVzc2FnZSksIFwiJlwiXSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVtb3ZlIHByZWZpeGluZyBleHRyYVxuICAgICAgICB2YXIgbGFzdGMgPSB0bXBsW3RtcGwubGVuZ3RoLTFdO1xuICAgICAgICBpZihsYXN0YyA9PSBcIiZcIiB8fCBsYXN0YyA9PSBcIj9cIikge1xuICAgICAgICAgICAgdG1wbCA9IHRtcGwuc3BsaWNlKDAsIHRtcGwubGVuZ3RoLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRtcGwuam9pbihcIlwiKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgc3BlY2lhbCBIVE1MIGZvciBiaXRjb2luIGFkZHJlc3MgbWFuaXB1bGF0aW9uLlxuICAgICAqIEBwYXJhbSAge0RPTX0gZWxlbSAgIFRlbXBsYXRpemVkIHRhcmdldFxuICAgICAqIEBwYXJhbSAge0RPTX0gc291cmNlIE9yaWdpbmFsIHNvdXJjZSB0cmVlIGVsZW1lbnQgd2l0aCBkYXRhIGF0dHJpYnV0ZXNcbiAgICAgKi9cbiAgICBidWlsZENvbnRyb2xzIDogZnVuY3Rpb24oZWxlbSwgc291cmNlKSB7XG5cbiAgICAgICAgLy8gUmVwbGFjZSAuYml0Y29pbi1hZGRyZXNzIGluIHRoZSB0ZW1wbGF0ZVxuICAgICAgICB2YXIgYWRkciA9IGVsZW0uZmluZChcIi5iaXRjb2luLWFkZHJlc3NcIik7XG5cbiAgICAgICAgLy8gQWRkIGEgbWFrZXIgY2xhc3Mgc28gdGhhdCB3ZSBkb24ndCByZWFwcGx5IHRlbXBsYXRlXG4gICAgICAgIC8vIG9uIHRoZSBzdWJzZXF1ZW50IHNjYW5zXG4gICAgICAgIGFkZHIuYWRkQ2xhc3MoXCJiaXRjb2luLWFkZHJlc3MtY29udHJvbHNcIik7XG5cbiAgICAgICAgYWRkci50ZXh0KHNvdXJjZS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpKTtcblxuICAgICAgICAvLyBDb3B5IG9yaWduYWwgYXR0cmlidXRlcztcbiAgICAgICAgJC5lYWNoKFtcImFkZHJlc3NcIiwgXCJhbW91bnRcIiwgXCJsYWJlbFwiLCBcIm1lc3NhZ2VcIl0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGF0dHJOYW1lID0gXCJkYXRhLWJjLVwiICsgdGhpcztcbiAgICAgICAgICAgIGVsZW0uYXR0cihhdHRyTmFtZSwgc291cmNlLmF0dHIoYXR0ck5hbWUpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgQlRDIFVSTFxuICAgICAgICB2YXIgdXJsID0gdGhpcy5idWlsZEJpdGNvaW5VUkkoc291cmNlLmF0dHIoXCJkYXRhLWJjLWFkZHJlc3NcIiksXG4gICAgICAgICAgICBzb3VyY2UuYXR0cihcImRhdGEtYmMtYW1vdW50XCIpLFxuICAgICAgICAgICAgc291cmNlLmF0dHIoXCJkYXRhLWJjLWxhYmVsXCIpLFxuICAgICAgICAgICAgc291cmNlLmF0dHIoXCJkYXRhLWJjLW1lc3NhZ2VcIikpO1xuXG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFkZHJlc3MtYWN0aW9uLXNlbmRcIikuYXR0cihcImhyZWZcIiwgdXJsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB0ZW1wbGF0ZSBlbGVtZW50IGRlZmluZWQgaW4gdGhlIG9wdGlvbnMuXG4gICAgICogQHJldHVybiB7W3R5cGVdfSBbZGVzY3JpcHRpb25dXG4gICAgICovXG4gICAgZ2V0VGVtcGxhdGUgOiBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmNvbmZpZy50ZW1wbGF0ZSk7XG5cbiAgICAgICAgaWYoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCaXRjb2luIGFkZHJlc3MgdGVtcGxhdGUgZWxlbWVudCBtaXNzaW5nOlwiICsgdGhpcy5jb25maWcudGVtcGxhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcGxhdGUgPSAkKHRlbXBsYXRlKTtcblxuICAgICAgICBpZih0ZW1wbGF0ZS5zaXplKCkgIT0gMSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQml0Y29pbiBhZGRyZXNzIHRlbXBsYXRlIERPTSBkb2VzIG5vdCBjb250YWluIGEgc2luZ2xlIGVsZW1lbnRcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgYml0Y29pbmFkZHJlc3MgRE9NIHRlbXBsYXRlIHRvIGEgY2VydGFpbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogVGhlIGB0YXJnZXRgIGVsZW1lbnQgbXVzdCBjb250YWluIG5lY2Vzc2FyeSBkYXRhLWF0dHJpYnV0ZXNcbiAgICAgKiBmcm9tIHdoZXJlIHdlIHNjb29wIHRoZSBpbmZvLlxuICAgICAqXG4gICAgICogQWxzbyBidWlsZHMgYml0Y29pbjogVVJJLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW0galF1ZXJ5IHNlbGVjdGlvbiBvZiB0YXJnZXQgYml0Y29pbiBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtqUXVlcnl9IHRlbXBsYXRlIChvcHRpb25hbCkgVGVtcGxhdGUgZWxlbWVudCB0byBiZSBhcHBsaWVkXG4gICAgICovXG4gICAgYXBwbHlUZW1wbGF0ZSA6IGZ1bmN0aW9uKHRhcmdldCwgdGVtcGxhdGUpIHtcblxuICAgICAgICBpZighdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRlbXBsYXRlID0gdGhpcy5nZXRUZW1wbGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFrZSBhIGRlZXAgY29weSwgc28gd2UgZG9uJ3QgYWNjaWRlbnRhbGx5IG1vZGlmeVxuICAgICAgICAvLyB0ZW1wbGF0ZSBlbGVtZW50cyBpbi1wbGFjZVxuICAgICAgICB2YXIgZWxlbSA9IHRlbXBsYXRlLmNsb25lKGZhbHNlLCB0cnVlKTtcblxuICAgICAgICB0aGlzLmJ1aWxkQ29udHJvbHMoZWxlbSwgdGFyZ2V0KTtcblxuICAgICAgICAvLyBNYWtlIHN1cmUgd2UgYXJlIHZpc2libGUgKEhUTUw1IHdheSwgQ1NTIHdheSlcbiAgICAgICAgLy8gYW5kIGNsZWFuIHVwIHRoZSB0ZW1wbGF0ZSBpZCBpZiB3ZSBtYW5hZ2VkIHRvIGNvcHkgaXQgYXJvdW5kXG4gICAgICAgIGVsZW0ucmVtb3ZlQXR0cihcImhpZGRlbiBpZFwiKTtcblxuICAgICAgICBlbGVtLnNob3coKTtcblxuICAgICAgICB0YXJnZXQucmVwbGFjZVdpdGgoZWxlbSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNjYW4gdGhlIHBhZ2UgZm9yIGJpdGNvaW4gYWRkcmVzc2VzLlxuICAgICAqXG4gICAgICogQ3JlYXRlIHVzZXIgaW50ZXJmYWNlIGZvciBhbGwgYml0Y29pbiBhZGRyZXNzIGVsZW1lbnRzIG9uIHRoZSBwYWdlLS5cbiAgICAgKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiBtdWx0aXBsZSB0aW1lcyBpZiBuZXcgYml0Y29pbiBhZGRyZXNzZXMgYmVjb21lIGF2YWlsYWJsZS5cbiAgICAgKi9cbiAgICBzY2FuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMuZ2V0VGVtcGxhdGUoKTtcblxuICAgICAgICAvLyBPcHRpb25hbGx5IGJhaWwgb3V0IGlmIHRoZSBkZWZhdWx0IHNlbGVjdGlvblxuICAgICAgICAvLyBpcyBub3QgZ2l2ZW4gKHVzZXIgY2FsbHMgYXBwbHlUZW1wbGF0ZSgpIG1hbnVhbGx5KVxuICAgICAgICBpZighdGhpcy5jb25maWcuc2VsZWN0b3IpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcy5jb25maWcuc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBsYXRlIGFscmVhZHkgYXBwbGllZFxuICAgICAgICAgICAgaWYoJHRoaXMuaGFzQ2xhc3MoXCJiaXRjb2luLWFkZHJlc3MtY29udHJvbHNcIikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBkb24ndCBhcHBseSB0aGUgdGVtcGxhdGUgb24gdGhlIHRlbXBsYXRlIGl0c2VsZlxuICAgICAgICAgICAgaWYoJHRoaXMucGFyZW50cyhcIiNcIiArIHNlbGYuY29uZmlnLnRlbXBsYXRlKS5zaXplKCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEb24ndCByZWFwcGx5IHRlbXBsYXRlcyBvbiBzdWJzZXF1ZW50IHNjYW5zXG5cbiAgICAgICAgICAgIHNlbGYuYXBwbHlUZW1wbGF0ZSgkdGhpcywgdGVtcGxhdGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBzZWxlY3Rpb24gaW4gLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXIgZm9yIGNvcHkgcGFzdGVcbiAgICAgKi9cbiAgICBwcmVwYXJlQ29weVNlbGVjdGlvbiA6IGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgICAgdmFyIGFkZHkgPSBlbGVtLmZpbmQoXCIuYml0Y29pbi1hZGRyZXNzXCIpO1xuICAgICAgICB3aW5kb3cuZ2V0U2VsZWN0aW9uKCkuc2VsZWN0QWxsQ2hpbGRyZW4oYWRkeS5nZXQoMCkpO1xuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludFwiKS5oaWRlKCk7XG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50LWNvcHlcIikuc2xpZGVEb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgcGF5bWVudCBhY3Rpb24gaGFuZGxlclxuICAgICAqL1xuICAgIG9uQWN0aW9uU2VuZCA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIC8vIFdlIG5ldmVyIGtub3cgaWYgdGhlIGNsaWNrIGFjdGlvbiB3YXMgc3VjY2VzZnVsbHkgY29tcGxldGVcbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnRcIikuaGlkZSgpO1xuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludC1zZW5kXCIpLnNsaWRlRG93bigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGFjdGlvbiBoYW5kbGVyLlxuICAgICAqL1xuICAgIG9uQWN0aW9uQ29weSA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHMoXCIuYml0Y29pbi1hZGRyZXNzLWNvbnRhaW5lclwiKTtcbiAgICAgICAgdGhpcy5wcmVwYXJlQ29weVNlbGVjdGlvbihlbGVtKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBRUiBjb2RlIGluc2lkZSB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gICAgICovXG4gICAgZ2VuZXJhdGVRUiA6IGZ1bmN0aW9uKHFyQ29udGFpbmVyKSB7XG5cbiAgICAgICAgdmFyIGVsZW0gPSBxckNvbnRhaW5lci5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIC8vdmFyIGFkZHIgPSBlbGVtLmF0dHIoXCJkYXRhLWJjLWFkZHJlc3NcIik7XG5cbiAgICAgICAgdmFyIHVybCA9IHRoaXMuYnVpbGRCaXRjb2luVVJJKGVsZW0uYXR0cihcImRhdGEtYmMtYWRkcmVzc1wiKSxcbiAgICAgICAgICAgIGVsZW0uYXR0cihcImRhdGEtYmMtYW1vdW50XCIpLFxuICAgICAgICAgICAgZWxlbS5hdHRyKFwiZGF0YS1iYy1sYWJlbFwiKSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJRUiBhZGRyZXNzIFVSTCBpcyBcIiwgdXJsKTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLmNvbmZpZy5xciwge1xuICAgICAgICAgICAgdGV4dDogdXJsXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgcXJDb2RlID0gbmV3IHFyY29kZS5RUkNvZGUocXJDb250YWluZXIuZ2V0KDApLCBvcHRpb25zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUVIgY29kZSBnZW5lcmF0aW9uIGFjdGlvbi5cbiAgICAgKi9cbiAgICBvbkFjdGlvblFSIDogZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBlbGVtID0gJChlLnRhcmdldCkucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICB2YXIgYWRkciA9IGVsZW0uYXR0cihcImRhdGEtYmMtYWRkcmVzc1wiKTtcbiAgICAgICAgdmFyIHFyQ29udGFpbmVyID0gZWxlbS5maW5kKFwiLmJpdGNvaW4tYWRkcmVzcy1xci1jb250YWluZXJcIik7XG5cbiAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIHRoZSBRUiBjb2RlXG4gICAgICAgIGlmKHFyQ29udGFpbmVyLmNoaWxkcmVuKCkuc2l6ZSgpID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmdlbmVyYXRlUVIocXJDb250YWluZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnRcIikuaGlkZSgpO1xuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludC1xclwiKS5zbGlkZURvd24oKTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIG9uQ2xpY2sgOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBlbGVtID0gJChlLnRhcmdldCkucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICB0aGlzLnByZXBhcmVDb3B5U2VsZWN0aW9uKGVsZW0pO1xuICAgIH0sXG5cbiAgICBpbml0VVggOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkub24oXCJjbGlja1wiLCBcIi5iaXRjb2luLWFkZHJlc3MtYWN0aW9uLWNvcHlcIiwgJC5wcm94eSh0aGlzLm9uQWN0aW9uQ29weSwgdGhpcykpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLm9uKFwiY2xpY2tcIiwgXCIuYml0Y29pbi1hZGRyZXNzLWFjdGlvbi1zZW5kXCIsICQucHJveHkodGhpcy5vbkFjdGlvblNlbmQsIHRoaXMpKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNsaWNrXCIsIFwiLmJpdGNvaW4tYWRkcmVzcy1hY3Rpb24tcXJcIiwgJC5wcm94eSh0aGlzLm9uQWN0aW9uUVIsIHRoaXMpKTtcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNsaWNrXCIsIFwiLmJpdGNvaW4tYWRkcmVzc1wiLCAkLnByb3h5KHRoaXMub25DbGljaywgdGhpcykpO1xuXG4gICAgICAgIC8vIEhpZGUgYW55IGNvcHkgaGludHMgd2hlbiB1c2VyIHByZXNzZXMgQ1RSTCtDXG4gICAgICAgIC8vIG9uIGFueSBwYXJ0IG9mIHRoZSBwYWdlXG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkub24oXCJjb3B5XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJChcIi5iaXRjb2luLWFjdGlvbi1oaW50LWNvcHlcIikuc2xpZGVVcCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZih0aGlzLmNvbmZpZy5nZW5lcmF0ZVFSRWFnZXJseSkge1xuICAgICAgICAgICAgJChcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsZW0gPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgIHZhciBhZGRyID0gZWxlbS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpO1xuICAgICAgICAgICAgICAgIHZhciBxckNvbnRhaW5lciA9IGVsZW0uZmluZChcIi5iaXRjb2luLWFkZHJlc3MtcXItY29udGFpbmVyXCIpO1xuICAgICAgICAgICAgICAgIHNlbGYuZ2VuZXJhdGVRUihxckNvbnRhaW5lcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGwgdG8gaW5pdGlhbGl6ZSB0aGUgZGV0YXVsdCBiaXRjb2lucHJpY2VzIFVJLlxuICAgICAqL1xuICAgIGluaXQgOiBmdW5jdGlvbihfY29uZmlnKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICBpZighX2NvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG11c3QgZ2l2ZSBiaXRjb2luYWRkcmVzcyBjb25maWcgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29uZmlnID0gX2NvbmZpZztcbiAgICAgICAgJCA9IHRoaXMuY29uZmlnLmpRdWVyeSB8fCBqUXVlcnk7XG4gICAgICAgIHRoaXMuc2NhbigpO1xuICAgICAgICB0aGlzLmluaXRVWCgpO1xuICAgIH1cbn07XG4iLCJ2YXIgZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTsvKipcbiAqIEBmaWxlb3ZlcnZpZXdcbiAqIC0gVXNpbmcgdGhlICdRUkNvZGUgZm9yIEphdmFzY3JpcHQgbGlicmFyeSdcbiAqIC0gRml4ZWQgZGF0YXNldCBvZiAnUVJDb2RlIGZvciBKYXZhc2NyaXB0IGxpYnJhcnknIGZvciBzdXBwb3J0IGZ1bGwtc3BlYy5cbiAqIC0gdGhpcyBsaWJyYXJ5IGhhcyBubyBkZXBlbmRlbmNpZXMuXG4gKlxuICogQGF1dGhvciBkYXZpZHNoaW1qc1xuICogQHNlZSA8YSBocmVmPVwiaHR0cDovL3d3dy5kLXByb2plY3QuY29tL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS88L2E+XG4gKiBAc2VlIDxhIGhyZWY9XCJodHRwOi8vamVyb21lZXRpZW5uZS5naXRodWIuY29tL2pxdWVyeS1xcmNvZGUvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cDovL2plcm9tZWV0aWVubmUuZ2l0aHViLmNvbS9qcXVlcnktcXJjb2RlLzwvYT5cbiAqL1xuXG4vKiBnbG9iYWwgZG9jdW1lbnQgKi9cblxudmFyIFFSQ29kZTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFFSQ29kZSBmb3IgSmF2YVNjcmlwdFxuICAgIC8vXG4gICAgLy8gQ29weXJpZ2h0IChjKSAyMDA5IEthenVoaWtvIEFyYXNlXG4gICAgLy9cbiAgICAvLyBVUkw6IGh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS9cbiAgICAvL1xuICAgIC8vIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZTpcbiAgICAvLyAgIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gICAgLy9cbiAgICAvLyBUaGUgd29yZCBcIlFSIENvZGVcIiBpcyByZWdpc3RlcmVkIHRyYWRlbWFyayBvZlxuICAgIC8vIERFTlNPIFdBVkUgSU5DT1JQT1JBVEVEXG4gICAgLy8gICBodHRwOi8vd3d3LmRlbnNvLXdhdmUuY29tL3FyY29kZS9mYXFwYXRlbnQtZS5odG1sXG4gICAgLy9cbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGZ1bmN0aW9uIFFSOGJpdEJ5dGUoZGF0YSkge1xuICAgICAgICB0aGlzLm1vZGUgPSBRUk1vZGUuTU9ERV84QklUX0JZVEU7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMucGFyc2VkRGF0YSA9IFtdO1xuXG4gICAgICAgIC8vIEFkZGVkIHRvIHN1cHBvcnQgVVRGLTggQ2hhcmFjdGVyc1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBieXRlQXJyYXkgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb2RlID0gdGhpcy5kYXRhLmNoYXJDb2RlQXQoaSk7XG5cbiAgICAgICAgICAgIGlmIChjb2RlID4gMHgxMDAwMCkge1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVswXSA9IDB4RjAgfCAoKGNvZGUgJiAweDFDMDAwMCkgPj4+IDE4KTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMV0gPSAweDgwIHwgKChjb2RlICYgMHgzRjAwMCkgPj4+IDEyKTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMl0gPSAweDgwIHwgKChjb2RlICYgMHhGQzApID4+PiA2KTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbM10gPSAweDgwIHwgKGNvZGUgJiAweDNGKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29kZSA+IDB4ODAwKSB7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzBdID0gMHhFMCB8ICgoY29kZSAmIDB4RjAwMCkgPj4+IDEyKTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMV0gPSAweDgwIHwgKChjb2RlICYgMHhGQzApID4+PiA2KTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMl0gPSAweDgwIHwgKGNvZGUgJiAweDNGKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29kZSA+IDB4ODApIHtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMF0gPSAweEMwIHwgKChjb2RlICYgMHg3QzApID4+PiA2KTtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMV0gPSAweDgwIHwgKGNvZGUgJiAweDNGKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzBdID0gY29kZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5wYXJzZWREYXRhLnB1c2goYnl0ZUFycmF5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucGFyc2VkRGF0YSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIHRoaXMucGFyc2VkRGF0YSk7XG5cbiAgICAgICAgaWYgKHRoaXMucGFyc2VkRGF0YS5sZW5ndGggIT0gdGhpcy5kYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wYXJzZWREYXRhLnVuc2hpZnQoMTkxKTtcbiAgICAgICAgICAgIHRoaXMucGFyc2VkRGF0YS51bnNoaWZ0KDE4Nyk7XG4gICAgICAgICAgICB0aGlzLnBhcnNlZERhdGEudW5zaGlmdCgyMzkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgUVI4Yml0Qnl0ZS5wcm90b3R5cGUgPSB7XG4gICAgICAgIGdldExlbmd0aDogZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VkRGF0YS5sZW5ndGg7XG4gICAgICAgIH0sXG4gICAgICAgIHdyaXRlOiBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMucGFyc2VkRGF0YS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBidWZmZXIucHV0KHRoaXMucGFyc2VkRGF0YVtpXSwgOCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gUVJDb2RlTW9kZWwodHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpIHtcbiAgICAgICAgdGhpcy50eXBlTnVtYmVyID0gdHlwZU51bWJlcjtcbiAgICAgICAgdGhpcy5lcnJvckNvcnJlY3RMZXZlbCA9IGVycm9yQ29ycmVjdExldmVsO1xuICAgICAgICB0aGlzLm1vZHVsZXMgPSBudWxsO1xuICAgICAgICB0aGlzLm1vZHVsZUNvdW50ID0gMDtcbiAgICAgICAgdGhpcy5kYXRhQ2FjaGUgPSBudWxsO1xuICAgICAgICB0aGlzLmRhdGFMaXN0ID0gW107XG4gICAgfVxuXG4gICAgUVJDb2RlTW9kZWwucHJvdG90eXBlPXthZGREYXRhOmZ1bmN0aW9uKGRhdGEpe3ZhciBuZXdEYXRhPW5ldyBRUjhiaXRCeXRlKGRhdGEpO3RoaXMuZGF0YUxpc3QucHVzaChuZXdEYXRhKTt0aGlzLmRhdGFDYWNoZT1udWxsO30saXNEYXJrOmZ1bmN0aW9uKHJvdyxjb2wpe2lmKHJvdzwwfHx0aGlzLm1vZHVsZUNvdW50PD1yb3d8fGNvbDwwfHx0aGlzLm1vZHVsZUNvdW50PD1jb2wpe3Rocm93IG5ldyBFcnJvcihyb3crXCIsXCIrY29sKTt9XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlc1tyb3ddW2NvbF07fSxnZXRNb2R1bGVDb3VudDpmdW5jdGlvbigpe3JldHVybiB0aGlzLm1vZHVsZUNvdW50O30sbWFrZTpmdW5jdGlvbigpe3RoaXMubWFrZUltcGwoZmFsc2UsdGhpcy5nZXRCZXN0TWFza1BhdHRlcm4oKSk7fSxtYWtlSW1wbDpmdW5jdGlvbih0ZXN0LG1hc2tQYXR0ZXJuKXt0aGlzLm1vZHVsZUNvdW50PXRoaXMudHlwZU51bWJlcio0KzE3O3RoaXMubW9kdWxlcz1uZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7Zm9yKHZhciByb3c9MDtyb3c8dGhpcy5tb2R1bGVDb3VudDtyb3crKyl7dGhpcy5tb2R1bGVzW3Jvd109bmV3IEFycmF5KHRoaXMubW9kdWxlQ291bnQpO2Zvcih2YXIgY29sPTA7Y29sPHRoaXMubW9kdWxlQ291bnQ7Y29sKyspe3RoaXMubW9kdWxlc1tyb3ddW2NvbF09bnVsbDt9fVxuICAgIHRoaXMuc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybigwLDApO3RoaXMuc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybih0aGlzLm1vZHVsZUNvdW50LTcsMCk7dGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsdGhpcy5tb2R1bGVDb3VudC03KTt0aGlzLnNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuKCk7dGhpcy5zZXR1cFRpbWluZ1BhdHRlcm4oKTt0aGlzLnNldHVwVHlwZUluZm8odGVzdCxtYXNrUGF0dGVybik7aWYodGhpcy50eXBlTnVtYmVyPj03KXt0aGlzLnNldHVwVHlwZU51bWJlcih0ZXN0KTt9XG4gICAgaWYodGhpcy5kYXRhQ2FjaGU9PW51bGwpe3RoaXMuZGF0YUNhY2hlPVFSQ29kZU1vZGVsLmNyZWF0ZURhdGEodGhpcy50eXBlTnVtYmVyLHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwsdGhpcy5kYXRhTGlzdCk7fVxuICAgIHRoaXMubWFwRGF0YSh0aGlzLmRhdGFDYWNoZSxtYXNrUGF0dGVybik7fSxzZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuOmZ1bmN0aW9uKHJvdyxjb2wpe2Zvcih2YXIgcj0tMTtyPD03O3IrKyl7aWYocm93K3I8PS0xfHx0aGlzLm1vZHVsZUNvdW50PD1yb3crciljb250aW51ZTtmb3IodmFyIGM9LTE7Yzw9NztjKyspe2lmKGNvbCtjPD0tMXx8dGhpcy5tb2R1bGVDb3VudDw9Y29sK2MpY29udGludWU7aWYoKDA8PXImJnI8PTYmJihjPT0wfHxjPT02KSl8fCgwPD1jJiZjPD02JiYocj09MHx8cj09NikpfHwoMjw9ciYmcjw9NCYmMjw9YyYmYzw9NCkpe3RoaXMubW9kdWxlc1tyb3crcl1bY29sK2NdPXRydWU7fWVsc2V7dGhpcy5tb2R1bGVzW3JvdytyXVtjb2wrY109ZmFsc2U7fX19fSxnZXRCZXN0TWFza1BhdHRlcm46ZnVuY3Rpb24oKXt2YXIgbWluTG9zdFBvaW50PTA7dmFyIHBhdHRlcm49MDtmb3IodmFyIGk9MDtpPDg7aSsrKXt0aGlzLm1ha2VJbXBsKHRydWUsaSk7dmFyIGxvc3RQb2ludD1RUlV0aWwuZ2V0TG9zdFBvaW50KHRoaXMpO2lmKGk9PTB8fG1pbkxvc3RQb2ludD5sb3N0UG9pbnQpe21pbkxvc3RQb2ludD1sb3N0UG9pbnQ7cGF0dGVybj1pO319XG4gICAgcmV0dXJuIHBhdHRlcm47fSxjcmVhdGVNb3ZpZUNsaXA6ZnVuY3Rpb24odGFyZ2V0X21jLGluc3RhbmNlX25hbWUsZGVwdGgpe3ZhciBxcl9tYz10YXJnZXRfbWMuY3JlYXRlRW1wdHlNb3ZpZUNsaXAoaW5zdGFuY2VfbmFtZSxkZXB0aCk7dmFyIGNzPTE7dGhpcy5tYWtlKCk7Zm9yKHZhciByb3c9MDtyb3c8dGhpcy5tb2R1bGVzLmxlbmd0aDtyb3crKyl7dmFyIHk9cm93KmNzO2Zvcih2YXIgY29sPTA7Y29sPHRoaXMubW9kdWxlc1tyb3ddLmxlbmd0aDtjb2wrKyl7dmFyIHg9Y29sKmNzO3ZhciBkYXJrPXRoaXMubW9kdWxlc1tyb3ddW2NvbF07aWYoZGFyayl7cXJfbWMuYmVnaW5GaWxsKDAsMTAwKTtxcl9tYy5tb3ZlVG8oeCx5KTtxcl9tYy5saW5lVG8oeCtjcyx5KTtxcl9tYy5saW5lVG8oeCtjcyx5K2NzKTtxcl9tYy5saW5lVG8oeCx5K2NzKTtxcl9tYy5lbmRGaWxsKCk7fX19XG4gICAgcmV0dXJuIHFyX21jO30sc2V0dXBUaW1pbmdQYXR0ZXJuOmZ1bmN0aW9uKCl7Zm9yKHZhciByPTg7cjx0aGlzLm1vZHVsZUNvdW50LTg7cisrKXtpZih0aGlzLm1vZHVsZXNbcl1bNl0hPW51bGwpe2NvbnRpbnVlO31cbiAgICB0aGlzLm1vZHVsZXNbcl1bNl09KHIlMj09MCk7fVxuICAgIGZvcih2YXIgYz04O2M8dGhpcy5tb2R1bGVDb3VudC04O2MrKyl7aWYodGhpcy5tb2R1bGVzWzZdW2NdIT1udWxsKXtjb250aW51ZTt9XG4gICAgdGhpcy5tb2R1bGVzWzZdW2NdPShjJTI9PTApO319LHNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuOmZ1bmN0aW9uKCl7dmFyIHBvcz1RUlV0aWwuZ2V0UGF0dGVyblBvc2l0aW9uKHRoaXMudHlwZU51bWJlcik7Zm9yKHZhciBpPTA7aTxwb3MubGVuZ3RoO2krKyl7Zm9yKHZhciBqPTA7ajxwb3MubGVuZ3RoO2orKyl7dmFyIHJvdz1wb3NbaV07dmFyIGNvbD1wb3Nbal07aWYodGhpcy5tb2R1bGVzW3Jvd11bY29sXSE9bnVsbCl7Y29udGludWU7fVxuICAgIGZvcih2YXIgcj0tMjtyPD0yO3IrKyl7Zm9yKHZhciBjPS0yO2M8PTI7YysrKXtpZihyPT0tMnx8cj09Mnx8Yz09LTJ8fGM9PTJ8fChyPT0wJiZjPT0wKSl7dGhpcy5tb2R1bGVzW3JvdytyXVtjb2wrY109dHJ1ZTt9ZWxzZXt0aGlzLm1vZHVsZXNbcm93K3JdW2NvbCtjXT1mYWxzZTt9fX19fX0sc2V0dXBUeXBlTnVtYmVyOmZ1bmN0aW9uKHRlc3Qpe3ZhciBiaXRzPVFSVXRpbC5nZXRCQ0hUeXBlTnVtYmVyKHRoaXMudHlwZU51bWJlcik7Zm9yKHZhciBpPTA7aTwxODtpKyspe3ZhciBtb2Q9KCF0ZXN0JiYoKGJpdHM+PmkpJjEpPT0xKTt0aGlzLm1vZHVsZXNbTWF0aC5mbG9vcihpLzMpXVtpJTMrdGhpcy5tb2R1bGVDb3VudC04LTNdPW1vZDt9XG4gICAgZm9yKHZhciBpPTA7aTwxODtpKyspe3ZhciBtb2Q9KCF0ZXN0JiYoKGJpdHM+PmkpJjEpPT0xKTt0aGlzLm1vZHVsZXNbaSUzK3RoaXMubW9kdWxlQ291bnQtOC0zXVtNYXRoLmZsb29yKGkvMyldPW1vZDt9fSxzZXR1cFR5cGVJbmZvOmZ1bmN0aW9uKHRlc3QsbWFza1BhdHRlcm4pe3ZhciBkYXRhPSh0aGlzLmVycm9yQ29ycmVjdExldmVsPDwzKXxtYXNrUGF0dGVybjt2YXIgYml0cz1RUlV0aWwuZ2V0QkNIVHlwZUluZm8oZGF0YSk7Zm9yKHZhciBpPTA7aTwxNTtpKyspe3ZhciBtb2Q9KCF0ZXN0JiYoKGJpdHM+PmkpJjEpPT0xKTtpZihpPDYpe3RoaXMubW9kdWxlc1tpXVs4XT1tb2Q7fWVsc2UgaWYoaTw4KXt0aGlzLm1vZHVsZXNbaSsxXVs4XT1tb2Q7fWVsc2V7dGhpcy5tb2R1bGVzW3RoaXMubW9kdWxlQ291bnQtMTUraV1bOF09bW9kO319XG4gICAgZm9yKHZhciBpPTA7aTwxNTtpKyspe3ZhciBtb2Q9KCF0ZXN0JiYoKGJpdHM+PmkpJjEpPT0xKTtpZihpPDgpe3RoaXMubW9kdWxlc1s4XVt0aGlzLm1vZHVsZUNvdW50LWktMV09bW9kO31lbHNlIGlmKGk8OSl7dGhpcy5tb2R1bGVzWzhdWzE1LWktMSsxXT1tb2Q7fWVsc2V7dGhpcy5tb2R1bGVzWzhdWzE1LWktMV09bW9kO319XG4gICAgdGhpcy5tb2R1bGVzW3RoaXMubW9kdWxlQ291bnQtOF1bOF09KCF0ZXN0KTt9LG1hcERhdGE6ZnVuY3Rpb24oZGF0YSxtYXNrUGF0dGVybil7dmFyIGluYz0tMTt2YXIgcm93PXRoaXMubW9kdWxlQ291bnQtMTt2YXIgYml0SW5kZXg9Nzt2YXIgYnl0ZUluZGV4PTA7Zm9yKHZhciBjb2w9dGhpcy5tb2R1bGVDb3VudC0xO2NvbD4wO2NvbC09Mil7aWYoY29sPT02KWNvbC0tO3doaWxlKHRydWUpe2Zvcih2YXIgYz0wO2M8MjtjKyspe2lmKHRoaXMubW9kdWxlc1tyb3ddW2NvbC1jXT09bnVsbCl7dmFyIGRhcms9ZmFsc2U7aWYoYnl0ZUluZGV4PGRhdGEubGVuZ3RoKXtkYXJrPSgoKGRhdGFbYnl0ZUluZGV4XT4+PmJpdEluZGV4KSYxKT09MSk7fVxuICAgIHZhciBtYXNrPVFSVXRpbC5nZXRNYXNrKG1hc2tQYXR0ZXJuLHJvdyxjb2wtYyk7aWYobWFzayl7ZGFyaz0hZGFyazt9XG4gICAgdGhpcy5tb2R1bGVzW3Jvd11bY29sLWNdPWRhcms7Yml0SW5kZXgtLTtpZihiaXRJbmRleD09LTEpe2J5dGVJbmRleCsrO2JpdEluZGV4PTc7fX19XG4gICAgcm93Kz1pbmM7aWYocm93PDB8fHRoaXMubW9kdWxlQ291bnQ8PXJvdyl7cm93LT1pbmM7aW5jPS1pbmM7YnJlYWs7fX19fX07UVJDb2RlTW9kZWwuUEFEMD0weEVDO1FSQ29kZU1vZGVsLlBBRDE9MHgxMTtRUkNvZGVNb2RlbC5jcmVhdGVEYXRhPWZ1bmN0aW9uKHR5cGVOdW1iZXIsZXJyb3JDb3JyZWN0TGV2ZWwsZGF0YUxpc3Qpe3ZhciByc0Jsb2Nrcz1RUlJTQmxvY2suZ2V0UlNCbG9ja3ModHlwZU51bWJlcixlcnJvckNvcnJlY3RMZXZlbCk7dmFyIGJ1ZmZlcj1uZXcgUVJCaXRCdWZmZXIoKTtmb3IodmFyIGk9MDtpPGRhdGFMaXN0Lmxlbmd0aDtpKyspe3ZhciBkYXRhPWRhdGFMaXN0W2ldO2J1ZmZlci5wdXQoZGF0YS5tb2RlLDQpO2J1ZmZlci5wdXQoZGF0YS5nZXRMZW5ndGgoKSxRUlV0aWwuZ2V0TGVuZ3RoSW5CaXRzKGRhdGEubW9kZSx0eXBlTnVtYmVyKSk7ZGF0YS53cml0ZShidWZmZXIpO31cbiAgICB2YXIgdG90YWxEYXRhQ291bnQ9MDtmb3IodmFyIGk9MDtpPHJzQmxvY2tzLmxlbmd0aDtpKyspe3RvdGFsRGF0YUNvdW50Kz1yc0Jsb2Nrc1tpXS5kYXRhQ291bnQ7fVxuICAgIGlmKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKT50b3RhbERhdGFDb3VudCo4KXt0aHJvdyBuZXcgRXJyb3IoXCJjb2RlIGxlbmd0aCBvdmVyZmxvdy4gKFwiXG4gICAgK2J1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKVxuICAgICtcIj5cIlxuICAgICt0b3RhbERhdGFDb3VudCo4XG4gICAgK1wiKVwiKTt9XG4gICAgaWYoYnVmZmVyLmdldExlbmd0aEluQml0cygpKzQ8PXRvdGFsRGF0YUNvdW50Kjgpe2J1ZmZlci5wdXQoMCw0KTt9XG4gICAgd2hpbGUoYnVmZmVyLmdldExlbmd0aEluQml0cygpJTghPTApe2J1ZmZlci5wdXRCaXQoZmFsc2UpO31cbiAgICB3aGlsZSh0cnVlKXtpZihidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCk+PXRvdGFsRGF0YUNvdW50Kjgpe2JyZWFrO31cbiAgICBidWZmZXIucHV0KFFSQ29kZU1vZGVsLlBBRDAsOCk7aWYoYnVmZmVyLmdldExlbmd0aEluQml0cygpPj10b3RhbERhdGFDb3VudCo4KXticmVhazt9XG4gICAgYnVmZmVyLnB1dChRUkNvZGVNb2RlbC5QQUQxLDgpO31cbiAgICByZXR1cm4gUVJDb2RlTW9kZWwuY3JlYXRlQnl0ZXMoYnVmZmVyLHJzQmxvY2tzKTt9O1FSQ29kZU1vZGVsLmNyZWF0ZUJ5dGVzPWZ1bmN0aW9uKGJ1ZmZlcixyc0Jsb2Nrcyl7dmFyIG9mZnNldD0wO3ZhciBtYXhEY0NvdW50PTA7dmFyIG1heEVjQ291bnQ9MDt2YXIgZGNkYXRhPW5ldyBBcnJheShyc0Jsb2Nrcy5sZW5ndGgpO3ZhciBlY2RhdGE9bmV3IEFycmF5KHJzQmxvY2tzLmxlbmd0aCk7Zm9yKHZhciByPTA7cjxyc0Jsb2Nrcy5sZW5ndGg7cisrKXt2YXIgZGNDb3VudD1yc0Jsb2Nrc1tyXS5kYXRhQ291bnQ7dmFyIGVjQ291bnQ9cnNCbG9ja3Nbcl0udG90YWxDb3VudC1kY0NvdW50O21heERjQ291bnQ9TWF0aC5tYXgobWF4RGNDb3VudCxkY0NvdW50KTttYXhFY0NvdW50PU1hdGgubWF4KG1heEVjQ291bnQsZWNDb3VudCk7ZGNkYXRhW3JdPW5ldyBBcnJheShkY0NvdW50KTtmb3IodmFyIGk9MDtpPGRjZGF0YVtyXS5sZW5ndGg7aSsrKXtkY2RhdGFbcl1baV09MHhmZiZidWZmZXIuYnVmZmVyW2krb2Zmc2V0XTt9XG4gICAgb2Zmc2V0Kz1kY0NvdW50O3ZhciByc1BvbHk9UVJVdGlsLmdldEVycm9yQ29ycmVjdFBvbHlub21pYWwoZWNDb3VudCk7dmFyIHJhd1BvbHk9bmV3IFFSUG9seW5vbWlhbChkY2RhdGFbcl0scnNQb2x5LmdldExlbmd0aCgpLTEpO3ZhciBtb2RQb2x5PXJhd1BvbHkubW9kKHJzUG9seSk7ZWNkYXRhW3JdPW5ldyBBcnJheShyc1BvbHkuZ2V0TGVuZ3RoKCktMSk7Zm9yKHZhciBpPTA7aTxlY2RhdGFbcl0ubGVuZ3RoO2krKyl7dmFyIG1vZEluZGV4PWkrbW9kUG9seS5nZXRMZW5ndGgoKS1lY2RhdGFbcl0ubGVuZ3RoO2VjZGF0YVtyXVtpXT0obW9kSW5kZXg+PTApP21vZFBvbHkuZ2V0KG1vZEluZGV4KTowO319XG4gICAgdmFyIHRvdGFsQ29kZUNvdW50PTA7Zm9yKHZhciBpPTA7aTxyc0Jsb2Nrcy5sZW5ndGg7aSsrKXt0b3RhbENvZGVDb3VudCs9cnNCbG9ja3NbaV0udG90YWxDb3VudDt9XG4gICAgdmFyIGRhdGE9bmV3IEFycmF5KHRvdGFsQ29kZUNvdW50KTt2YXIgaW5kZXg9MDtmb3IodmFyIGk9MDtpPG1heERjQ291bnQ7aSsrKXtmb3IodmFyIHI9MDtyPHJzQmxvY2tzLmxlbmd0aDtyKyspe2lmKGk8ZGNkYXRhW3JdLmxlbmd0aCl7ZGF0YVtpbmRleCsrXT1kY2RhdGFbcl1baV07fX19XG4gICAgZm9yKHZhciBpPTA7aTxtYXhFY0NvdW50O2krKyl7Zm9yKHZhciByPTA7cjxyc0Jsb2Nrcy5sZW5ndGg7cisrKXtpZihpPGVjZGF0YVtyXS5sZW5ndGgpe2RhdGFbaW5kZXgrK109ZWNkYXRhW3JdW2ldO319fVxuICAgIHJldHVybiBkYXRhO307dmFyIFFSTW9kZT17TU9ERV9OVU1CRVI6MTw8MCxNT0RFX0FMUEhBX05VTToxPDwxLE1PREVfOEJJVF9CWVRFOjE8PDIsTU9ERV9LQU5KSToxPDwzfTt2YXIgUVJFcnJvckNvcnJlY3RMZXZlbD17TDoxLE06MCxROjMsSDoyfTt2YXIgUVJNYXNrUGF0dGVybj17UEFUVEVSTjAwMDowLFBBVFRFUk4wMDE6MSxQQVRURVJOMDEwOjIsUEFUVEVSTjAxMTozLFBBVFRFUk4xMDA6NCxQQVRURVJOMTAxOjUsUEFUVEVSTjExMDo2LFBBVFRFUk4xMTE6N307dmFyIFFSVXRpbD17UEFUVEVSTl9QT1NJVElPTl9UQUJMRTpbW10sWzYsMThdLFs2LDIyXSxbNiwyNl0sWzYsMzBdLFs2LDM0XSxbNiwyMiwzOF0sWzYsMjQsNDJdLFs2LDI2LDQ2XSxbNiwyOCw1MF0sWzYsMzAsNTRdLFs2LDMyLDU4XSxbNiwzNCw2Ml0sWzYsMjYsNDYsNjZdLFs2LDI2LDQ4LDcwXSxbNiwyNiw1MCw3NF0sWzYsMzAsNTQsNzhdLFs2LDMwLDU2LDgyXSxbNiwzMCw1OCw4Nl0sWzYsMzQsNjIsOTBdLFs2LDI4LDUwLDcyLDk0XSxbNiwyNiw1MCw3NCw5OF0sWzYsMzAsNTQsNzgsMTAyXSxbNiwyOCw1NCw4MCwxMDZdLFs2LDMyLDU4LDg0LDExMF0sWzYsMzAsNTgsODYsMTE0XSxbNiwzNCw2Miw5MCwxMThdLFs2LDI2LDUwLDc0LDk4LDEyMl0sWzYsMzAsNTQsNzgsMTAyLDEyNl0sWzYsMjYsNTIsNzgsMTA0LDEzMF0sWzYsMzAsNTYsODIsMTA4LDEzNF0sWzYsMzQsNjAsODYsMTEyLDEzOF0sWzYsMzAsNTgsODYsMTE0LDE0Ml0sWzYsMzQsNjIsOTAsMTE4LDE0Nl0sWzYsMzAsNTQsNzgsMTAyLDEyNiwxNTBdLFs2LDI0LDUwLDc2LDEwMiwxMjgsMTU0XSxbNiwyOCw1NCw4MCwxMDYsMTMyLDE1OF0sWzYsMzIsNTgsODQsMTEwLDEzNiwxNjJdLFs2LDI2LDU0LDgyLDExMCwxMzgsMTY2XSxbNiwzMCw1OCw4NiwxMTQsMTQyLDE3MF1dLEcxNTooMTw8MTApfCgxPDw4KXwoMTw8NSl8KDE8PDQpfCgxPDwyKXwoMTw8MSl8KDE8PDApLEcxODooMTw8MTIpfCgxPDwxMSl8KDE8PDEwKXwoMTw8OSl8KDE8PDgpfCgxPDw1KXwoMTw8Mil8KDE8PDApLEcxNV9NQVNLOigxPDwxNCl8KDE8PDEyKXwoMTw8MTApfCgxPDw0KXwoMTw8MSksZ2V0QkNIVHlwZUluZm86ZnVuY3Rpb24oZGF0YSl7dmFyIGQ9ZGF0YTw8MTA7d2hpbGUoUVJVdGlsLmdldEJDSERpZ2l0KGQpLVFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KT49MCl7ZF49KFFSVXRpbC5HMTU8PChRUlV0aWwuZ2V0QkNIRGlnaXQoZCktUVJVdGlsLmdldEJDSERpZ2l0KFFSVXRpbC5HMTUpKSk7fVxuICAgIHJldHVybigoZGF0YTw8MTApfGQpXlFSVXRpbC5HMTVfTUFTSzt9LGdldEJDSFR5cGVOdW1iZXI6ZnVuY3Rpb24oZGF0YSl7dmFyIGQ9ZGF0YTw8MTI7d2hpbGUoUVJVdGlsLmdldEJDSERpZ2l0KGQpLVFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KT49MCl7ZF49KFFSVXRpbC5HMTg8PChRUlV0aWwuZ2V0QkNIRGlnaXQoZCktUVJVdGlsLmdldEJDSERpZ2l0KFFSVXRpbC5HMTgpKSk7fVxuICAgIHJldHVybihkYXRhPDwxMil8ZDt9LGdldEJDSERpZ2l0OmZ1bmN0aW9uKGRhdGEpe3ZhciBkaWdpdD0wO3doaWxlKGRhdGEhPTApe2RpZ2l0Kys7ZGF0YT4+Pj0xO31cbiAgICByZXR1cm4gZGlnaXQ7fSxnZXRQYXR0ZXJuUG9zaXRpb246ZnVuY3Rpb24odHlwZU51bWJlcil7cmV0dXJuIFFSVXRpbC5QQVRURVJOX1BPU0lUSU9OX1RBQkxFW3R5cGVOdW1iZXItMV07fSxnZXRNYXNrOmZ1bmN0aW9uKG1hc2tQYXR0ZXJuLGksail7c3dpdGNoKG1hc2tQYXR0ZXJuKXtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAwMDpyZXR1cm4oaStqKSUyPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDAxOnJldHVybiBpJTI9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMTA6cmV0dXJuIGolMz09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAxMTpyZXR1cm4oaStqKSUzPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTAwOnJldHVybihNYXRoLmZsb29yKGkvMikrTWF0aC5mbG9vcihqLzMpKSUyPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTAxOnJldHVybihpKmopJTIrKGkqaiklMz09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjExMDpyZXR1cm4oKGkqaiklMisoaSpqKSUzKSUyPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTExOnJldHVybigoaSpqKSUzKyhpK2opJTIpJTI9PTA7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbWFza1BhdHRlcm46XCIrbWFza1BhdHRlcm4pO319LGdldEVycm9yQ29ycmVjdFBvbHlub21pYWw6ZnVuY3Rpb24oZXJyb3JDb3JyZWN0TGVuZ3RoKXt2YXIgYT1uZXcgUVJQb2x5bm9taWFsKFsxXSwwKTtmb3IodmFyIGk9MDtpPGVycm9yQ29ycmVjdExlbmd0aDtpKyspe2E9YS5tdWx0aXBseShuZXcgUVJQb2x5bm9taWFsKFsxLFFSTWF0aC5nZXhwKGkpXSwwKSk7fVxuICAgIHJldHVybiBhO30sZ2V0TGVuZ3RoSW5CaXRzOmZ1bmN0aW9uKG1vZGUsdHlwZSl7aWYoMTw9dHlwZSYmdHlwZTwxMCl7c3dpdGNoKG1vZGUpe2Nhc2UgUVJNb2RlLk1PREVfTlVNQkVSOnJldHVybiAxMDtjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTTpyZXR1cm4gOTtjYXNlIFFSTW9kZS5NT0RFXzhCSVRfQllURTpyZXR1cm4gODtjYXNlIFFSTW9kZS5NT0RFX0tBTkpJOnJldHVybiA4O2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwibW9kZTpcIittb2RlKTt9fWVsc2UgaWYodHlwZTwyNyl7c3dpdGNoKG1vZGUpe2Nhc2UgUVJNb2RlLk1PREVfTlVNQkVSOnJldHVybiAxMjtjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTTpyZXR1cm4gMTE7Y2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEU6cmV0dXJuIDE2O2Nhc2UgUVJNb2RlLk1PREVfS0FOSkk6cmV0dXJuIDEwO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwibW9kZTpcIittb2RlKTt9fWVsc2UgaWYodHlwZTw0MSl7c3dpdGNoKG1vZGUpe2Nhc2UgUVJNb2RlLk1PREVfTlVNQkVSOnJldHVybiAxNDtjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTTpyZXR1cm4gMTM7Y2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEU6cmV0dXJuIDE2O2Nhc2UgUVJNb2RlLk1PREVfS0FOSkk6cmV0dXJuIDEyO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwibW9kZTpcIittb2RlKTt9fWVsc2V7dGhyb3cgbmV3IEVycm9yKFwidHlwZTpcIit0eXBlKTt9fSxnZXRMb3N0UG9pbnQ6ZnVuY3Rpb24ocXJDb2RlKXt2YXIgbW9kdWxlQ291bnQ9cXJDb2RlLmdldE1vZHVsZUNvdW50KCk7dmFyIGxvc3RQb2ludD0wO2Zvcih2YXIgcm93PTA7cm93PG1vZHVsZUNvdW50O3JvdysrKXtmb3IodmFyIGNvbD0wO2NvbDxtb2R1bGVDb3VudDtjb2wrKyl7dmFyIHNhbWVDb3VudD0wO3ZhciBkYXJrPXFyQ29kZS5pc0Rhcmsocm93LGNvbCk7Zm9yKHZhciByPS0xO3I8PTE7cisrKXtpZihyb3crcjwwfHxtb2R1bGVDb3VudDw9cm93K3Ipe2NvbnRpbnVlO31cbiAgICBmb3IodmFyIGM9LTE7Yzw9MTtjKyspe2lmKGNvbCtjPDB8fG1vZHVsZUNvdW50PD1jb2wrYyl7Y29udGludWU7fVxuICAgIGlmKHI9PTAmJmM9PTApe2NvbnRpbnVlO31cbiAgICBpZihkYXJrPT1xckNvZGUuaXNEYXJrKHJvdytyLGNvbCtjKSl7c2FtZUNvdW50Kys7fX19XG4gICAgaWYoc2FtZUNvdW50PjUpe2xvc3RQb2ludCs9KDMrc2FtZUNvdW50LTUpO319fVxuICAgIGZvcih2YXIgcm93PTA7cm93PG1vZHVsZUNvdW50LTE7cm93Kyspe2Zvcih2YXIgY29sPTA7Y29sPG1vZHVsZUNvdW50LTE7Y29sKyspe3ZhciBjb3VudD0wO2lmKHFyQ29kZS5pc0Rhcmsocm93LGNvbCkpY291bnQrKztpZihxckNvZGUuaXNEYXJrKHJvdysxLGNvbCkpY291bnQrKztpZihxckNvZGUuaXNEYXJrKHJvdyxjb2wrMSkpY291bnQrKztpZihxckNvZGUuaXNEYXJrKHJvdysxLGNvbCsxKSljb3VudCsrO2lmKGNvdW50PT0wfHxjb3VudD09NCl7bG9zdFBvaW50Kz0zO319fVxuICAgIGZvcih2YXIgcm93PTA7cm93PG1vZHVsZUNvdW50O3JvdysrKXtmb3IodmFyIGNvbD0wO2NvbDxtb2R1bGVDb3VudC02O2NvbCsrKXtpZihxckNvZGUuaXNEYXJrKHJvdyxjb2wpJiYhcXJDb2RlLmlzRGFyayhyb3csY29sKzEpJiZxckNvZGUuaXNEYXJrKHJvdyxjb2wrMikmJnFyQ29kZS5pc0Rhcmsocm93LGNvbCszKSYmcXJDb2RlLmlzRGFyayhyb3csY29sKzQpJiYhcXJDb2RlLmlzRGFyayhyb3csY29sKzUpJiZxckNvZGUuaXNEYXJrKHJvdyxjb2wrNikpe2xvc3RQb2ludCs9NDA7fX19XG4gICAgZm9yKHZhciBjb2w9MDtjb2w8bW9kdWxlQ291bnQ7Y29sKyspe2Zvcih2YXIgcm93PTA7cm93PG1vZHVsZUNvdW50LTY7cm93Kyspe2lmKHFyQ29kZS5pc0Rhcmsocm93LGNvbCkmJiFxckNvZGUuaXNEYXJrKHJvdysxLGNvbCkmJnFyQ29kZS5pc0Rhcmsocm93KzIsY29sKSYmcXJDb2RlLmlzRGFyayhyb3crMyxjb2wpJiZxckNvZGUuaXNEYXJrKHJvdys0LGNvbCkmJiFxckNvZGUuaXNEYXJrKHJvdys1LGNvbCkmJnFyQ29kZS5pc0Rhcmsocm93KzYsY29sKSl7bG9zdFBvaW50Kz00MDt9fX1cbiAgICB2YXIgZGFya0NvdW50PTA7Zm9yKHZhciBjb2w9MDtjb2w8bW9kdWxlQ291bnQ7Y29sKyspe2Zvcih2YXIgcm93PTA7cm93PG1vZHVsZUNvdW50O3JvdysrKXtpZihxckNvZGUuaXNEYXJrKHJvdyxjb2wpKXtkYXJrQ291bnQrKzt9fX1cbiAgICB2YXIgcmF0aW89TWF0aC5hYnMoMTAwKmRhcmtDb3VudC9tb2R1bGVDb3VudC9tb2R1bGVDb3VudC01MCkvNTtsb3N0UG9pbnQrPXJhdGlvKjEwO3JldHVybiBsb3N0UG9pbnQ7fX07dmFyIFFSTWF0aD17Z2xvZzpmdW5jdGlvbihuKXtpZihuPDEpe3Rocm93IG5ldyBFcnJvcihcImdsb2coXCIrbitcIilcIik7fVxuICAgIHJldHVybiBRUk1hdGguTE9HX1RBQkxFW25dO30sZ2V4cDpmdW5jdGlvbihuKXt3aGlsZShuPDApe24rPTI1NTt9XG4gICAgd2hpbGUobj49MjU2KXtuLT0yNTU7fVxuICAgIHJldHVybiBRUk1hdGguRVhQX1RBQkxFW25dO30sRVhQX1RBQkxFOm5ldyBBcnJheSgyNTYpLExPR19UQUJMRTpuZXcgQXJyYXkoMjU2KX07Zm9yKHZhciBpPTA7aTw4O2krKyl7UVJNYXRoLkVYUF9UQUJMRVtpXT0xPDxpO31cbiAgICBmb3IodmFyIGk9ODtpPDI1NjtpKyspe1FSTWF0aC5FWFBfVEFCTEVbaV09UVJNYXRoLkVYUF9UQUJMRVtpLTRdXlFSTWF0aC5FWFBfVEFCTEVbaS01XV5RUk1hdGguRVhQX1RBQkxFW2ktNl1eUVJNYXRoLkVYUF9UQUJMRVtpLThdO31cbiAgICBmb3IodmFyIGk9MDtpPDI1NTtpKyspe1FSTWF0aC5MT0dfVEFCTEVbUVJNYXRoLkVYUF9UQUJMRVtpXV09aTt9XG4gICAgZnVuY3Rpb24gUVJQb2x5bm9taWFsKG51bSxzaGlmdCl7aWYobnVtLmxlbmd0aD09dW5kZWZpbmVkKXt0aHJvdyBuZXcgRXJyb3IobnVtLmxlbmd0aCtcIi9cIitzaGlmdCk7fVxuICAgIHZhciBvZmZzZXQ9MDt3aGlsZShvZmZzZXQ8bnVtLmxlbmd0aCYmbnVtW29mZnNldF09PTApe29mZnNldCsrO31cbiAgICB0aGlzLm51bT1uZXcgQXJyYXkobnVtLmxlbmd0aC1vZmZzZXQrc2hpZnQpO2Zvcih2YXIgaT0wO2k8bnVtLmxlbmd0aC1vZmZzZXQ7aSsrKXt0aGlzLm51bVtpXT1udW1baStvZmZzZXRdO319XG4gICAgUVJQb2x5bm9taWFsLnByb3RvdHlwZT17Z2V0OmZ1bmN0aW9uKGluZGV4KXtyZXR1cm4gdGhpcy5udW1baW5kZXhdO30sZ2V0TGVuZ3RoOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubnVtLmxlbmd0aDt9LG11bHRpcGx5OmZ1bmN0aW9uKGUpe3ZhciBudW09bmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkrZS5nZXRMZW5ndGgoKS0xKTtmb3IodmFyIGk9MDtpPHRoaXMuZ2V0TGVuZ3RoKCk7aSsrKXtmb3IodmFyIGo9MDtqPGUuZ2V0TGVuZ3RoKCk7aisrKXtudW1baStqXV49UVJNYXRoLmdleHAoUVJNYXRoLmdsb2codGhpcy5nZXQoaSkpK1FSTWF0aC5nbG9nKGUuZ2V0KGopKSk7fX1cbiAgICByZXR1cm4gbmV3IFFSUG9seW5vbWlhbChudW0sMCk7fSxtb2Q6ZnVuY3Rpb24oZSl7aWYodGhpcy5nZXRMZW5ndGgoKS1lLmdldExlbmd0aCgpPDApe3JldHVybiB0aGlzO31cbiAgICB2YXIgcmF0aW89UVJNYXRoLmdsb2codGhpcy5nZXQoMCkpLVFSTWF0aC5nbG9nKGUuZ2V0KDApKTt2YXIgbnVtPW5ldyBBcnJheSh0aGlzLmdldExlbmd0aCgpKTtmb3IodmFyIGk9MDtpPHRoaXMuZ2V0TGVuZ3RoKCk7aSsrKXtudW1baV09dGhpcy5nZXQoaSk7fVxuICAgIGZvcih2YXIgaT0wO2k8ZS5nZXRMZW5ndGgoKTtpKyspe251bVtpXV49UVJNYXRoLmdleHAoUVJNYXRoLmdsb2coZS5nZXQoaSkpK3JhdGlvKTt9XG4gICAgcmV0dXJuIG5ldyBRUlBvbHlub21pYWwobnVtLDApLm1vZChlKTt9fTtmdW5jdGlvbiBRUlJTQmxvY2sodG90YWxDb3VudCxkYXRhQ291bnQpe3RoaXMudG90YWxDb3VudD10b3RhbENvdW50O3RoaXMuZGF0YUNvdW50PWRhdGFDb3VudDt9XG4gICAgUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFPVtbMSwyNiwxOV0sWzEsMjYsMTZdLFsxLDI2LDEzXSxbMSwyNiw5XSxbMSw0NCwzNF0sWzEsNDQsMjhdLFsxLDQ0LDIyXSxbMSw0NCwxNl0sWzEsNzAsNTVdLFsxLDcwLDQ0XSxbMiwzNSwxN10sWzIsMzUsMTNdLFsxLDEwMCw4MF0sWzIsNTAsMzJdLFsyLDUwLDI0XSxbNCwyNSw5XSxbMSwxMzQsMTA4XSxbMiw2Nyw0M10sWzIsMzMsMTUsMiwzNCwxNl0sWzIsMzMsMTEsMiwzNCwxMl0sWzIsODYsNjhdLFs0LDQzLDI3XSxbNCw0MywxOV0sWzQsNDMsMTVdLFsyLDk4LDc4XSxbNCw0OSwzMV0sWzIsMzIsMTQsNCwzMywxNV0sWzQsMzksMTMsMSw0MCwxNF0sWzIsMTIxLDk3XSxbMiw2MCwzOCwyLDYxLDM5XSxbNCw0MCwxOCwyLDQxLDE5XSxbNCw0MCwxNCwyLDQxLDE1XSxbMiwxNDYsMTE2XSxbMyw1OCwzNiwyLDU5LDM3XSxbNCwzNiwxNiw0LDM3LDE3XSxbNCwzNiwxMiw0LDM3LDEzXSxbMiw4Niw2OCwyLDg3LDY5XSxbNCw2OSw0MywxLDcwLDQ0XSxbNiw0MywxOSwyLDQ0LDIwXSxbNiw0MywxNSwyLDQ0LDE2XSxbNCwxMDEsODFdLFsxLDgwLDUwLDQsODEsNTFdLFs0LDUwLDIyLDQsNTEsMjNdLFszLDM2LDEyLDgsMzcsMTNdLFsyLDExNiw5MiwyLDExNyw5M10sWzYsNTgsMzYsMiw1OSwzN10sWzQsNDYsMjAsNiw0NywyMV0sWzcsNDIsMTQsNCw0MywxNV0sWzQsMTMzLDEwN10sWzgsNTksMzcsMSw2MCwzOF0sWzgsNDQsMjAsNCw0NSwyMV0sWzEyLDMzLDExLDQsMzQsMTJdLFszLDE0NSwxMTUsMSwxNDYsMTE2XSxbNCw2NCw0MCw1LDY1LDQxXSxbMTEsMzYsMTYsNSwzNywxN10sWzExLDM2LDEyLDUsMzcsMTNdLFs1LDEwOSw4NywxLDExMCw4OF0sWzUsNjUsNDEsNSw2Niw0Ml0sWzUsNTQsMjQsNyw1NSwyNV0sWzExLDM2LDEyXSxbNSwxMjIsOTgsMSwxMjMsOTldLFs3LDczLDQ1LDMsNzQsNDZdLFsxNSw0MywxOSwyLDQ0LDIwXSxbMyw0NSwxNSwxMyw0NiwxNl0sWzEsMTM1LDEwNyw1LDEzNiwxMDhdLFsxMCw3NCw0NiwxLDc1LDQ3XSxbMSw1MCwyMiwxNSw1MSwyM10sWzIsNDIsMTQsMTcsNDMsMTVdLFs1LDE1MCwxMjAsMSwxNTEsMTIxXSxbOSw2OSw0Myw0LDcwLDQ0XSxbMTcsNTAsMjIsMSw1MSwyM10sWzIsNDIsMTQsMTksNDMsMTVdLFszLDE0MSwxMTMsNCwxNDIsMTE0XSxbMyw3MCw0NCwxMSw3MSw0NV0sWzE3LDQ3LDIxLDQsNDgsMjJdLFs5LDM5LDEzLDE2LDQwLDE0XSxbMywxMzUsMTA3LDUsMTM2LDEwOF0sWzMsNjcsNDEsMTMsNjgsNDJdLFsxNSw1NCwyNCw1LDU1LDI1XSxbMTUsNDMsMTUsMTAsNDQsMTZdLFs0LDE0NCwxMTYsNCwxNDUsMTE3XSxbMTcsNjgsNDJdLFsxNyw1MCwyMiw2LDUxLDIzXSxbMTksNDYsMTYsNiw0NywxN10sWzIsMTM5LDExMSw3LDE0MCwxMTJdLFsxNyw3NCw0Nl0sWzcsNTQsMjQsMTYsNTUsMjVdLFszNCwzNywxM10sWzQsMTUxLDEyMSw1LDE1MiwxMjJdLFs0LDc1LDQ3LDE0LDc2LDQ4XSxbMTEsNTQsMjQsMTQsNTUsMjVdLFsxNiw0NSwxNSwxNCw0NiwxNl0sWzYsMTQ3LDExNyw0LDE0OCwxMThdLFs2LDczLDQ1LDE0LDc0LDQ2XSxbMTEsNTQsMjQsMTYsNTUsMjVdLFszMCw0NiwxNiwyLDQ3LDE3XSxbOCwxMzIsMTA2LDQsMTMzLDEwN10sWzgsNzUsNDcsMTMsNzYsNDhdLFs3LDU0LDI0LDIyLDU1LDI1XSxbMjIsNDUsMTUsMTMsNDYsMTZdLFsxMCwxNDIsMTE0LDIsMTQzLDExNV0sWzE5LDc0LDQ2LDQsNzUsNDddLFsyOCw1MCwyMiw2LDUxLDIzXSxbMzMsNDYsMTYsNCw0NywxN10sWzgsMTUyLDEyMiw0LDE1MywxMjNdLFsyMiw3Myw0NSwzLDc0LDQ2XSxbOCw1MywyMywyNiw1NCwyNF0sWzEyLDQ1LDE1LDI4LDQ2LDE2XSxbMywxNDcsMTE3LDEwLDE0OCwxMThdLFszLDczLDQ1LDIzLDc0LDQ2XSxbNCw1NCwyNCwzMSw1NSwyNV0sWzExLDQ1LDE1LDMxLDQ2LDE2XSxbNywxNDYsMTE2LDcsMTQ3LDExN10sWzIxLDczLDQ1LDcsNzQsNDZdLFsxLDUzLDIzLDM3LDU0LDI0XSxbMTksNDUsMTUsMjYsNDYsMTZdLFs1LDE0NSwxMTUsMTAsMTQ2LDExNl0sWzE5LDc1LDQ3LDEwLDc2LDQ4XSxbMTUsNTQsMjQsMjUsNTUsMjVdLFsyMyw0NSwxNSwyNSw0NiwxNl0sWzEzLDE0NSwxMTUsMywxNDYsMTE2XSxbMiw3NCw0NiwyOSw3NSw0N10sWzQyLDU0LDI0LDEsNTUsMjVdLFsyMyw0NSwxNSwyOCw0NiwxNl0sWzE3LDE0NSwxMTVdLFsxMCw3NCw0NiwyMyw3NSw0N10sWzEwLDU0LDI0LDM1LDU1LDI1XSxbMTksNDUsMTUsMzUsNDYsMTZdLFsxNywxNDUsMTE1LDEsMTQ2LDExNl0sWzE0LDc0LDQ2LDIxLDc1LDQ3XSxbMjksNTQsMjQsMTksNTUsMjVdLFsxMSw0NSwxNSw0Niw0NiwxNl0sWzEzLDE0NSwxMTUsNiwxNDYsMTE2XSxbMTQsNzQsNDYsMjMsNzUsNDddLFs0NCw1NCwyNCw3LDU1LDI1XSxbNTksNDYsMTYsMSw0NywxN10sWzEyLDE1MSwxMjEsNywxNTIsMTIyXSxbMTIsNzUsNDcsMjYsNzYsNDhdLFszOSw1NCwyNCwxNCw1NSwyNV0sWzIyLDQ1LDE1LDQxLDQ2LDE2XSxbNiwxNTEsMTIxLDE0LDE1MiwxMjJdLFs2LDc1LDQ3LDM0LDc2LDQ4XSxbNDYsNTQsMjQsMTAsNTUsMjVdLFsyLDQ1LDE1LDY0LDQ2LDE2XSxbMTcsMTUyLDEyMiw0LDE1MywxMjNdLFsyOSw3NCw0NiwxNCw3NSw0N10sWzQ5LDU0LDI0LDEwLDU1LDI1XSxbMjQsNDUsMTUsNDYsNDYsMTZdLFs0LDE1MiwxMjIsMTgsMTUzLDEyM10sWzEzLDc0LDQ2LDMyLDc1LDQ3XSxbNDgsNTQsMjQsMTQsNTUsMjVdLFs0Miw0NSwxNSwzMiw0NiwxNl0sWzIwLDE0NywxMTcsNCwxNDgsMTE4XSxbNDAsNzUsNDcsNyw3Niw0OF0sWzQzLDU0LDI0LDIyLDU1LDI1XSxbMTAsNDUsMTUsNjcsNDYsMTZdLFsxOSwxNDgsMTE4LDYsMTQ5LDExOV0sWzE4LDc1LDQ3LDMxLDc2LDQ4XSxbMzQsNTQsMjQsMzQsNTUsMjVdLFsyMCw0NSwxNSw2MSw0NiwxNl1dO1FSUlNCbG9jay5nZXRSU0Jsb2Nrcz1mdW5jdGlvbih0eXBlTnVtYmVyLGVycm9yQ29ycmVjdExldmVsKXt2YXIgcnNCbG9jaz1RUlJTQmxvY2suZ2V0UnNCbG9ja1RhYmxlKHR5cGVOdW1iZXIsZXJyb3JDb3JyZWN0TGV2ZWwpO2lmKHJzQmxvY2s9PXVuZGVmaW5lZCl7dGhyb3cgbmV3IEVycm9yKFwiYmFkIHJzIGJsb2NrIEAgdHlwZU51bWJlcjpcIit0eXBlTnVtYmVyK1wiL2Vycm9yQ29ycmVjdExldmVsOlwiK2Vycm9yQ29ycmVjdExldmVsKTt9XG4gICAgdmFyIGxlbmd0aD1yc0Jsb2NrLmxlbmd0aC8zO3ZhciBsaXN0PVtdO2Zvcih2YXIgaT0wO2k8bGVuZ3RoO2krKyl7dmFyIGNvdW50PXJzQmxvY2tbaSozKzBdO3ZhciB0b3RhbENvdW50PXJzQmxvY2tbaSozKzFdO3ZhciBkYXRhQ291bnQ9cnNCbG9ja1tpKjMrMl07Zm9yKHZhciBqPTA7ajxjb3VudDtqKyspe2xpc3QucHVzaChuZXcgUVJSU0Jsb2NrKHRvdGFsQ291bnQsZGF0YUNvdW50KSk7fX1cbiAgICByZXR1cm4gbGlzdDt9O1FSUlNCbG9jay5nZXRSc0Jsb2NrVGFibGU9ZnVuY3Rpb24odHlwZU51bWJlcixlcnJvckNvcnJlY3RMZXZlbCl7c3dpdGNoKGVycm9yQ29ycmVjdExldmVsKXtjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuTDpyZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyLTEpKjQrMF07Y2FzZSBRUkVycm9yQ29ycmVjdExldmVsLk06cmV0dXJuIFFSUlNCbG9jay5SU19CTE9DS19UQUJMRVsodHlwZU51bWJlci0xKSo0KzFdO2Nhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5ROnJldHVybiBRUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEVbKHR5cGVOdW1iZXItMSkqNCsyXTtjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuSDpyZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyLTEpKjQrM107ZGVmYXVsdDpyZXR1cm4gdW5kZWZpbmVkO319O2Z1bmN0aW9uIFFSQml0QnVmZmVyKCl7dGhpcy5idWZmZXI9W107dGhpcy5sZW5ndGg9MDt9XG4gICAgUVJCaXRCdWZmZXIucHJvdG90eXBlPXtnZXQ6ZnVuY3Rpb24oaW5kZXgpe3ZhciBidWZJbmRleD1NYXRoLmZsb29yKGluZGV4LzgpO3JldHVybigodGhpcy5idWZmZXJbYnVmSW5kZXhdPj4+KDctaW5kZXglOCkpJjEpPT0xO30scHV0OmZ1bmN0aW9uKG51bSxsZW5ndGgpe2Zvcih2YXIgaT0wO2k8bGVuZ3RoO2krKyl7dGhpcy5wdXRCaXQoKChudW0+Pj4obGVuZ3RoLWktMSkpJjEpPT0xKTt9fSxnZXRMZW5ndGhJbkJpdHM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5sZW5ndGg7fSxwdXRCaXQ6ZnVuY3Rpb24oYml0KXt2YXIgYnVmSW5kZXg9TWF0aC5mbG9vcih0aGlzLmxlbmd0aC84KTtpZih0aGlzLmJ1ZmZlci5sZW5ndGg8PWJ1ZkluZGV4KXt0aGlzLmJ1ZmZlci5wdXNoKDApO31cbiAgICBpZihiaXQpe3RoaXMuYnVmZmVyW2J1ZkluZGV4XXw9KDB4ODA+Pj4odGhpcy5sZW5ndGglOCkpO31cbiAgICB0aGlzLmxlbmd0aCsrO319O3ZhciBRUkNvZGVMaW1pdExlbmd0aD1bWzE3LDE0LDExLDddLFszMiwyNiwyMCwxNF0sWzUzLDQyLDMyLDI0XSxbNzgsNjIsNDYsMzRdLFsxMDYsODQsNjAsNDRdLFsxMzQsMTA2LDc0LDU4XSxbMTU0LDEyMiw4Niw2NF0sWzE5MiwxNTIsMTA4LDg0XSxbMjMwLDE4MCwxMzAsOThdLFsyNzEsMjEzLDE1MSwxMTldLFszMjEsMjUxLDE3NywxMzddLFszNjcsMjg3LDIwMywxNTVdLFs0MjUsMzMxLDI0MSwxNzddLFs0NTgsMzYyLDI1OCwxOTRdLFs1MjAsNDEyLDI5MiwyMjBdLFs1ODYsNDUwLDMyMiwyNTBdLFs2NDQsNTA0LDM2NCwyODBdLFs3MTgsNTYwLDM5NCwzMTBdLFs3OTIsNjI0LDQ0MiwzMzhdLFs4NTgsNjY2LDQ4MiwzODJdLFs5MjksNzExLDUwOSw0MDNdLFsxMDAzLDc3OSw1NjUsNDM5XSxbMTA5MSw4NTcsNjExLDQ2MV0sWzExNzEsOTExLDY2MSw1MTFdLFsxMjczLDk5Nyw3MTUsNTM1XSxbMTM2NywxMDU5LDc1MSw1OTNdLFsxNDY1LDExMjUsODA1LDYyNV0sWzE1MjgsMTE5MCw4NjgsNjU4XSxbMTYyOCwxMjY0LDkwOCw2OThdLFsxNzMyLDEzNzAsOTgyLDc0Ml0sWzE4NDAsMTQ1MiwxMDMwLDc5MF0sWzE5NTIsMTUzOCwxMTEyLDg0Ml0sWzIwNjgsMTYyOCwxMTY4LDg5OF0sWzIxODgsMTcyMiwxMjI4LDk1OF0sWzIzMDMsMTgwOSwxMjgzLDk4M10sWzI0MzEsMTkxMSwxMzUxLDEwNTFdLFsyNTYzLDE5ODksMTQyMywxMDkzXSxbMjY5OSwyMDk5LDE0OTksMTEzOV0sWzI4MDksMjIxMywxNTc5LDEyMTldLFsyOTUzLDIzMzEsMTY2MywxMjczXV07XG5cbiAgICBmdW5jdGlvbiBfaXNTdXBwb3J0Q2FudmFzKCkge1xuICAgICAgICByZXR1cm4gdHlwZW9mIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCAhPSBcInVuZGVmaW5lZFwiO1xuICAgIH1cblxuICAgIC8vIGFuZHJvaWQgMi54IGRvZXNuJ3Qgc3VwcG9ydCBEYXRhLVVSSSBzcGVjXG4gICAgZnVuY3Rpb24gX2dldEFuZHJvaWQoKSB7XG4gICAgICAgIHZhciBhbmRyb2lkID0gZmFsc2U7XG4gICAgICAgIHZhciBzQWdlbnQgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuXG4gICAgICAgIGlmICgvYW5kcm9pZC9pLnRlc3Qoc0FnZW50KSkgeyAvLyBhbmRyb2lkXG4gICAgICAgICAgICBhbmRyb2lkID0gdHJ1ZTtcbiAgICAgICAgICAgIGFNYXQgPSBzQWdlbnQudG9TdHJpbmcoKS5tYXRjaCgvYW5kcm9pZCAoWzAtOV1cXC5bMC05XSkvaSk7XG5cbiAgICAgICAgICAgIGlmIChhTWF0ICYmIGFNYXRbMV0pIHtcbiAgICAgICAgICAgICAgICBhbmRyb2lkID0gcGFyc2VGbG9hdChhTWF0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhbmRyb2lkO1xuICAgIH1cblxuICAgIHZhciBzdmdEcmF3ZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIERyYXdpbmcgPSBmdW5jdGlvbiAoZWwsIGh0T3B0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9lbCA9IGVsO1xuICAgICAgICAgICAgdGhpcy5faHRPcHRpb24gPSBodE9wdGlvbjtcbiAgICAgICAgfTtcblxuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKG9RUkNvZGUpIHtcbiAgICAgICAgICAgIHZhciBfaHRPcHRpb24gPSB0aGlzLl9odE9wdGlvbjtcbiAgICAgICAgICAgIHZhciBfZWwgPSB0aGlzLl9lbDtcbiAgICAgICAgICAgIHZhciBuQ291bnQgPSBvUVJDb2RlLmdldE1vZHVsZUNvdW50KCk7XG4gICAgICAgICAgICB2YXIgbldpZHRoID0gTWF0aC5mbG9vcihfaHRPcHRpb24ud2lkdGggLyBuQ291bnQpO1xuICAgICAgICAgICAgdmFyIG5IZWlnaHQgPSBNYXRoLmZsb29yKF9odE9wdGlvbi5oZWlnaHQgLyBuQ291bnQpO1xuXG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIG1ha2VTVkcodGFnLCBhdHRycykge1xuICAgICAgICAgICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCB0YWcpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gYXR0cnMpXG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5oYXNPd25Qcm9wZXJ0eShrKSkgZWwuc2V0QXR0cmlidXRlKGssIGF0dHJzW2tdKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdmcgPSBtYWtlU1ZHKFwic3ZnXCIgLCB7J3ZpZXdCb3gnOiAnMCAwICcgKyBTdHJpbmcobkNvdW50KSArIFwiIFwiICsgU3RyaW5nKG5Db3VudCksICd3aWR0aCc6ICcxMDAlJywgJ2hlaWdodCc6ICcxMDAlJywgJ2ZpbGwnOiBfaHRPcHRpb24uY29sb3JMaWdodH0pO1xuICAgICAgICAgICAgc3ZnLnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC94bWxucy9cIiwgXCJ4bWxuczp4bGlua1wiLCBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIik7XG4gICAgICAgICAgICBfZWwuYXBwZW5kQ2hpbGQoc3ZnKTtcblxuICAgICAgICAgICAgc3ZnLmFwcGVuZENoaWxkKG1ha2VTVkcoXCJyZWN0XCIsIHtcImZpbGxcIjogX2h0T3B0aW9uLmNvbG9yRGFyaywgXCJ3aWR0aFwiOiBcIjFcIiwgXCJoZWlnaHRcIjogXCIxXCIsIFwiaWRcIjogXCJ0ZW1wbGF0ZVwifSkpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBuQ291bnQ7IHJvdysrKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgbkNvdW50OyBjb2wrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1FSQ29kZS5pc0Rhcmsocm93LCBjb2wpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBtYWtlU1ZHKFwidXNlXCIsIHtcInhcIjogU3RyaW5nKHJvdyksIFwieVwiOiBTdHJpbmcoY29sKX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBcIiN0ZW1wbGF0ZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgc3ZnLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB3aGlsZSAodGhpcy5fZWwuaGFzQ2hpbGROb2RlcygpKVxuICAgICAgICAgICAgICAgIHRoaXMuX2VsLnJlbW92ZUNoaWxkKHRoaXMuX2VsLmxhc3RDaGlsZCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBEcmF3aW5nO1xuICAgIH0pKCk7XG5cbiAgICAvLyBIYWQgdG8gY2hhbmdlIHRoaXMgYSBiaXQsIGJlY2F1c2Ugb2YgYnJvd3NlcmlmeS5cbiAgICAvLyBkb2N1bWVudCBwcm9wZXJ0aWVzIGNhbm5vdCBiZSB0ZXN0ZWQgd2hlbiB0aGUgSlMgaXMgbG9hZGVkLFxuICAgIC8vIGFsbCB3aW5kb3cvZG9jdW1lbnQgYWNjZXNzIHNob3VsZCBiZSBkb25lIGluIHRoZSBldmVudCBoYW5kbGVycyBvbmx5LlxuICAgIHZhciB1c2VTVkc7XG4gICAgaWYoZ2xvYmFsKSB7XG4gICAgICAgIC8vIHRhcGUgKyBQdXJlIE5vZGVKU1xuICAgICAgICB1c2VTVkcgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB1c2VTVkcgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcInN2Z1wiO1xuICAgIH1cblxuICAgIC8vIERyYXdpbmcgaW4gRE9NIGJ5IHVzaW5nIFRhYmxlIHRhZ1xuICAgIHZhciBEcmF3aW5nID0gdXNlU1ZHID8gc3ZnRHJhd2VyIDogIV9pc1N1cHBvcnRDYW52YXMoKSA/IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBEcmF3aW5nID0gZnVuY3Rpb24gKGVsLCBodE9wdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fZWwgPSBlbDtcbiAgICAgICAgICAgIHRoaXMuX2h0T3B0aW9uID0gaHRPcHRpb247XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERyYXcgdGhlIFFSQ29kZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1FSQ29kZX0gb1FSQ29kZVxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChvUVJDb2RlKSB7XG4gICAgICAgICAgICB2YXIgX2h0T3B0aW9uID0gdGhpcy5faHRPcHRpb247XG4gICAgICAgICAgICB2YXIgX2VsID0gdGhpcy5fZWw7XG4gICAgICAgICAgICB2YXIgbkNvdW50ID0gb1FSQ29kZS5nZXRNb2R1bGVDb3VudCgpO1xuICAgICAgICAgICAgdmFyIG5XaWR0aCA9IE1hdGguZmxvb3IoX2h0T3B0aW9uLndpZHRoIC8gbkNvdW50KTtcbiAgICAgICAgICAgIHZhciBuSGVpZ2h0ID0gTWF0aC5mbG9vcihfaHRPcHRpb24uaGVpZ2h0IC8gbkNvdW50KTtcbiAgICAgICAgICAgIHZhciBhSFRNTCA9IFsnPHRhYmxlIHN0eWxlPVwiYm9yZGVyOjA7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO1wiPiddO1xuXG4gICAgICAgICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBuQ291bnQ7IHJvdysrKSB7XG4gICAgICAgICAgICAgICAgYUhUTUwucHVzaCgnPHRyPicpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgbkNvdW50OyBjb2wrKykge1xuICAgICAgICAgICAgICAgICAgICBhSFRNTC5wdXNoKCc8dGQgc3R5bGU9XCJib3JkZXI6MDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7cGFkZGluZzowO21hcmdpbjowO3dpZHRoOicgKyBuV2lkdGggKyAncHg7aGVpZ2h0OicgKyBuSGVpZ2h0ICsgJ3B4O2JhY2tncm91bmQtY29sb3I6JyArIChvUVJDb2RlLmlzRGFyayhyb3csIGNvbCkgPyBfaHRPcHRpb24uY29sb3JEYXJrIDogX2h0T3B0aW9uLmNvbG9yTGlnaHQpICsgJztcIj48L3RkPicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFIVE1MLnB1c2goJzwvdHI+Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFIVE1MLnB1c2goJzwvdGFibGU+Jyk7XG4gICAgICAgICAgICBfZWwuaW5uZXJIVE1MID0gYUhUTUwuam9pbignJyk7XG5cbiAgICAgICAgICAgIC8vIEZpeCB0aGUgbWFyZ2luIHZhbHVlcyBhcyByZWFsIHNpemUuXG4gICAgICAgICAgICB2YXIgZWxUYWJsZSA9IF9lbC5jaGlsZE5vZGVzWzBdO1xuICAgICAgICAgICAgdmFyIG5MZWZ0TWFyZ2luVGFibGUgPSAoX2h0T3B0aW9uLndpZHRoIC0gZWxUYWJsZS5vZmZzZXRXaWR0aCkgLyAyO1xuICAgICAgICAgICAgdmFyIG5Ub3BNYXJnaW5UYWJsZSA9IChfaHRPcHRpb24uaGVpZ2h0IC0gZWxUYWJsZS5vZmZzZXRIZWlnaHQpIC8gMjtcblxuICAgICAgICAgICAgaWYgKG5MZWZ0TWFyZ2luVGFibGUgPiAwICYmIG5Ub3BNYXJnaW5UYWJsZSA+IDApIHtcbiAgICAgICAgICAgICAgICBlbFRhYmxlLnN0eWxlLm1hcmdpbiA9IG5Ub3BNYXJnaW5UYWJsZSArIFwicHggXCIgKyBuTGVmdE1hcmdpblRhYmxlICsgXCJweFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhciB0aGUgUVJDb2RlXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX2VsLmlubmVySFRNTCA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBEcmF3aW5nO1xuICAgIH0pKCkgOiAoZnVuY3Rpb24gKCkgeyAvLyBEcmF3aW5nIGluIENhbnZhc1xuICAgICAgICBmdW5jdGlvbiBfb25NYWtlSW1hZ2UoKSB7XG4gICAgICAgICAgICB0aGlzLl9lbEltYWdlLnNyYyA9IHRoaXMuX2VsQ2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTtcbiAgICAgICAgICAgIHRoaXMuX2VsSW1hZ2Uuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcbiAgICAgICAgICAgIHRoaXMuX2VsQ2FudmFzLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFuZHJvaWQgMi4xIGJ1ZyB3b3JrYXJvdW5kXG4gICAgICAgIC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC9hbmRyb2lkL2lzc3Vlcy9kZXRhaWw/aWQ9NTE0MVxuICAgICAgICBpZiAodGhpcy5fYW5kcm9pZCAmJiB0aGlzLl9hbmRyb2lkIDw9IDIuMSkge1xuICAgICAgICAgICAgdmFyIGZhY3RvciA9IDEgLyB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgICAgICAgIHZhciBkcmF3SW1hZ2UgPSBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmRyYXdJbWFnZTtcbiAgICAgICAgICAgIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZHJhd0ltYWdlID0gZnVuY3Rpb24gKGltYWdlLCBzeCwgc3ksIHN3LCBzaCwgZHgsIGR5LCBkdywgZGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoKFwibm9kZU5hbWVcIiBpbiBpbWFnZSkgJiYgL2ltZy9pLnRlc3QoaW1hZ2Uubm9kZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAxOyBpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1tpXSA9IGFyZ3VtZW50c1tpXSAqIGZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGR3ID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzFdICo9IGZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzJdICo9IGZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzNdICo9IGZhY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzWzRdICo9IGZhY3RvcjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkcmF3SW1hZ2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgd2hldGhlciB0aGUgdXNlcidzIGJyb3dzZXIgc3VwcG9ydHMgRGF0YSBVUkkgb3Igbm90XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZTdWNjZXNzIE9jY3VycyBpZiBpdCBzdXBwb3J0cyBEYXRhIFVSSVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmRmFpbCBPY2N1cnMgaWYgaXQgZG9lc24ndCBzdXBwb3J0IERhdGEgVVJJXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBfc2FmZVNldERhdGFVUkkoZlN1Y2Nlc3MsIGZGYWlsKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBzZWxmLl9mRmFpbCA9IGZGYWlsO1xuICAgICAgICAgICAgc2VsZi5fZlN1Y2Nlc3MgPSBmU3VjY2VzcztcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaXQganVzdCBvbmNlXG4gICAgICAgICAgICBpZiAoc2VsZi5fYlN1cHBvcnREYXRhVVJJID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgZk9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fYlN1cHBvcnREYXRhVVJJID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX2ZGYWlsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfZkZhaWwuY2FsbChzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIGZPblN1Y2Nlc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fYlN1cHBvcnREYXRhVVJJID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fZlN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX2ZTdWNjZXNzLmNhbGwoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgZWwub25hYm9ydCA9IGZPbkVycm9yO1xuICAgICAgICAgICAgICAgIGVsLm9uZXJyb3IgPSBmT25FcnJvcjtcbiAgICAgICAgICAgICAgICBlbC5vbmxvYWQgPSBmT25TdWNjZXNzO1xuICAgICAgICAgICAgICAgIGVsLnNyYyA9IFwiZGF0YTppbWFnZS9naWY7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBVUFBQUFGQ0FZQUFBQ05ieWJsQUFBQUhFbEVRVlFJMTJQNC8vOC93MzhHSUFYRElCS0UwREh4Z2xqTkJBQU85VFhMMFk0T0h3QUFBQUJKUlU1RXJrSmdnZz09XCI7IC8vIHRoZSBJbWFnZSBjb250YWlucyAxcHggZGF0YS5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlbGYuX2JTdXBwb3J0RGF0YVVSSSA9PT0gdHJ1ZSAmJiBzZWxmLl9mU3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHNlbGYuX2ZTdWNjZXNzLmNhbGwoc2VsZik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlbGYuX2JTdXBwb3J0RGF0YVVSSSA9PT0gZmFsc2UgJiYgc2VsZi5fZkZhaWwpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9mRmFpbC5jYWxsKHNlbGYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEcmF3aW5nIFFSQ29kZSBieSB1c2luZyBjYW52YXNcbiAgICAgICAgICpcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBodE9wdGlvbiBRUkNvZGUgT3B0aW9uc1xuICAgICAgICAgKi9cbiAgICAgICAgdmFyIERyYXdpbmcgPSBmdW5jdGlvbiAoZWwsIGh0T3B0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9iSXNQYWludGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9hbmRyb2lkID0gX2dldEFuZHJvaWQoKTtcblxuICAgICAgICAgICAgdGhpcy5faHRPcHRpb24gPSBodE9wdGlvbjtcbiAgICAgICAgICAgIHRoaXMuX2VsQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICAgICAgICAgIHRoaXMuX2VsQ2FudmFzLndpZHRoID0gaHRPcHRpb24ud2lkdGg7XG4gICAgICAgICAgICB0aGlzLl9lbENhbnZhcy5oZWlnaHQgPSBodE9wdGlvbi5oZWlnaHQ7XG4gICAgICAgICAgICBlbC5hcHBlbmRDaGlsZCh0aGlzLl9lbENhbnZhcyk7XG4gICAgICAgICAgICB0aGlzLl9lbCA9IGVsO1xuICAgICAgICAgICAgdGhpcy5fb0NvbnRleHQgPSB0aGlzLl9lbENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgICAgICB0aGlzLl9iSXNQYWludGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lbEltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcbiAgICAgICAgICAgIHRoaXMuX2VsSW1hZ2Uuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgdGhpcy5fZWwuYXBwZW5kQ2hpbGQodGhpcy5fZWxJbWFnZSk7XG4gICAgICAgICAgICB0aGlzLl9iU3VwcG9ydERhdGFVUkkgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEcmF3IHRoZSBRUkNvZGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtRUkNvZGV9IG9RUkNvZGVcbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAob1FSQ29kZSkge1xuICAgICAgICAgICAgdmFyIF9lbEltYWdlID0gdGhpcy5fZWxJbWFnZTtcbiAgICAgICAgICAgIHZhciBfb0NvbnRleHQgPSB0aGlzLl9vQ29udGV4dDtcbiAgICAgICAgICAgIHZhciBfaHRPcHRpb24gPSB0aGlzLl9odE9wdGlvbjtcblxuICAgICAgICAgICAgdmFyIG5Db3VudCA9IG9RUkNvZGUuZ2V0TW9kdWxlQ291bnQoKTtcbiAgICAgICAgICAgIHZhciBuV2lkdGggPSBfaHRPcHRpb24ud2lkdGggLyBuQ291bnQ7XG4gICAgICAgICAgICB2YXIgbkhlaWdodCA9IF9odE9wdGlvbi5oZWlnaHQgLyBuQ291bnQ7XG4gICAgICAgICAgICB2YXIgblJvdW5kZWRXaWR0aCA9IE1hdGgucm91bmQobldpZHRoKTtcbiAgICAgICAgICAgIHZhciBuUm91bmRlZEhlaWdodCA9IE1hdGgucm91bmQobkhlaWdodCk7XG5cbiAgICAgICAgICAgIF9lbEltYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbkNvdW50OyByb3crKykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG5Db3VudDsgY29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJJc0RhcmsgPSBvUVJDb2RlLmlzRGFyayhyb3csIGNvbCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuTGVmdCA9IGNvbCAqIG5XaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5Ub3AgPSByb3cgKiBuSGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQuc3Ryb2tlU3R5bGUgPSBiSXNEYXJrID8gX2h0T3B0aW9uLmNvbG9yRGFyayA6IF9odE9wdGlvbi5jb2xvckxpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQubGluZVdpZHRoID0gMTtcbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LmZpbGxTdHlsZSA9IGJJc0RhcmsgPyBfaHRPcHRpb24uY29sb3JEYXJrIDogX2h0T3B0aW9uLmNvbG9yTGlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5maWxsUmVjdChuTGVmdCwgblRvcCwgbldpZHRoLCBuSGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyDslYjti7Ag7JWo66as7Ja07IuxIOuwqeyngCDsspjrpqxcbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LnN0cm9rZVJlY3QoXG4gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKG5MZWZ0KSArIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoblRvcCkgKyAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuUm91bmRlZFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgblJvdW5kZWRIZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQuc3Ryb2tlUmVjdChcbiAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY2VpbChuTGVmdCkgLSAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNlaWwoblRvcCkgLSAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuUm91bmRlZFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgblJvdW5kZWRIZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2JJc1BhaW50ZWQgPSB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNYWtlIHRoZSBpbWFnZSBmcm9tIENhbnZhcyBpZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBEYXRhIFVSSS5cbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLm1ha2VJbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9iSXNQYWludGVkKSB7XG4gICAgICAgICAgICAgICAgX3NhZmVTZXREYXRhVVJJLmNhbGwodGhpcywgX29uTWFrZUltYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJuIHdoZXRoZXIgdGhlIFFSQ29kZSBpcyBwYWludGVkIG9yIG5vdFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuaXNQYWludGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JJc1BhaW50ZWQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFyIHRoZSBRUkNvZGVcbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fb0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMuX2VsQ2FudmFzLndpZHRoLCB0aGlzLl9lbENhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgdGhpcy5fYklzUGFpbnRlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gbk51bWJlclxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUucm91bmQgPSBmdW5jdGlvbiAobk51bWJlcikge1xuICAgICAgICAgICAgaWYgKCFuTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5OdW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKG5OdW1iZXIgKiAxMDAwKSAvIDEwMDA7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIERyYXdpbmc7XG4gICAgfSkoKTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdHlwZSBieSBzdHJpbmcgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzVGV4dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuQ29ycmVjdExldmVsXG4gICAgICogQHJldHVybiB7TnVtYmVyfSB0eXBlXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2dldFR5cGVOdW1iZXIoc1RleHQsIG5Db3JyZWN0TGV2ZWwpIHtcbiAgICAgICAgdmFyIG5UeXBlID0gMTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IF9nZXRVVEY4TGVuZ3RoKHNUZXh0KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gUVJDb2RlTGltaXRMZW5ndGgubGVuZ3RoOyBpIDw9IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbkxpbWl0ID0gMDtcblxuICAgICAgICAgICAgc3dpdGNoIChuQ29ycmVjdExldmVsKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBRUkVycm9yQ29ycmVjdExldmVsLkwgOlxuICAgICAgICAgICAgICAgICAgICBuTGltaXQgPSBRUkNvZGVMaW1pdExlbmd0aFtpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBRUkVycm9yQ29ycmVjdExldmVsLk0gOlxuICAgICAgICAgICAgICAgICAgICBuTGltaXQgPSBRUkNvZGVMaW1pdExlbmd0aFtpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBRUkVycm9yQ29ycmVjdExldmVsLlEgOlxuICAgICAgICAgICAgICAgICAgICBuTGltaXQgPSBRUkNvZGVMaW1pdExlbmd0aFtpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBRUkVycm9yQ29ycmVjdExldmVsLkggOlxuICAgICAgICAgICAgICAgICAgICBuTGltaXQgPSBRUkNvZGVMaW1pdExlbmd0aFtpXVszXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChsZW5ndGggPD0gbkxpbWl0KSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5UeXBlKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoblR5cGUgPiBRUkNvZGVMaW1pdExlbmd0aC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBsb25nIGRhdGFcIik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gblR5cGU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2dldFVURjhMZW5ndGgoc1RleHQpIHtcbiAgICAgICAgdmFyIHJlcGxhY2VkVGV4dCA9IGVuY29kZVVSSShzVGV4dCkudG9TdHJpbmcoKS5yZXBsYWNlKC9cXCVbMC05YS1mQS1GXXsyfS9nLCAnYScpO1xuICAgICAgICByZXR1cm4gcmVwbGFjZWRUZXh0Lmxlbmd0aCArIChyZXBsYWNlZFRleHQubGVuZ3RoICE9IHNUZXh0ID8gMyA6IDApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBjbGFzcyBRUkNvZGVcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIG5ldyBRUkNvZGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXN0XCIpLCBcImh0dHA6Ly9qaW5kby5kZXYubmF2ZXIuY29tL2NvbGxpZVwiKTtcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogdmFyIG9RUkNvZGUgPSBuZXcgUVJDb2RlKFwidGVzdFwiLCB7XG4gICAgICogICAgdGV4dCA6IFwiaHR0cDovL25hdmVyLmNvbVwiLFxuICAgICAqICAgIHdpZHRoIDogMTI4LFxuICAgICAqICAgIGhlaWdodCA6IDEyOFxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogb1FSQ29kZS5jbGVhcigpOyAvLyBDbGVhciB0aGUgUVJDb2RlLlxuICAgICAqIG9RUkNvZGUubWFrZUNvZGUoXCJodHRwOi8vbWFwLm5hdmVyLmNvbVwiKTsgLy8gUmUtY3JlYXRlIHRoZSBRUkNvZGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fFN0cmluZ30gZWwgdGFyZ2V0IGVsZW1lbnQgb3IgJ2lkJyBhdHRyaWJ1dGUgb2YgZWxlbWVudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHZPcHRpb25cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdk9wdGlvbi50ZXh0IFFSQ29kZSBsaW5rIGRhdGFcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ZPcHRpb24ud2lkdGg9MjU2XVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbdk9wdGlvbi5oZWlnaHQ9MjU2XVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbdk9wdGlvbi5jb2xvckRhcms9XCIjMDAwMDAwXCJdXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFt2T3B0aW9uLmNvbG9yTGlnaHQ9XCIjZmZmZmZmXCJdXG4gICAgICogQHBhcmFtIHtRUkNvZGUuQ29ycmVjdExldmVsfSBbdk9wdGlvbi5jb3JyZWN0TGV2ZWw9UVJDb2RlLkNvcnJlY3RMZXZlbC5IXSBbTHxNfFF8SF1cbiAgICAgKi9cbiAgICBRUkNvZGUgPSBmdW5jdGlvbiAoZWwsIHZPcHRpb24pIHtcbiAgICAgICAgdGhpcy5faHRPcHRpb24gPSB7XG4gICAgICAgICAgICB3aWR0aCA6IDI1NixcbiAgICAgICAgICAgIGhlaWdodCA6IDI1NixcbiAgICAgICAgICAgIHR5cGVOdW1iZXIgOiA0LFxuICAgICAgICAgICAgY29sb3JEYXJrIDogXCIjMDAwMDAwXCIsXG4gICAgICAgICAgICBjb2xvckxpZ2h0IDogXCIjZmZmZmZmXCIsXG4gICAgICAgICAgICBjb3JyZWN0TGV2ZWwgOiBRUkVycm9yQ29ycmVjdExldmVsLkhcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIHZPcHRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB2T3B0aW9uID0ge1xuICAgICAgICAgICAgICAgIHRleHQgOiB2T3B0aW9uXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3ZlcndyaXRlcyBvcHRpb25zXG4gICAgICAgIGlmICh2T3B0aW9uKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpIGluIHZPcHRpb24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9odE9wdGlvbltpXSA9IHZPcHRpb25baV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGVsID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fYW5kcm9pZCA9IF9nZXRBbmRyb2lkKCk7XG4gICAgICAgIHRoaXMuX2VsID0gZWw7XG4gICAgICAgIHRoaXMuX29RUkNvZGUgPSBudWxsO1xuICAgICAgICB0aGlzLl9vRHJhd2luZyA9IG5ldyBEcmF3aW5nKHRoaXMuX2VsLCB0aGlzLl9odE9wdGlvbik7XG5cbiAgICAgICAgaWYgKHRoaXMuX2h0T3B0aW9uLnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMubWFrZUNvZGUodGhpcy5faHRPcHRpb24udGV4dCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTWFrZSB0aGUgUVJDb2RlXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc1RleHQgbGluayBkYXRhXG4gICAgICovXG4gICAgUVJDb2RlLnByb3RvdHlwZS5tYWtlQ29kZSA9IGZ1bmN0aW9uIChzVGV4dCkge1xuICAgICAgICB0aGlzLl9vUVJDb2RlID0gbmV3IFFSQ29kZU1vZGVsKF9nZXRUeXBlTnVtYmVyKHNUZXh0LCB0aGlzLl9odE9wdGlvbi5jb3JyZWN0TGV2ZWwpLCB0aGlzLl9odE9wdGlvbi5jb3JyZWN0TGV2ZWwpO1xuICAgICAgICB0aGlzLl9vUVJDb2RlLmFkZERhdGEoc1RleHQpO1xuICAgICAgICB0aGlzLl9vUVJDb2RlLm1ha2UoKTtcbiAgICAgICAgdGhpcy5fZWwudGl0bGUgPSBzVGV4dDtcbiAgICAgICAgdGhpcy5fb0RyYXdpbmcuZHJhdyh0aGlzLl9vUVJDb2RlKTtcbiAgICAgICAgdGhpcy5tYWtlSW1hZ2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTWFrZSB0aGUgSW1hZ2UgZnJvbSBDYW52YXMgZWxlbWVudFxuICAgICAqIC0gSXQgb2NjdXJzIGF1dG9tYXRpY2FsbHlcbiAgICAgKiAtIEFuZHJvaWQgYmVsb3cgMyBkb2Vzbid0IHN1cHBvcnQgRGF0YS1VUkkgc3BlYy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgUVJDb2RlLnByb3RvdHlwZS5tYWtlSW1hZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fb0RyYXdpbmcubWFrZUltYWdlID09IFwiZnVuY3Rpb25cIiAmJiAoIXRoaXMuX2FuZHJvaWQgfHwgdGhpcy5fYW5kcm9pZCA+PSAzKSkge1xuICAgICAgICAgICAgdGhpcy5fb0RyYXdpbmcubWFrZUltYWdlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgdGhlIFFSQ29kZVxuICAgICAqL1xuICAgIFFSQ29kZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX29EcmF3aW5nLmNsZWFyKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFFSQ29kZS5Db3JyZWN0TGV2ZWxcbiAgICAgKi9cbiAgICBRUkNvZGUuQ29ycmVjdExldmVsID0gUVJFcnJvckNvcnJlY3RMZXZlbDtcbn0pKCk7XG5cbmV4cG9ydHMuUVJDb2RlID0gUVJDb2RlO1xuXG4iXX0=
(1)
});
