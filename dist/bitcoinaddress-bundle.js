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
     * Create user interface for all bitcoin address elements on the page.
     */
    applyTemplates: function() {
        var self = this;

        var template = this.getTemplate();

        // Optionally bail out if the default selection
        // is not given (user calls applyTemplate() manually)
        if(!this.config.selector) {
            return;
        }

        $(this.config.selector).each(function() {

            var $this = $(this);

            // Make sure we don't apply the template on the template itself
            if($this.parents("#" + self.config.template).size() > 0) {
                return;
            }

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
     * QR code generation action.
     */
    onActionQR : function(e) {
        e.preventDefault();
        var elem = $(e.target).parents(".bitcoin-address-container");
        var addr = elem.attr("data-bc-address");
        var qrContainer = elem.find(".bitcoin-address-qr-container");

        // Lazily generate the QR code
        if(qrContainer.children().size() === 0) {
            var options = $.extend({}, this.config.qr, {
                text: addr
            });
            var qrCode = new qrcode.QRCode(qrContainer.get(0), options);
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
        this.applyTemplates();
        this.initUX();
    }
};

},{"./qrcode.js":2}],2:[function(require,module,exports){
/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 *
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */
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

    var useSVG = document.documentElement.tagName.toLowerCase() === "svg";

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWlra28vY29kZS9pbWFnZXBvdC9pbWFnZXBvdC9zdGF0aWMvYml0Y29pbmFkZHJlc3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9taWtrby9jb2RlL2ltYWdlcG90L2ltYWdlcG90L3N0YXRpYy9iaXRjb2luYWRkcmVzcy9iaXRjb2luYWRkcmVzcy5qcyIsIi9Vc2Vycy9taWtrby9jb2RlL2ltYWdlcG90L2ltYWdlcG90L3N0YXRpYy9iaXRjb2luYWRkcmVzcy9xcmNvZGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIGJpdGNvaW5hZGRyZXNzLmpzXG4gKlxuICogQml0Y29pbiBhZGRyZXNzIGFuZCBwYXltZW50IGhlbHBlci5cbiAqXG4gKiBDb3B5cmlnaHQgMjAxMyBNaWtrbyBPaHRhbWFhIGh0dHA6Ly9vcGVuc291cmNlaGFja2VyLmNvbVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlLlxuICovXG5cblxuLy8gUGxlYXNlIG5vdGUgdGhhdCBzY3JpcHQgdGhpcyBkZXBlbmRzIG9uIGpRdWVyeSxcbi8vIGJ1dCBJIGRpZCBub3QgZmluZCBhIHNvbHV0aW9uIGZvciBoYXZpbmcgVU1EIGxvYWRpbmcgZm9yIHRoZSBzY3JpcHQsXG4vLyBzbyB0aGF0IGpRdWVyeSB3b3VsZCBiZSBhdmFpbGFibGUgdGhyb3VnaCBicm93c2VyaWZ5IGJ1bmRsaW5nXG4vLyBPUiBDRE4uIEluY2x1ZGUgalF1ZXJ5IGV4dGVybmFsbHkgYmVmb3JlIGluY2x1ZGluZyB0aGlzIHNjcmlwdC5cblxuLyogZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSAqL1xudmFyIHFyY29kZSA9IHJlcXVpcmUoXCIuL3FyY29kZS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBjb25maWcgOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFVSTCBmb3IgYml0Y29pbiBVUkkgc2NoZW1lIHBheW1lbnRzLlxuICAgICAqXG4gICAgICogaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4vYmlwcy9ibG9iL21hc3Rlci9iaXAtMDAyMS5tZWRpYXdpa2kjRXhhbXBsZXNcbiAgICAgKlxuICAgICAqIGh0dHA6Ly9iaXRjb2luLnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy80OTg3L2JpdGNvaW4tdXJsLXNjaGVtZVxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhZGRyZXNzIFJlY2VpdmluZyBhZGRyZXNzXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhbW91bnQgIEFtb3VudCBhcyBiaWcgZGVjaW1hbFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbGFiZWwgICBbZGVzY3JpcHRpb25dXG4gICAgICogQHBhcmFtICB7W3R5cGVdfSBtZXNzYWdlIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuICAgICAqL1xuICAgIGJ1aWxkQml0Y29pblVSSSA6IGZ1bmN0aW9uKGFkZHJlc3MsIGFtb3VudCwgbGFiZWwsIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIHRtcGwgPSBbXCJiaXRjb2luOlwiLCBhZGRyZXNzLCBcIj9cIl07XG5cbiAgICAgICAgaWYoYW1vdW50KSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wiYW1vdW50PVwiLCBlbmNvZGVVUklDb21wb25lbnQoYW1vdW50KSwgXCImXCJdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGxhYmVsKSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wibGFiZWw9XCIsIGVuY29kZVVSSUNvbXBvbmVudChsYWJlbCksIFwiJlwiXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihtZXNzYWdlKSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wibWVzc2FnZT1cIiwgZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UpLCBcIiZcIl0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBwcmVmaXhpbmcgZXh0cmFcbiAgICAgICAgdmFyIGxhc3RjID0gdG1wbFt0bXBsLmxlbmd0aC0xXTtcbiAgICAgICAgaWYobGFzdGMgPT0gXCImXCIgfHwgbGFzdGMgPT0gXCI/XCIpIHtcbiAgICAgICAgICAgIHRtcGwgPSB0bXBsLnNwbGljZSgwLCB0bXBsLmxlbmd0aC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0bXBsLmpvaW4oXCJcIik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNwZWNpYWwgSFRNTCBmb3IgYml0Y29pbiBhZGRyZXNzIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcGFyYW0gIHtET019IGVsZW0gICBUZW1wbGF0aXplZCB0YXJnZXRcbiAgICAgKiBAcGFyYW0gIHtET019IHNvdXJjZSBPcmlnaW5hbCBzb3VyY2UgdHJlZSBlbGVtZW50IHdpdGggZGF0YSBhdHRyaWJ1dGVzXG4gICAgICovXG4gICAgYnVpbGRDb250cm9scyA6IGZ1bmN0aW9uKGVsZW0sIHNvdXJjZSkge1xuXG4gICAgICAgIC8vIFJlcGxhY2UgLmJpdGNvaW4tYWRkcmVzcyBpbiB0aGUgdGVtcGxhdGVcbiAgICAgICAgdmFyIGFkZHIgPSBlbGVtLmZpbmQoXCIuYml0Y29pbi1hZGRyZXNzXCIpO1xuICAgICAgICBhZGRyLnRleHQoc291cmNlLmF0dHIoXCJkYXRhLWJjLWFkZHJlc3NcIikpO1xuXG4gICAgICAgIC8vIENvcHkgb3JpZ25hbCBhdHRyaWJ1dGVzO1xuICAgICAgICAkLmVhY2goW1wiYWRkcmVzc1wiLCBcImFtb3VudFwiLCBcImxhYmVsXCIsIFwibWVzc2FnZVwiXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgYXR0ck5hbWUgPSBcImRhdGEtYmMtXCIgKyB0aGlzO1xuICAgICAgICAgICAgZWxlbS5hdHRyKGF0dHJOYW1lLCBzb3VyY2UuYXR0cihhdHRyTmFtZSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCBCVEMgVVJMXG4gICAgICAgIHZhciB1cmwgPSB0aGlzLmJ1aWxkQml0Y29pblVSSShzb3VyY2UuYXR0cihcImRhdGEtYmMtYWRkcmVzc1wiKSxcbiAgICAgICAgICAgIHNvdXJjZS5hdHRyKFwiZGF0YS1iYy1hbW91bnRcIiksXG4gICAgICAgICAgICBzb3VyY2UuYXR0cihcImRhdGEtYmMtbGFiZWxcIiksXG4gICAgICAgICAgICBzb3VyY2UuYXR0cihcImRhdGEtYmMtbWVzc2FnZVwiKSk7XG5cbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWRkcmVzcy1hY3Rpb24tc2VuZFwiKS5hdHRyKFwiaHJlZlwiLCB1cmwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHRlbXBsYXRlIGVsZW1lbnQgZGVmaW5lZCBpbiB0aGUgb3B0aW9ucy5cbiAgICAgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAgICAgKi9cbiAgICBnZXRUZW1wbGF0ZSA6IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuY29uZmlnLnRlbXBsYXRlKTtcblxuICAgICAgICBpZighdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJpdGNvaW4gYWRkcmVzcyB0ZW1wbGF0ZSBlbGVtZW50IG1pc3Npbmc6XCIgKyB0aGlzLmNvbmZpZy50ZW1wbGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wbGF0ZSA9ICQodGVtcGxhdGUpO1xuXG4gICAgICAgIGlmKHRlbXBsYXRlLnNpemUoKSAhPSAxKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCaXRjb2luIGFkZHJlc3MgdGVtcGxhdGUgRE9NIGRvZXMgbm90IGNvbnRhaW4gYSBzaW5nbGUgZWxlbWVudFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyBiaXRjb2luYWRkcmVzcyBET00gdGVtcGxhdGUgdG8gYSBjZXJ0YWluIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBUaGUgYHRhcmdldGAgZWxlbWVudCBtdXN0IGNvbnRhaW4gbmVjZXNzYXJ5IGRhdGEtYXR0cmlidXRlc1xuICAgICAqIGZyb20gd2hlcmUgd2Ugc2Nvb3AgdGhlIGluZm8uXG4gICAgICpcbiAgICAgKiBBbHNvIGJ1aWxkcyBiaXRjb2luOiBVUkkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbSBqUXVlcnkgc2VsZWN0aW9uIG9mIHRhcmdldCBiaXRjb2luIGFkZHJlc3NcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gdGVtcGxhdGUgKG9wdGlvbmFsKSBUZW1wbGF0ZSBlbGVtZW50IHRvIGJlIGFwcGxpZWRcbiAgICAgKi9cbiAgICBhcHBseVRlbXBsYXRlIDogZnVuY3Rpb24odGFyZ2V0LCB0ZW1wbGF0ZSkge1xuXG4gICAgICAgIGlmKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPSB0aGlzLmdldFRlbXBsYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIGEgZGVlcCBjb3B5LCBzbyB3ZSBkb24ndCBhY2NpZGVudGFsbHkgbW9kaWZ5XG4gICAgICAgIC8vIHRlbXBsYXRlIGVsZW1lbnRzIGluLXBsYWNlXG4gICAgICAgIHZhciBlbGVtID0gdGVtcGxhdGUuY2xvbmUoZmFsc2UsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuYnVpbGRDb250cm9scyhlbGVtLCB0YXJnZXQpO1xuXG4gICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBhcmUgdmlzaWJsZSAoSFRNTDUgd2F5LCBDU1Mgd2F5KVxuICAgICAgICAvLyBhbmQgY2xlYW4gdXAgdGhlIHRlbXBsYXRlIGlkIGlmIHdlIG1hbmFnZWQgdG8gY29weSBpdCBhcm91bmRcbiAgICAgICAgZWxlbS5yZW1vdmVBdHRyKFwiaGlkZGVuIGlkXCIpO1xuICAgICAgICBlbGVtLnNob3coKTtcblxuICAgICAgICB0YXJnZXQucmVwbGFjZVdpdGgoZWxlbSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB1c2VyIGludGVyZmFjZSBmb3IgYWxsIGJpdGNvaW4gYWRkcmVzcyBlbGVtZW50cyBvbiB0aGUgcGFnZS5cbiAgICAgKi9cbiAgICBhcHBseVRlbXBsYXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLmdldFRlbXBsYXRlKCk7XG5cbiAgICAgICAgLy8gT3B0aW9uYWxseSBiYWlsIG91dCBpZiB0aGUgZGVmYXVsdCBzZWxlY3Rpb25cbiAgICAgICAgLy8gaXMgbm90IGdpdmVuICh1c2VyIGNhbGxzIGFwcGx5VGVtcGxhdGUoKSBtYW51YWxseSlcbiAgICAgICAgaWYoIXRoaXMuY29uZmlnLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuY29uZmlnLnNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3QgYXBwbHkgdGhlIHRlbXBsYXRlIG9uIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAgICAgICAgIGlmKCR0aGlzLnBhcmVudHMoXCIjXCIgKyBzZWxmLmNvbmZpZy50ZW1wbGF0ZSkuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZi5hcHBseVRlbXBsYXRlKCR0aGlzLCB0ZW1wbGF0ZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIHNlbGVjdGlvbiBpbiAuYml0Y29pbi1hZGRyZXNzLWNvbnRhaW5lciBmb3IgY29weSBwYXN0ZVxuICAgICAqL1xuICAgIHByZXBhcmVDb3B5U2VsZWN0aW9uIDogZnVuY3Rpb24oZWxlbSkge1xuICAgICAgICB2YXIgYWRkeSA9IGVsZW0uZmluZChcIi5iaXRjb2luLWFkZHJlc3NcIik7XG4gICAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5zZWxlY3RBbGxDaGlsZHJlbihhZGR5LmdldCgwKSk7XG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50XCIpLmhpZGUoKTtcbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnQtY29weVwiKS5zbGlkZURvd24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBwYXltZW50IGFjdGlvbiBoYW5kbGVyXG4gICAgICovXG4gICAgb25BY3Rpb25TZW5kIDogZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHMoXCIuYml0Y29pbi1hZGRyZXNzLWNvbnRhaW5lclwiKTtcbiAgICAgICAgLy8gV2UgbmV2ZXIga25vdyBpZiB0aGUgY2xpY2sgYWN0aW9uIHdhcyBzdWNjZXNmdWxseSBjb21wbGV0ZVxuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludFwiKS5oaWRlKCk7XG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50LXNlbmRcIikuc2xpZGVEb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvcHkgYWN0aW9uIGhhbmRsZXIuXG4gICAgICovXG4gICAgb25BY3Rpb25Db3B5IDogZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBlbGVtID0gJChlLnRhcmdldCkucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICB0aGlzLnByZXBhcmVDb3B5U2VsZWN0aW9uKGVsZW0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogUVIgY29kZSBnZW5lcmF0aW9uIGFjdGlvbi5cbiAgICAgKi9cbiAgICBvbkFjdGlvblFSIDogZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBlbGVtID0gJChlLnRhcmdldCkucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICB2YXIgYWRkciA9IGVsZW0uYXR0cihcImRhdGEtYmMtYWRkcmVzc1wiKTtcbiAgICAgICAgdmFyIHFyQ29udGFpbmVyID0gZWxlbS5maW5kKFwiLmJpdGNvaW4tYWRkcmVzcy1xci1jb250YWluZXJcIik7XG5cbiAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIHRoZSBRUiBjb2RlXG4gICAgICAgIGlmKHFyQ29udGFpbmVyLmNoaWxkcmVuKCkuc2l6ZSgpID09PSAwKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLmNvbmZpZy5xciwge1xuICAgICAgICAgICAgICAgIHRleHQ6IGFkZHJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHFyQ29kZSA9IG5ldyBxcmNvZGUuUVJDb2RlKHFyQ29udGFpbmVyLmdldCgwKSwgb3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludFwiKS5oaWRlKCk7XG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50LXFyXCIpLnNsaWRlRG93bigpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgb25DbGljayA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIHRoaXMucHJlcGFyZUNvcHlTZWxlY3Rpb24oZWxlbSk7XG4gICAgfSxcblxuICAgIGluaXRVWCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNsaWNrXCIsIFwiLmJpdGNvaW4tYWRkcmVzcy1hY3Rpb24tY29weVwiLCAkLnByb3h5KHRoaXMub25BY3Rpb25Db3B5LCB0aGlzKSk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkub24oXCJjbGlja1wiLCBcIi5iaXRjb2luLWFkZHJlc3MtYWN0aW9uLXNlbmRcIiwgJC5wcm94eSh0aGlzLm9uQWN0aW9uU2VuZCwgdGhpcykpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLm9uKFwiY2xpY2tcIiwgXCIuYml0Y29pbi1hZGRyZXNzLWFjdGlvbi1xclwiLCAkLnByb3h5KHRoaXMub25BY3Rpb25RUiwgdGhpcykpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLm9uKFwiY2xpY2tcIiwgXCIuYml0Y29pbi1hZGRyZXNzXCIsICQucHJveHkodGhpcy5vbkNsaWNrLCB0aGlzKSk7XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgY29weSBoaW50cyB3aGVuIHVzZXIgcHJlc3NlcyBDVFJMK0NcbiAgICAgICAgLy8gb24gYW55IHBhcnQgb2YgdGhlIHBhZ2VcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNvcHlcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnQtY29weVwiKS5zbGlkZVVwKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGwgdG8gaW5pdGlhbGl6ZSB0aGUgZGV0YXVsdCBiaXRjb2lucHJpY2VzIFVJLlxuICAgICAqL1xuICAgIGluaXQgOiBmdW5jdGlvbihfY29uZmlnKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYoIV9jb25maWcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IGdpdmUgYml0Y29pbmFkZHJlc3MgY29uZmlnIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbmZpZyA9IF9jb25maWc7XG4gICAgICAgIHRoaXMuYXBwbHlUZW1wbGF0ZXMoKTtcbiAgICAgICAgdGhpcy5pbml0VVgoKTtcbiAgICB9XG59O1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3XG4gKiAtIFVzaW5nIHRoZSAnUVJDb2RlIGZvciBKYXZhc2NyaXB0IGxpYnJhcnknXG4gKiAtIEZpeGVkIGRhdGFzZXQgb2YgJ1FSQ29kZSBmb3IgSmF2YXNjcmlwdCBsaWJyYXJ5JyBmb3Igc3VwcG9ydCBmdWxsLXNwZWMuXG4gKiAtIHRoaXMgbGlicmFyeSBoYXMgbm8gZGVwZW5kZW5jaWVzLlxuICpcbiAqIEBhdXRob3IgZGF2aWRzaGltanNcbiAqIEBzZWUgPGEgaHJlZj1cImh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwOi8vd3d3LmQtcHJvamVjdC5jb20vPC9hPlxuICogQHNlZSA8YSBocmVmPVwiaHR0cDovL2plcm9tZWV0aWVubmUuZ2l0aHViLmNvbS9qcXVlcnktcXJjb2RlL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHA6Ly9qZXJvbWVldGllbm5lLmdpdGh1Yi5jb20vanF1ZXJ5LXFyY29kZS88L2E+XG4gKi9cbnZhciBRUkNvZGU7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBRUkNvZGUgZm9yIEphdmFTY3JpcHRcbiAgICAvL1xuICAgIC8vIENvcHlyaWdodCAoYykgMjAwOSBLYXp1aGlrbyBBcmFzZVxuICAgIC8vXG4gICAgLy8gVVJMOiBodHRwOi8vd3d3LmQtcHJvamVjdC5jb20vXG4gICAgLy9cbiAgICAvLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2U6XG4gICAgLy8gICBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICAgIC8vXG4gICAgLy8gVGhlIHdvcmQgXCJRUiBDb2RlXCIgaXMgcmVnaXN0ZXJlZCB0cmFkZW1hcmsgb2ZcbiAgICAvLyBERU5TTyBXQVZFIElOQ09SUE9SQVRFRFxuICAgIC8vICAgaHR0cDovL3d3dy5kZW5zby13YXZlLmNvbS9xcmNvZGUvZmFxcGF0ZW50LWUuaHRtbFxuICAgIC8vXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBmdW5jdGlvbiBRUjhiaXRCeXRlKGRhdGEpIHtcbiAgICAgICAgdGhpcy5tb2RlID0gUVJNb2RlLk1PREVfOEJJVF9CWVRFO1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgICAgICB0aGlzLnBhcnNlZERhdGEgPSBbXTtcblxuICAgICAgICAvLyBBZGRlZCB0byBzdXBwb3J0IFVURi04IENoYXJhY3RlcnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYnl0ZUFycmF5ID0gW107XG4gICAgICAgICAgICB2YXIgY29kZSA9IHRoaXMuZGF0YS5jaGFyQ29kZUF0KGkpO1xuXG4gICAgICAgICAgICBpZiAoY29kZSA+IDB4MTAwMDApIHtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMF0gPSAweEYwIHwgKChjb2RlICYgMHgxQzAwMDApID4+PiAxOCk7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzFdID0gMHg4MCB8ICgoY29kZSAmIDB4M0YwMDApID4+PiAxMik7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzJdID0gMHg4MCB8ICgoY29kZSAmIDB4RkMwKSA+Pj4gNik7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzNdID0gMHg4MCB8IChjb2RlICYgMHgzRik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPiAweDgwMCkge1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVswXSA9IDB4RTAgfCAoKGNvZGUgJiAweEYwMDApID4+PiAxMik7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzFdID0gMHg4MCB8ICgoY29kZSAmIDB4RkMwKSA+Pj4gNik7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzJdID0gMHg4MCB8IChjb2RlICYgMHgzRik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPiAweDgwKSB7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzBdID0gMHhDMCB8ICgoY29kZSAmIDB4N0MwKSA+Pj4gNik7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzFdID0gMHg4MCB8IChjb2RlICYgMHgzRik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVswXSA9IGNvZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucGFyc2VkRGF0YS5wdXNoKGJ5dGVBcnJheSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnBhcnNlZERhdGEgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCB0aGlzLnBhcnNlZERhdGEpO1xuXG4gICAgICAgIGlmICh0aGlzLnBhcnNlZERhdGEubGVuZ3RoICE9IHRoaXMuZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMucGFyc2VkRGF0YS51bnNoaWZ0KDE5MSk7XG4gICAgICAgICAgICB0aGlzLnBhcnNlZERhdGEudW5zaGlmdCgxODcpO1xuICAgICAgICAgICAgdGhpcy5wYXJzZWREYXRhLnVuc2hpZnQoMjM5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFFSOGJpdEJ5dGUucHJvdG90eXBlID0ge1xuICAgICAgICBnZXRMZW5ndGg6IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlZERhdGEubGVuZ3RoO1xuICAgICAgICB9LFxuICAgICAgICB3cml0ZTogZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnBhcnNlZERhdGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyLnB1dCh0aGlzLnBhcnNlZERhdGFbaV0sIDgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFFSQ29kZU1vZGVsKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG4gICAgICAgIHRoaXMudHlwZU51bWJlciA9IHR5cGVOdW1iZXI7XG4gICAgICAgIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwgPSBlcnJvckNvcnJlY3RMZXZlbDtcbiAgICAgICAgdGhpcy5tb2R1bGVzID0gbnVsbDtcbiAgICAgICAgdGhpcy5tb2R1bGVDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuZGF0YUNhY2hlID0gbnVsbDtcbiAgICAgICAgdGhpcy5kYXRhTGlzdCA9IFtdO1xuICAgIH1cblxuICAgIFFSQ29kZU1vZGVsLnByb3RvdHlwZT17YWRkRGF0YTpmdW5jdGlvbihkYXRhKXt2YXIgbmV3RGF0YT1uZXcgUVI4Yml0Qnl0ZShkYXRhKTt0aGlzLmRhdGFMaXN0LnB1c2gobmV3RGF0YSk7dGhpcy5kYXRhQ2FjaGU9bnVsbDt9LGlzRGFyazpmdW5jdGlvbihyb3csY29sKXtpZihyb3c8MHx8dGhpcy5tb2R1bGVDb3VudDw9cm93fHxjb2w8MHx8dGhpcy5tb2R1bGVDb3VudDw9Y29sKXt0aHJvdyBuZXcgRXJyb3Iocm93K1wiLFwiK2NvbCk7fVxuICAgIHJldHVybiB0aGlzLm1vZHVsZXNbcm93XVtjb2xdO30sZ2V0TW9kdWxlQ291bnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tb2R1bGVDb3VudDt9LG1ha2U6ZnVuY3Rpb24oKXt0aGlzLm1ha2VJbXBsKGZhbHNlLHRoaXMuZ2V0QmVzdE1hc2tQYXR0ZXJuKCkpO30sbWFrZUltcGw6ZnVuY3Rpb24odGVzdCxtYXNrUGF0dGVybil7dGhpcy5tb2R1bGVDb3VudD10aGlzLnR5cGVOdW1iZXIqNCsxNzt0aGlzLm1vZHVsZXM9bmV3IEFycmF5KHRoaXMubW9kdWxlQ291bnQpO2Zvcih2YXIgcm93PTA7cm93PHRoaXMubW9kdWxlQ291bnQ7cm93Kyspe3RoaXMubW9kdWxlc1tyb3ddPW5ldyBBcnJheSh0aGlzLm1vZHVsZUNvdW50KTtmb3IodmFyIGNvbD0wO2NvbDx0aGlzLm1vZHVsZUNvdW50O2NvbCsrKXt0aGlzLm1vZHVsZXNbcm93XVtjb2xdPW51bGw7fX1cbiAgICB0aGlzLnNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4oMCwwKTt0aGlzLnNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4odGhpcy5tb2R1bGVDb3VudC03LDApO3RoaXMuc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybigwLHRoaXMubW9kdWxlQ291bnQtNyk7dGhpcy5zZXR1cFBvc2l0aW9uQWRqdXN0UGF0dGVybigpO3RoaXMuc2V0dXBUaW1pbmdQYXR0ZXJuKCk7dGhpcy5zZXR1cFR5cGVJbmZvKHRlc3QsbWFza1BhdHRlcm4pO2lmKHRoaXMudHlwZU51bWJlcj49Nyl7dGhpcy5zZXR1cFR5cGVOdW1iZXIodGVzdCk7fVxuICAgIGlmKHRoaXMuZGF0YUNhY2hlPT1udWxsKXt0aGlzLmRhdGFDYWNoZT1RUkNvZGVNb2RlbC5jcmVhdGVEYXRhKHRoaXMudHlwZU51bWJlcix0aGlzLmVycm9yQ29ycmVjdExldmVsLHRoaXMuZGF0YUxpc3QpO31cbiAgICB0aGlzLm1hcERhdGEodGhpcy5kYXRhQ2FjaGUsbWFza1BhdHRlcm4pO30sc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybjpmdW5jdGlvbihyb3csY29sKXtmb3IodmFyIHI9LTE7cjw9NztyKyspe2lmKHJvdytyPD0tMXx8dGhpcy5tb2R1bGVDb3VudDw9cm93K3IpY29udGludWU7Zm9yKHZhciBjPS0xO2M8PTc7YysrKXtpZihjb2wrYzw9LTF8fHRoaXMubW9kdWxlQ291bnQ8PWNvbCtjKWNvbnRpbnVlO2lmKCgwPD1yJiZyPD02JiYoYz09MHx8Yz09NikpfHwoMDw9YyYmYzw9NiYmKHI9PTB8fHI9PTYpKXx8KDI8PXImJnI8PTQmJjI8PWMmJmM8PTQpKXt0aGlzLm1vZHVsZXNbcm93K3JdW2NvbCtjXT10cnVlO31lbHNle3RoaXMubW9kdWxlc1tyb3crcl1bY29sK2NdPWZhbHNlO319fX0sZ2V0QmVzdE1hc2tQYXR0ZXJuOmZ1bmN0aW9uKCl7dmFyIG1pbkxvc3RQb2ludD0wO3ZhciBwYXR0ZXJuPTA7Zm9yKHZhciBpPTA7aTw4O2krKyl7dGhpcy5tYWtlSW1wbCh0cnVlLGkpO3ZhciBsb3N0UG9pbnQ9UVJVdGlsLmdldExvc3RQb2ludCh0aGlzKTtpZihpPT0wfHxtaW5Mb3N0UG9pbnQ+bG9zdFBvaW50KXttaW5Mb3N0UG9pbnQ9bG9zdFBvaW50O3BhdHRlcm49aTt9fVxuICAgIHJldHVybiBwYXR0ZXJuO30sY3JlYXRlTW92aWVDbGlwOmZ1bmN0aW9uKHRhcmdldF9tYyxpbnN0YW5jZV9uYW1lLGRlcHRoKXt2YXIgcXJfbWM9dGFyZ2V0X21jLmNyZWF0ZUVtcHR5TW92aWVDbGlwKGluc3RhbmNlX25hbWUsZGVwdGgpO3ZhciBjcz0xO3RoaXMubWFrZSgpO2Zvcih2YXIgcm93PTA7cm93PHRoaXMubW9kdWxlcy5sZW5ndGg7cm93Kyspe3ZhciB5PXJvdypjcztmb3IodmFyIGNvbD0wO2NvbDx0aGlzLm1vZHVsZXNbcm93XS5sZW5ndGg7Y29sKyspe3ZhciB4PWNvbCpjczt2YXIgZGFyaz10aGlzLm1vZHVsZXNbcm93XVtjb2xdO2lmKGRhcmspe3FyX21jLmJlZ2luRmlsbCgwLDEwMCk7cXJfbWMubW92ZVRvKHgseSk7cXJfbWMubGluZVRvKHgrY3MseSk7cXJfbWMubGluZVRvKHgrY3MseStjcyk7cXJfbWMubGluZVRvKHgseStjcyk7cXJfbWMuZW5kRmlsbCgpO319fVxuICAgIHJldHVybiBxcl9tYzt9LHNldHVwVGltaW5nUGF0dGVybjpmdW5jdGlvbigpe2Zvcih2YXIgcj04O3I8dGhpcy5tb2R1bGVDb3VudC04O3IrKyl7aWYodGhpcy5tb2R1bGVzW3JdWzZdIT1udWxsKXtjb250aW51ZTt9XG4gICAgdGhpcy5tb2R1bGVzW3JdWzZdPShyJTI9PTApO31cbiAgICBmb3IodmFyIGM9ODtjPHRoaXMubW9kdWxlQ291bnQtODtjKyspe2lmKHRoaXMubW9kdWxlc1s2XVtjXSE9bnVsbCl7Y29udGludWU7fVxuICAgIHRoaXMubW9kdWxlc1s2XVtjXT0oYyUyPT0wKTt9fSxzZXR1cFBvc2l0aW9uQWRqdXN0UGF0dGVybjpmdW5jdGlvbigpe3ZhciBwb3M9UVJVdGlsLmdldFBhdHRlcm5Qb3NpdGlvbih0aGlzLnR5cGVOdW1iZXIpO2Zvcih2YXIgaT0wO2k8cG9zLmxlbmd0aDtpKyspe2Zvcih2YXIgaj0wO2o8cG9zLmxlbmd0aDtqKyspe3ZhciByb3c9cG9zW2ldO3ZhciBjb2w9cG9zW2pdO2lmKHRoaXMubW9kdWxlc1tyb3ddW2NvbF0hPW51bGwpe2NvbnRpbnVlO31cbiAgICBmb3IodmFyIHI9LTI7cjw9MjtyKyspe2Zvcih2YXIgYz0tMjtjPD0yO2MrKyl7aWYocj09LTJ8fHI9PTJ8fGM9PS0yfHxjPT0yfHwocj09MCYmYz09MCkpe3RoaXMubW9kdWxlc1tyb3crcl1bY29sK2NdPXRydWU7fWVsc2V7dGhpcy5tb2R1bGVzW3JvdytyXVtjb2wrY109ZmFsc2U7fX19fX19LHNldHVwVHlwZU51bWJlcjpmdW5jdGlvbih0ZXN0KXt2YXIgYml0cz1RUlV0aWwuZ2V0QkNIVHlwZU51bWJlcih0aGlzLnR5cGVOdW1iZXIpO2Zvcih2YXIgaT0wO2k8MTg7aSsrKXt2YXIgbW9kPSghdGVzdCYmKChiaXRzPj5pKSYxKT09MSk7dGhpcy5tb2R1bGVzW01hdGguZmxvb3IoaS8zKV1baSUzK3RoaXMubW9kdWxlQ291bnQtOC0zXT1tb2Q7fVxuICAgIGZvcih2YXIgaT0wO2k8MTg7aSsrKXt2YXIgbW9kPSghdGVzdCYmKChiaXRzPj5pKSYxKT09MSk7dGhpcy5tb2R1bGVzW2klMyt0aGlzLm1vZHVsZUNvdW50LTgtM11bTWF0aC5mbG9vcihpLzMpXT1tb2Q7fX0sc2V0dXBUeXBlSW5mbzpmdW5jdGlvbih0ZXN0LG1hc2tQYXR0ZXJuKXt2YXIgZGF0YT0odGhpcy5lcnJvckNvcnJlY3RMZXZlbDw8Myl8bWFza1BhdHRlcm47dmFyIGJpdHM9UVJVdGlsLmdldEJDSFR5cGVJbmZvKGRhdGEpO2Zvcih2YXIgaT0wO2k8MTU7aSsrKXt2YXIgbW9kPSghdGVzdCYmKChiaXRzPj5pKSYxKT09MSk7aWYoaTw2KXt0aGlzLm1vZHVsZXNbaV1bOF09bW9kO31lbHNlIGlmKGk8OCl7dGhpcy5tb2R1bGVzW2krMV1bOF09bW9kO31lbHNle3RoaXMubW9kdWxlc1t0aGlzLm1vZHVsZUNvdW50LTE1K2ldWzhdPW1vZDt9fVxuICAgIGZvcih2YXIgaT0wO2k8MTU7aSsrKXt2YXIgbW9kPSghdGVzdCYmKChiaXRzPj5pKSYxKT09MSk7aWYoaTw4KXt0aGlzLm1vZHVsZXNbOF1bdGhpcy5tb2R1bGVDb3VudC1pLTFdPW1vZDt9ZWxzZSBpZihpPDkpe3RoaXMubW9kdWxlc1s4XVsxNS1pLTErMV09bW9kO31lbHNle3RoaXMubW9kdWxlc1s4XVsxNS1pLTFdPW1vZDt9fVxuICAgIHRoaXMubW9kdWxlc1t0aGlzLm1vZHVsZUNvdW50LThdWzhdPSghdGVzdCk7fSxtYXBEYXRhOmZ1bmN0aW9uKGRhdGEsbWFza1BhdHRlcm4pe3ZhciBpbmM9LTE7dmFyIHJvdz10aGlzLm1vZHVsZUNvdW50LTE7dmFyIGJpdEluZGV4PTc7dmFyIGJ5dGVJbmRleD0wO2Zvcih2YXIgY29sPXRoaXMubW9kdWxlQ291bnQtMTtjb2w+MDtjb2wtPTIpe2lmKGNvbD09Niljb2wtLTt3aGlsZSh0cnVlKXtmb3IodmFyIGM9MDtjPDI7YysrKXtpZih0aGlzLm1vZHVsZXNbcm93XVtjb2wtY109PW51bGwpe3ZhciBkYXJrPWZhbHNlO2lmKGJ5dGVJbmRleDxkYXRhLmxlbmd0aCl7ZGFyaz0oKChkYXRhW2J5dGVJbmRleF0+Pj5iaXRJbmRleCkmMSk9PTEpO31cbiAgICB2YXIgbWFzaz1RUlV0aWwuZ2V0TWFzayhtYXNrUGF0dGVybixyb3csY29sLWMpO2lmKG1hc2spe2Rhcms9IWRhcms7fVxuICAgIHRoaXMubW9kdWxlc1tyb3ddW2NvbC1jXT1kYXJrO2JpdEluZGV4LS07aWYoYml0SW5kZXg9PS0xKXtieXRlSW5kZXgrKztiaXRJbmRleD03O319fVxuICAgIHJvdys9aW5jO2lmKHJvdzwwfHx0aGlzLm1vZHVsZUNvdW50PD1yb3cpe3Jvdy09aW5jO2luYz0taW5jO2JyZWFrO319fX19O1FSQ29kZU1vZGVsLlBBRDA9MHhFQztRUkNvZGVNb2RlbC5QQUQxPTB4MTE7UVJDb2RlTW9kZWwuY3JlYXRlRGF0YT1mdW5jdGlvbih0eXBlTnVtYmVyLGVycm9yQ29ycmVjdExldmVsLGRhdGFMaXN0KXt2YXIgcnNCbG9ja3M9UVJSU0Jsb2NrLmdldFJTQmxvY2tzKHR5cGVOdW1iZXIsZXJyb3JDb3JyZWN0TGV2ZWwpO3ZhciBidWZmZXI9bmV3IFFSQml0QnVmZmVyKCk7Zm9yKHZhciBpPTA7aTxkYXRhTGlzdC5sZW5ndGg7aSsrKXt2YXIgZGF0YT1kYXRhTGlzdFtpXTtidWZmZXIucHV0KGRhdGEubW9kZSw0KTtidWZmZXIucHV0KGRhdGEuZ2V0TGVuZ3RoKCksUVJVdGlsLmdldExlbmd0aEluQml0cyhkYXRhLm1vZGUsdHlwZU51bWJlcikpO2RhdGEud3JpdGUoYnVmZmVyKTt9XG4gICAgdmFyIHRvdGFsRGF0YUNvdW50PTA7Zm9yKHZhciBpPTA7aTxyc0Jsb2Nrcy5sZW5ndGg7aSsrKXt0b3RhbERhdGFDb3VudCs9cnNCbG9ja3NbaV0uZGF0YUNvdW50O31cbiAgICBpZihidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCk+dG90YWxEYXRhQ291bnQqOCl7dGhyb3cgbmV3IEVycm9yKFwiY29kZSBsZW5ndGggb3ZlcmZsb3cuIChcIlxuICAgICtidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKClcbiAgICArXCI+XCJcbiAgICArdG90YWxEYXRhQ291bnQqOFxuICAgICtcIilcIik7fVxuICAgIGlmKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSs0PD10b3RhbERhdGFDb3VudCo4KXtidWZmZXIucHV0KDAsNCk7fVxuICAgIHdoaWxlKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSU4IT0wKXtidWZmZXIucHV0Qml0KGZhbHNlKTt9XG4gICAgd2hpbGUodHJ1ZSl7aWYoYnVmZmVyLmdldExlbmd0aEluQml0cygpPj10b3RhbERhdGFDb3VudCo4KXticmVhazt9XG4gICAgYnVmZmVyLnB1dChRUkNvZGVNb2RlbC5QQUQwLDgpO2lmKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKT49dG90YWxEYXRhQ291bnQqOCl7YnJlYWs7fVxuICAgIGJ1ZmZlci5wdXQoUVJDb2RlTW9kZWwuUEFEMSw4KTt9XG4gICAgcmV0dXJuIFFSQ29kZU1vZGVsLmNyZWF0ZUJ5dGVzKGJ1ZmZlcixyc0Jsb2Nrcyk7fTtRUkNvZGVNb2RlbC5jcmVhdGVCeXRlcz1mdW5jdGlvbihidWZmZXIscnNCbG9ja3Mpe3ZhciBvZmZzZXQ9MDt2YXIgbWF4RGNDb3VudD0wO3ZhciBtYXhFY0NvdW50PTA7dmFyIGRjZGF0YT1uZXcgQXJyYXkocnNCbG9ja3MubGVuZ3RoKTt2YXIgZWNkYXRhPW5ldyBBcnJheShyc0Jsb2Nrcy5sZW5ndGgpO2Zvcih2YXIgcj0wO3I8cnNCbG9ja3MubGVuZ3RoO3IrKyl7dmFyIGRjQ291bnQ9cnNCbG9ja3Nbcl0uZGF0YUNvdW50O3ZhciBlY0NvdW50PXJzQmxvY2tzW3JdLnRvdGFsQ291bnQtZGNDb3VudDttYXhEY0NvdW50PU1hdGgubWF4KG1heERjQ291bnQsZGNDb3VudCk7bWF4RWNDb3VudD1NYXRoLm1heChtYXhFY0NvdW50LGVjQ291bnQpO2RjZGF0YVtyXT1uZXcgQXJyYXkoZGNDb3VudCk7Zm9yKHZhciBpPTA7aTxkY2RhdGFbcl0ubGVuZ3RoO2krKyl7ZGNkYXRhW3JdW2ldPTB4ZmYmYnVmZmVyLmJ1ZmZlcltpK29mZnNldF07fVxuICAgIG9mZnNldCs9ZGNDb3VudDt2YXIgcnNQb2x5PVFSVXRpbC5nZXRFcnJvckNvcnJlY3RQb2x5bm9taWFsKGVjQ291bnQpO3ZhciByYXdQb2x5PW5ldyBRUlBvbHlub21pYWwoZGNkYXRhW3JdLHJzUG9seS5nZXRMZW5ndGgoKS0xKTt2YXIgbW9kUG9seT1yYXdQb2x5Lm1vZChyc1BvbHkpO2VjZGF0YVtyXT1uZXcgQXJyYXkocnNQb2x5LmdldExlbmd0aCgpLTEpO2Zvcih2YXIgaT0wO2k8ZWNkYXRhW3JdLmxlbmd0aDtpKyspe3ZhciBtb2RJbmRleD1pK21vZFBvbHkuZ2V0TGVuZ3RoKCktZWNkYXRhW3JdLmxlbmd0aDtlY2RhdGFbcl1baV09KG1vZEluZGV4Pj0wKT9tb2RQb2x5LmdldChtb2RJbmRleCk6MDt9fVxuICAgIHZhciB0b3RhbENvZGVDb3VudD0wO2Zvcih2YXIgaT0wO2k8cnNCbG9ja3MubGVuZ3RoO2krKyl7dG90YWxDb2RlQ291bnQrPXJzQmxvY2tzW2ldLnRvdGFsQ291bnQ7fVxuICAgIHZhciBkYXRhPW5ldyBBcnJheSh0b3RhbENvZGVDb3VudCk7dmFyIGluZGV4PTA7Zm9yKHZhciBpPTA7aTxtYXhEY0NvdW50O2krKyl7Zm9yKHZhciByPTA7cjxyc0Jsb2Nrcy5sZW5ndGg7cisrKXtpZihpPGRjZGF0YVtyXS5sZW5ndGgpe2RhdGFbaW5kZXgrK109ZGNkYXRhW3JdW2ldO319fVxuICAgIGZvcih2YXIgaT0wO2k8bWF4RWNDb3VudDtpKyspe2Zvcih2YXIgcj0wO3I8cnNCbG9ja3MubGVuZ3RoO3IrKyl7aWYoaTxlY2RhdGFbcl0ubGVuZ3RoKXtkYXRhW2luZGV4KytdPWVjZGF0YVtyXVtpXTt9fX1cbiAgICByZXR1cm4gZGF0YTt9O3ZhciBRUk1vZGU9e01PREVfTlVNQkVSOjE8PDAsTU9ERV9BTFBIQV9OVU06MTw8MSxNT0RFXzhCSVRfQllURToxPDwyLE1PREVfS0FOSkk6MTw8M307dmFyIFFSRXJyb3JDb3JyZWN0TGV2ZWw9e0w6MSxNOjAsUTozLEg6Mn07dmFyIFFSTWFza1BhdHRlcm49e1BBVFRFUk4wMDA6MCxQQVRURVJOMDAxOjEsUEFUVEVSTjAxMDoyLFBBVFRFUk4wMTE6MyxQQVRURVJOMTAwOjQsUEFUVEVSTjEwMTo1LFBBVFRFUk4xMTA6NixQQVRURVJOMTExOjd9O3ZhciBRUlV0aWw9e1BBVFRFUk5fUE9TSVRJT05fVEFCTEU6W1tdLFs2LDE4XSxbNiwyMl0sWzYsMjZdLFs2LDMwXSxbNiwzNF0sWzYsMjIsMzhdLFs2LDI0LDQyXSxbNiwyNiw0Nl0sWzYsMjgsNTBdLFs2LDMwLDU0XSxbNiwzMiw1OF0sWzYsMzQsNjJdLFs2LDI2LDQ2LDY2XSxbNiwyNiw0OCw3MF0sWzYsMjYsNTAsNzRdLFs2LDMwLDU0LDc4XSxbNiwzMCw1Niw4Ml0sWzYsMzAsNTgsODZdLFs2LDM0LDYyLDkwXSxbNiwyOCw1MCw3Miw5NF0sWzYsMjYsNTAsNzQsOThdLFs2LDMwLDU0LDc4LDEwMl0sWzYsMjgsNTQsODAsMTA2XSxbNiwzMiw1OCw4NCwxMTBdLFs2LDMwLDU4LDg2LDExNF0sWzYsMzQsNjIsOTAsMTE4XSxbNiwyNiw1MCw3NCw5OCwxMjJdLFs2LDMwLDU0LDc4LDEwMiwxMjZdLFs2LDI2LDUyLDc4LDEwNCwxMzBdLFs2LDMwLDU2LDgyLDEwOCwxMzRdLFs2LDM0LDYwLDg2LDExMiwxMzhdLFs2LDMwLDU4LDg2LDExNCwxNDJdLFs2LDM0LDYyLDkwLDExOCwxNDZdLFs2LDMwLDU0LDc4LDEwMiwxMjYsMTUwXSxbNiwyNCw1MCw3NiwxMDIsMTI4LDE1NF0sWzYsMjgsNTQsODAsMTA2LDEzMiwxNThdLFs2LDMyLDU4LDg0LDExMCwxMzYsMTYyXSxbNiwyNiw1NCw4MiwxMTAsMTM4LDE2Nl0sWzYsMzAsNTgsODYsMTE0LDE0MiwxNzBdXSxHMTU6KDE8PDEwKXwoMTw8OCl8KDE8PDUpfCgxPDw0KXwoMTw8Mil8KDE8PDEpfCgxPDwwKSxHMTg6KDE8PDEyKXwoMTw8MTEpfCgxPDwxMCl8KDE8PDkpfCgxPDw4KXwoMTw8NSl8KDE8PDIpfCgxPDwwKSxHMTVfTUFTSzooMTw8MTQpfCgxPDwxMil8KDE8PDEwKXwoMTw8NCl8KDE8PDEpLGdldEJDSFR5cGVJbmZvOmZ1bmN0aW9uKGRhdGEpe3ZhciBkPWRhdGE8PDEwO3doaWxlKFFSVXRpbC5nZXRCQ0hEaWdpdChkKS1RUlV0aWwuZ2V0QkNIRGlnaXQoUVJVdGlsLkcxNSk+PTApe2RePShRUlV0aWwuRzE1PDwoUVJVdGlsLmdldEJDSERpZ2l0KGQpLVFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KSkpO31cbiAgICByZXR1cm4oKGRhdGE8PDEwKXxkKV5RUlV0aWwuRzE1X01BU0s7fSxnZXRCQ0hUeXBlTnVtYmVyOmZ1bmN0aW9uKGRhdGEpe3ZhciBkPWRhdGE8PDEyO3doaWxlKFFSVXRpbC5nZXRCQ0hEaWdpdChkKS1RUlV0aWwuZ2V0QkNIRGlnaXQoUVJVdGlsLkcxOCk+PTApe2RePShRUlV0aWwuRzE4PDwoUVJVdGlsLmdldEJDSERpZ2l0KGQpLVFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KSkpO31cbiAgICByZXR1cm4oZGF0YTw8MTIpfGQ7fSxnZXRCQ0hEaWdpdDpmdW5jdGlvbihkYXRhKXt2YXIgZGlnaXQ9MDt3aGlsZShkYXRhIT0wKXtkaWdpdCsrO2RhdGE+Pj49MTt9XG4gICAgcmV0dXJuIGRpZ2l0O30sZ2V0UGF0dGVyblBvc2l0aW9uOmZ1bmN0aW9uKHR5cGVOdW1iZXIpe3JldHVybiBRUlV0aWwuUEFUVEVSTl9QT1NJVElPTl9UQUJMRVt0eXBlTnVtYmVyLTFdO30sZ2V0TWFzazpmdW5jdGlvbihtYXNrUGF0dGVybixpLGope3N3aXRjaChtYXNrUGF0dGVybil7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMDA6cmV0dXJuKGkraiklMj09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAwMTpyZXR1cm4gaSUyPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDEwOnJldHVybiBqJTM9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMTE6cmV0dXJuKGkraiklMz09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjEwMDpyZXR1cm4oTWF0aC5mbG9vcihpLzIpK01hdGguZmxvb3Ioai8zKSklMj09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjEwMTpyZXR1cm4oaSpqKSUyKyhpKmopJTM9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMTA6cmV0dXJuKChpKmopJTIrKGkqaiklMyklMj09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjExMTpyZXR1cm4oKGkqaiklMysoaStqKSUyKSUyPT0wO2RlZmF1bHQ6dGhyb3cgbmV3IEVycm9yKFwiYmFkIG1hc2tQYXR0ZXJuOlwiK21hc2tQYXR0ZXJuKTt9fSxnZXRFcnJvckNvcnJlY3RQb2x5bm9taWFsOmZ1bmN0aW9uKGVycm9yQ29ycmVjdExlbmd0aCl7dmFyIGE9bmV3IFFSUG9seW5vbWlhbChbMV0sMCk7Zm9yKHZhciBpPTA7aTxlcnJvckNvcnJlY3RMZW5ndGg7aSsrKXthPWEubXVsdGlwbHkobmV3IFFSUG9seW5vbWlhbChbMSxRUk1hdGguZ2V4cChpKV0sMCkpO31cbiAgICByZXR1cm4gYTt9LGdldExlbmd0aEluQml0czpmdW5jdGlvbihtb2RlLHR5cGUpe2lmKDE8PXR5cGUmJnR5cGU8MTApe3N3aXRjaChtb2RlKXtjYXNlIFFSTW9kZS5NT0RFX05VTUJFUjpyZXR1cm4gMTA7Y2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU06cmV0dXJuIDk7Y2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEU6cmV0dXJuIDg7Y2FzZSBRUk1vZGUuTU9ERV9LQU5KSTpyZXR1cm4gODtkZWZhdWx0OnRocm93IG5ldyBFcnJvcihcIm1vZGU6XCIrbW9kZSk7fX1lbHNlIGlmKHR5cGU8Mjcpe3N3aXRjaChtb2RlKXtjYXNlIFFSTW9kZS5NT0RFX05VTUJFUjpyZXR1cm4gMTI7Y2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU06cmV0dXJuIDExO2Nhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFOnJldHVybiAxNjtjYXNlIFFSTW9kZS5NT0RFX0tBTkpJOnJldHVybiAxMDtkZWZhdWx0OnRocm93IG5ldyBFcnJvcihcIm1vZGU6XCIrbW9kZSk7fX1lbHNlIGlmKHR5cGU8NDEpe3N3aXRjaChtb2RlKXtjYXNlIFFSTW9kZS5NT0RFX05VTUJFUjpyZXR1cm4gMTQ7Y2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU06cmV0dXJuIDEzO2Nhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFOnJldHVybiAxNjtjYXNlIFFSTW9kZS5NT0RFX0tBTkpJOnJldHVybiAxMjtkZWZhdWx0OnRocm93IG5ldyBFcnJvcihcIm1vZGU6XCIrbW9kZSk7fX1lbHNle3Rocm93IG5ldyBFcnJvcihcInR5cGU6XCIrdHlwZSk7fX0sZ2V0TG9zdFBvaW50OmZ1bmN0aW9uKHFyQ29kZSl7dmFyIG1vZHVsZUNvdW50PXFyQ29kZS5nZXRNb2R1bGVDb3VudCgpO3ZhciBsb3N0UG9pbnQ9MDtmb3IodmFyIHJvdz0wO3Jvdzxtb2R1bGVDb3VudDtyb3crKyl7Zm9yKHZhciBjb2w9MDtjb2w8bW9kdWxlQ291bnQ7Y29sKyspe3ZhciBzYW1lQ291bnQ9MDt2YXIgZGFyaz1xckNvZGUuaXNEYXJrKHJvdyxjb2wpO2Zvcih2YXIgcj0tMTtyPD0xO3IrKyl7aWYocm93K3I8MHx8bW9kdWxlQ291bnQ8PXJvdytyKXtjb250aW51ZTt9XG4gICAgZm9yKHZhciBjPS0xO2M8PTE7YysrKXtpZihjb2wrYzwwfHxtb2R1bGVDb3VudDw9Y29sK2Mpe2NvbnRpbnVlO31cbiAgICBpZihyPT0wJiZjPT0wKXtjb250aW51ZTt9XG4gICAgaWYoZGFyaz09cXJDb2RlLmlzRGFyayhyb3crcixjb2wrYykpe3NhbWVDb3VudCsrO319fVxuICAgIGlmKHNhbWVDb3VudD41KXtsb3N0UG9pbnQrPSgzK3NhbWVDb3VudC01KTt9fX1cbiAgICBmb3IodmFyIHJvdz0wO3Jvdzxtb2R1bGVDb3VudC0xO3JvdysrKXtmb3IodmFyIGNvbD0wO2NvbDxtb2R1bGVDb3VudC0xO2NvbCsrKXt2YXIgY291bnQ9MDtpZihxckNvZGUuaXNEYXJrKHJvdyxjb2wpKWNvdW50Kys7aWYocXJDb2RlLmlzRGFyayhyb3crMSxjb2wpKWNvdW50Kys7aWYocXJDb2RlLmlzRGFyayhyb3csY29sKzEpKWNvdW50Kys7aWYocXJDb2RlLmlzRGFyayhyb3crMSxjb2wrMSkpY291bnQrKztpZihjb3VudD09MHx8Y291bnQ9PTQpe2xvc3RQb2ludCs9Mzt9fX1cbiAgICBmb3IodmFyIHJvdz0wO3Jvdzxtb2R1bGVDb3VudDtyb3crKyl7Zm9yKHZhciBjb2w9MDtjb2w8bW9kdWxlQ291bnQtNjtjb2wrKyl7aWYocXJDb2RlLmlzRGFyayhyb3csY29sKSYmIXFyQ29kZS5pc0Rhcmsocm93LGNvbCsxKSYmcXJDb2RlLmlzRGFyayhyb3csY29sKzIpJiZxckNvZGUuaXNEYXJrKHJvdyxjb2wrMykmJnFyQ29kZS5pc0Rhcmsocm93LGNvbCs0KSYmIXFyQ29kZS5pc0Rhcmsocm93LGNvbCs1KSYmcXJDb2RlLmlzRGFyayhyb3csY29sKzYpKXtsb3N0UG9pbnQrPTQwO319fVxuICAgIGZvcih2YXIgY29sPTA7Y29sPG1vZHVsZUNvdW50O2NvbCsrKXtmb3IodmFyIHJvdz0wO3Jvdzxtb2R1bGVDb3VudC02O3JvdysrKXtpZihxckNvZGUuaXNEYXJrKHJvdyxjb2wpJiYhcXJDb2RlLmlzRGFyayhyb3crMSxjb2wpJiZxckNvZGUuaXNEYXJrKHJvdysyLGNvbCkmJnFyQ29kZS5pc0Rhcmsocm93KzMsY29sKSYmcXJDb2RlLmlzRGFyayhyb3crNCxjb2wpJiYhcXJDb2RlLmlzRGFyayhyb3crNSxjb2wpJiZxckNvZGUuaXNEYXJrKHJvdys2LGNvbCkpe2xvc3RQb2ludCs9NDA7fX19XG4gICAgdmFyIGRhcmtDb3VudD0wO2Zvcih2YXIgY29sPTA7Y29sPG1vZHVsZUNvdW50O2NvbCsrKXtmb3IodmFyIHJvdz0wO3Jvdzxtb2R1bGVDb3VudDtyb3crKyl7aWYocXJDb2RlLmlzRGFyayhyb3csY29sKSl7ZGFya0NvdW50Kys7fX19XG4gICAgdmFyIHJhdGlvPU1hdGguYWJzKDEwMCpkYXJrQ291bnQvbW9kdWxlQ291bnQvbW9kdWxlQ291bnQtNTApLzU7bG9zdFBvaW50Kz1yYXRpbyoxMDtyZXR1cm4gbG9zdFBvaW50O319O3ZhciBRUk1hdGg9e2dsb2c6ZnVuY3Rpb24obil7aWYobjwxKXt0aHJvdyBuZXcgRXJyb3IoXCJnbG9nKFwiK24rXCIpXCIpO31cbiAgICByZXR1cm4gUVJNYXRoLkxPR19UQUJMRVtuXTt9LGdleHA6ZnVuY3Rpb24obil7d2hpbGUobjwwKXtuKz0yNTU7fVxuICAgIHdoaWxlKG4+PTI1Nil7bi09MjU1O31cbiAgICByZXR1cm4gUVJNYXRoLkVYUF9UQUJMRVtuXTt9LEVYUF9UQUJMRTpuZXcgQXJyYXkoMjU2KSxMT0dfVEFCTEU6bmV3IEFycmF5KDI1Nil9O2Zvcih2YXIgaT0wO2k8ODtpKyspe1FSTWF0aC5FWFBfVEFCTEVbaV09MTw8aTt9XG4gICAgZm9yKHZhciBpPTg7aTwyNTY7aSsrKXtRUk1hdGguRVhQX1RBQkxFW2ldPVFSTWF0aC5FWFBfVEFCTEVbaS00XV5RUk1hdGguRVhQX1RBQkxFW2ktNV1eUVJNYXRoLkVYUF9UQUJMRVtpLTZdXlFSTWF0aC5FWFBfVEFCTEVbaS04XTt9XG4gICAgZm9yKHZhciBpPTA7aTwyNTU7aSsrKXtRUk1hdGguTE9HX1RBQkxFW1FSTWF0aC5FWFBfVEFCTEVbaV1dPWk7fVxuICAgIGZ1bmN0aW9uIFFSUG9seW5vbWlhbChudW0sc2hpZnQpe2lmKG51bS5sZW5ndGg9PXVuZGVmaW5lZCl7dGhyb3cgbmV3IEVycm9yKG51bS5sZW5ndGgrXCIvXCIrc2hpZnQpO31cbiAgICB2YXIgb2Zmc2V0PTA7d2hpbGUob2Zmc2V0PG51bS5sZW5ndGgmJm51bVtvZmZzZXRdPT0wKXtvZmZzZXQrKzt9XG4gICAgdGhpcy5udW09bmV3IEFycmF5KG51bS5sZW5ndGgtb2Zmc2V0K3NoaWZ0KTtmb3IodmFyIGk9MDtpPG51bS5sZW5ndGgtb2Zmc2V0O2krKyl7dGhpcy5udW1baV09bnVtW2krb2Zmc2V0XTt9fVxuICAgIFFSUG9seW5vbWlhbC5wcm90b3R5cGU9e2dldDpmdW5jdGlvbihpbmRleCl7cmV0dXJuIHRoaXMubnVtW2luZGV4XTt9LGdldExlbmd0aDpmdW5jdGlvbigpe3JldHVybiB0aGlzLm51bS5sZW5ndGg7fSxtdWx0aXBseTpmdW5jdGlvbihlKXt2YXIgbnVtPW5ldyBBcnJheSh0aGlzLmdldExlbmd0aCgpK2UuZ2V0TGVuZ3RoKCktMSk7Zm9yKHZhciBpPTA7aTx0aGlzLmdldExlbmd0aCgpO2krKyl7Zm9yKHZhciBqPTA7ajxlLmdldExlbmd0aCgpO2orKyl7bnVtW2kral1ePVFSTWF0aC5nZXhwKFFSTWF0aC5nbG9nKHRoaXMuZ2V0KGkpKStRUk1hdGguZ2xvZyhlLmdldChqKSkpO319XG4gICAgcmV0dXJuIG5ldyBRUlBvbHlub21pYWwobnVtLDApO30sbW9kOmZ1bmN0aW9uKGUpe2lmKHRoaXMuZ2V0TGVuZ3RoKCktZS5nZXRMZW5ndGgoKTwwKXtyZXR1cm4gdGhpczt9XG4gICAgdmFyIHJhdGlvPVFSTWF0aC5nbG9nKHRoaXMuZ2V0KDApKS1RUk1hdGguZ2xvZyhlLmdldCgwKSk7dmFyIG51bT1uZXcgQXJyYXkodGhpcy5nZXRMZW5ndGgoKSk7Zm9yKHZhciBpPTA7aTx0aGlzLmdldExlbmd0aCgpO2krKyl7bnVtW2ldPXRoaXMuZ2V0KGkpO31cbiAgICBmb3IodmFyIGk9MDtpPGUuZ2V0TGVuZ3RoKCk7aSsrKXtudW1baV1ePVFSTWF0aC5nZXhwKFFSTWF0aC5nbG9nKGUuZ2V0KGkpKStyYXRpbyk7fVxuICAgIHJldHVybiBuZXcgUVJQb2x5bm9taWFsKG51bSwwKS5tb2QoZSk7fX07ZnVuY3Rpb24gUVJSU0Jsb2NrKHRvdGFsQ291bnQsZGF0YUNvdW50KXt0aGlzLnRvdGFsQ291bnQ9dG90YWxDb3VudDt0aGlzLmRhdGFDb3VudD1kYXRhQ291bnQ7fVxuICAgIFFSUlNCbG9jay5SU19CTE9DS19UQUJMRT1bWzEsMjYsMTldLFsxLDI2LDE2XSxbMSwyNiwxM10sWzEsMjYsOV0sWzEsNDQsMzRdLFsxLDQ0LDI4XSxbMSw0NCwyMl0sWzEsNDQsMTZdLFsxLDcwLDU1XSxbMSw3MCw0NF0sWzIsMzUsMTddLFsyLDM1LDEzXSxbMSwxMDAsODBdLFsyLDUwLDMyXSxbMiw1MCwyNF0sWzQsMjUsOV0sWzEsMTM0LDEwOF0sWzIsNjcsNDNdLFsyLDMzLDE1LDIsMzQsMTZdLFsyLDMzLDExLDIsMzQsMTJdLFsyLDg2LDY4XSxbNCw0MywyN10sWzQsNDMsMTldLFs0LDQzLDE1XSxbMiw5OCw3OF0sWzQsNDksMzFdLFsyLDMyLDE0LDQsMzMsMTVdLFs0LDM5LDEzLDEsNDAsMTRdLFsyLDEyMSw5N10sWzIsNjAsMzgsMiw2MSwzOV0sWzQsNDAsMTgsMiw0MSwxOV0sWzQsNDAsMTQsMiw0MSwxNV0sWzIsMTQ2LDExNl0sWzMsNTgsMzYsMiw1OSwzN10sWzQsMzYsMTYsNCwzNywxN10sWzQsMzYsMTIsNCwzNywxM10sWzIsODYsNjgsMiw4Nyw2OV0sWzQsNjksNDMsMSw3MCw0NF0sWzYsNDMsMTksMiw0NCwyMF0sWzYsNDMsMTUsMiw0NCwxNl0sWzQsMTAxLDgxXSxbMSw4MCw1MCw0LDgxLDUxXSxbNCw1MCwyMiw0LDUxLDIzXSxbMywzNiwxMiw4LDM3LDEzXSxbMiwxMTYsOTIsMiwxMTcsOTNdLFs2LDU4LDM2LDIsNTksMzddLFs0LDQ2LDIwLDYsNDcsMjFdLFs3LDQyLDE0LDQsNDMsMTVdLFs0LDEzMywxMDddLFs4LDU5LDM3LDEsNjAsMzhdLFs4LDQ0LDIwLDQsNDUsMjFdLFsxMiwzMywxMSw0LDM0LDEyXSxbMywxNDUsMTE1LDEsMTQ2LDExNl0sWzQsNjQsNDAsNSw2NSw0MV0sWzExLDM2LDE2LDUsMzcsMTddLFsxMSwzNiwxMiw1LDM3LDEzXSxbNSwxMDksODcsMSwxMTAsODhdLFs1LDY1LDQxLDUsNjYsNDJdLFs1LDU0LDI0LDcsNTUsMjVdLFsxMSwzNiwxMl0sWzUsMTIyLDk4LDEsMTIzLDk5XSxbNyw3Myw0NSwzLDc0LDQ2XSxbMTUsNDMsMTksMiw0NCwyMF0sWzMsNDUsMTUsMTMsNDYsMTZdLFsxLDEzNSwxMDcsNSwxMzYsMTA4XSxbMTAsNzQsNDYsMSw3NSw0N10sWzEsNTAsMjIsMTUsNTEsMjNdLFsyLDQyLDE0LDE3LDQzLDE1XSxbNSwxNTAsMTIwLDEsMTUxLDEyMV0sWzksNjksNDMsNCw3MCw0NF0sWzE3LDUwLDIyLDEsNTEsMjNdLFsyLDQyLDE0LDE5LDQzLDE1XSxbMywxNDEsMTEzLDQsMTQyLDExNF0sWzMsNzAsNDQsMTEsNzEsNDVdLFsxNyw0NywyMSw0LDQ4LDIyXSxbOSwzOSwxMywxNiw0MCwxNF0sWzMsMTM1LDEwNyw1LDEzNiwxMDhdLFszLDY3LDQxLDEzLDY4LDQyXSxbMTUsNTQsMjQsNSw1NSwyNV0sWzE1LDQzLDE1LDEwLDQ0LDE2XSxbNCwxNDQsMTE2LDQsMTQ1LDExN10sWzE3LDY4LDQyXSxbMTcsNTAsMjIsNiw1MSwyM10sWzE5LDQ2LDE2LDYsNDcsMTddLFsyLDEzOSwxMTEsNywxNDAsMTEyXSxbMTcsNzQsNDZdLFs3LDU0LDI0LDE2LDU1LDI1XSxbMzQsMzcsMTNdLFs0LDE1MSwxMjEsNSwxNTIsMTIyXSxbNCw3NSw0NywxNCw3Niw0OF0sWzExLDU0LDI0LDE0LDU1LDI1XSxbMTYsNDUsMTUsMTQsNDYsMTZdLFs2LDE0NywxMTcsNCwxNDgsMTE4XSxbNiw3Myw0NSwxNCw3NCw0Nl0sWzExLDU0LDI0LDE2LDU1LDI1XSxbMzAsNDYsMTYsMiw0NywxN10sWzgsMTMyLDEwNiw0LDEzMywxMDddLFs4LDc1LDQ3LDEzLDc2LDQ4XSxbNyw1NCwyNCwyMiw1NSwyNV0sWzIyLDQ1LDE1LDEzLDQ2LDE2XSxbMTAsMTQyLDExNCwyLDE0MywxMTVdLFsxOSw3NCw0Niw0LDc1LDQ3XSxbMjgsNTAsMjIsNiw1MSwyM10sWzMzLDQ2LDE2LDQsNDcsMTddLFs4LDE1MiwxMjIsNCwxNTMsMTIzXSxbMjIsNzMsNDUsMyw3NCw0Nl0sWzgsNTMsMjMsMjYsNTQsMjRdLFsxMiw0NSwxNSwyOCw0NiwxNl0sWzMsMTQ3LDExNywxMCwxNDgsMTE4XSxbMyw3Myw0NSwyMyw3NCw0Nl0sWzQsNTQsMjQsMzEsNTUsMjVdLFsxMSw0NSwxNSwzMSw0NiwxNl0sWzcsMTQ2LDExNiw3LDE0NywxMTddLFsyMSw3Myw0NSw3LDc0LDQ2XSxbMSw1MywyMywzNyw1NCwyNF0sWzE5LDQ1LDE1LDI2LDQ2LDE2XSxbNSwxNDUsMTE1LDEwLDE0NiwxMTZdLFsxOSw3NSw0NywxMCw3Niw0OF0sWzE1LDU0LDI0LDI1LDU1LDI1XSxbMjMsNDUsMTUsMjUsNDYsMTZdLFsxMywxNDUsMTE1LDMsMTQ2LDExNl0sWzIsNzQsNDYsMjksNzUsNDddLFs0Miw1NCwyNCwxLDU1LDI1XSxbMjMsNDUsMTUsMjgsNDYsMTZdLFsxNywxNDUsMTE1XSxbMTAsNzQsNDYsMjMsNzUsNDddLFsxMCw1NCwyNCwzNSw1NSwyNV0sWzE5LDQ1LDE1LDM1LDQ2LDE2XSxbMTcsMTQ1LDExNSwxLDE0NiwxMTZdLFsxNCw3NCw0NiwyMSw3NSw0N10sWzI5LDU0LDI0LDE5LDU1LDI1XSxbMTEsNDUsMTUsNDYsNDYsMTZdLFsxMywxNDUsMTE1LDYsMTQ2LDExNl0sWzE0LDc0LDQ2LDIzLDc1LDQ3XSxbNDQsNTQsMjQsNyw1NSwyNV0sWzU5LDQ2LDE2LDEsNDcsMTddLFsxMiwxNTEsMTIxLDcsMTUyLDEyMl0sWzEyLDc1LDQ3LDI2LDc2LDQ4XSxbMzksNTQsMjQsMTQsNTUsMjVdLFsyMiw0NSwxNSw0MSw0NiwxNl0sWzYsMTUxLDEyMSwxNCwxNTIsMTIyXSxbNiw3NSw0NywzNCw3Niw0OF0sWzQ2LDU0LDI0LDEwLDU1LDI1XSxbMiw0NSwxNSw2NCw0NiwxNl0sWzE3LDE1MiwxMjIsNCwxNTMsMTIzXSxbMjksNzQsNDYsMTQsNzUsNDddLFs0OSw1NCwyNCwxMCw1NSwyNV0sWzI0LDQ1LDE1LDQ2LDQ2LDE2XSxbNCwxNTIsMTIyLDE4LDE1MywxMjNdLFsxMyw3NCw0NiwzMiw3NSw0N10sWzQ4LDU0LDI0LDE0LDU1LDI1XSxbNDIsNDUsMTUsMzIsNDYsMTZdLFsyMCwxNDcsMTE3LDQsMTQ4LDExOF0sWzQwLDc1LDQ3LDcsNzYsNDhdLFs0Myw1NCwyNCwyMiw1NSwyNV0sWzEwLDQ1LDE1LDY3LDQ2LDE2XSxbMTksMTQ4LDExOCw2LDE0OSwxMTldLFsxOCw3NSw0NywzMSw3Niw0OF0sWzM0LDU0LDI0LDM0LDU1LDI1XSxbMjAsNDUsMTUsNjEsNDYsMTZdXTtRUlJTQmxvY2suZ2V0UlNCbG9ja3M9ZnVuY3Rpb24odHlwZU51bWJlcixlcnJvckNvcnJlY3RMZXZlbCl7dmFyIHJzQmxvY2s9UVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZSh0eXBlTnVtYmVyLGVycm9yQ29ycmVjdExldmVsKTtpZihyc0Jsb2NrPT11bmRlZmluZWQpe3Rocm93IG5ldyBFcnJvcihcImJhZCBycyBibG9jayBAIHR5cGVOdW1iZXI6XCIrdHlwZU51bWJlcitcIi9lcnJvckNvcnJlY3RMZXZlbDpcIitlcnJvckNvcnJlY3RMZXZlbCk7fVxuICAgIHZhciBsZW5ndGg9cnNCbG9jay5sZW5ndGgvMzt2YXIgbGlzdD1bXTtmb3IodmFyIGk9MDtpPGxlbmd0aDtpKyspe3ZhciBjb3VudD1yc0Jsb2NrW2kqMyswXTt2YXIgdG90YWxDb3VudD1yc0Jsb2NrW2kqMysxXTt2YXIgZGF0YUNvdW50PXJzQmxvY2tbaSozKzJdO2Zvcih2YXIgaj0wO2o8Y291bnQ7aisrKXtsaXN0LnB1c2gobmV3IFFSUlNCbG9jayh0b3RhbENvdW50LGRhdGFDb3VudCkpO319XG4gICAgcmV0dXJuIGxpc3Q7fTtRUlJTQmxvY2suZ2V0UnNCbG9ja1RhYmxlPWZ1bmN0aW9uKHR5cGVOdW1iZXIsZXJyb3JDb3JyZWN0TGV2ZWwpe3N3aXRjaChlcnJvckNvcnJlY3RMZXZlbCl7Y2FzZSBRUkVycm9yQ29ycmVjdExldmVsLkw6cmV0dXJuIFFSUlNCbG9jay5SU19CTE9DS19UQUJMRVsodHlwZU51bWJlci0xKSo0KzBdO2Nhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5NOnJldHVybiBRUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEVbKHR5cGVOdW1iZXItMSkqNCsxXTtjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuUTpyZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyLTEpKjQrMl07Y2FzZSBRUkVycm9yQ29ycmVjdExldmVsLkg6cmV0dXJuIFFSUlNCbG9jay5SU19CTE9DS19UQUJMRVsodHlwZU51bWJlci0xKSo0KzNdO2RlZmF1bHQ6cmV0dXJuIHVuZGVmaW5lZDt9fTtmdW5jdGlvbiBRUkJpdEJ1ZmZlcigpe3RoaXMuYnVmZmVyPVtdO3RoaXMubGVuZ3RoPTA7fVxuICAgIFFSQml0QnVmZmVyLnByb3RvdHlwZT17Z2V0OmZ1bmN0aW9uKGluZGV4KXt2YXIgYnVmSW5kZXg9TWF0aC5mbG9vcihpbmRleC84KTtyZXR1cm4oKHRoaXMuYnVmZmVyW2J1ZkluZGV4XT4+Pig3LWluZGV4JTgpKSYxKT09MTt9LHB1dDpmdW5jdGlvbihudW0sbGVuZ3RoKXtmb3IodmFyIGk9MDtpPGxlbmd0aDtpKyspe3RoaXMucHV0Qml0KCgobnVtPj4+KGxlbmd0aC1pLTEpKSYxKT09MSk7fX0sZ2V0TGVuZ3RoSW5CaXRzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubGVuZ3RoO30scHV0Qml0OmZ1bmN0aW9uKGJpdCl7dmFyIGJ1ZkluZGV4PU1hdGguZmxvb3IodGhpcy5sZW5ndGgvOCk7aWYodGhpcy5idWZmZXIubGVuZ3RoPD1idWZJbmRleCl7dGhpcy5idWZmZXIucHVzaCgwKTt9XG4gICAgaWYoYml0KXt0aGlzLmJ1ZmZlcltidWZJbmRleF18PSgweDgwPj4+KHRoaXMubGVuZ3RoJTgpKTt9XG4gICAgdGhpcy5sZW5ndGgrKzt9fTt2YXIgUVJDb2RlTGltaXRMZW5ndGg9W1sxNywxNCwxMSw3XSxbMzIsMjYsMjAsMTRdLFs1Myw0MiwzMiwyNF0sWzc4LDYyLDQ2LDM0XSxbMTA2LDg0LDYwLDQ0XSxbMTM0LDEwNiw3NCw1OF0sWzE1NCwxMjIsODYsNjRdLFsxOTIsMTUyLDEwOCw4NF0sWzIzMCwxODAsMTMwLDk4XSxbMjcxLDIxMywxNTEsMTE5XSxbMzIxLDI1MSwxNzcsMTM3XSxbMzY3LDI4NywyMDMsMTU1XSxbNDI1LDMzMSwyNDEsMTc3XSxbNDU4LDM2MiwyNTgsMTk0XSxbNTIwLDQxMiwyOTIsMjIwXSxbNTg2LDQ1MCwzMjIsMjUwXSxbNjQ0LDUwNCwzNjQsMjgwXSxbNzE4LDU2MCwzOTQsMzEwXSxbNzkyLDYyNCw0NDIsMzM4XSxbODU4LDY2Niw0ODIsMzgyXSxbOTI5LDcxMSw1MDksNDAzXSxbMTAwMyw3NzksNTY1LDQzOV0sWzEwOTEsODU3LDYxMSw0NjFdLFsxMTcxLDkxMSw2NjEsNTExXSxbMTI3Myw5OTcsNzE1LDUzNV0sWzEzNjcsMTA1OSw3NTEsNTkzXSxbMTQ2NSwxMTI1LDgwNSw2MjVdLFsxNTI4LDExOTAsODY4LDY1OF0sWzE2MjgsMTI2NCw5MDgsNjk4XSxbMTczMiwxMzcwLDk4Miw3NDJdLFsxODQwLDE0NTIsMTAzMCw3OTBdLFsxOTUyLDE1MzgsMTExMiw4NDJdLFsyMDY4LDE2MjgsMTE2OCw4OThdLFsyMTg4LDE3MjIsMTIyOCw5NThdLFsyMzAzLDE4MDksMTI4Myw5ODNdLFsyNDMxLDE5MTEsMTM1MSwxMDUxXSxbMjU2MywxOTg5LDE0MjMsMTA5M10sWzI2OTksMjA5OSwxNDk5LDExMzldLFsyODA5LDIyMTMsMTU3OSwxMjE5XSxbMjk1MywyMzMxLDE2NjMsMTI3M11dO1xuXG4gICAgZnVuY3Rpb24gX2lzU3VwcG9ydENhbnZhcygpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgIT0gXCJ1bmRlZmluZWRcIjtcbiAgICB9XG5cbiAgICAvLyBhbmRyb2lkIDIueCBkb2Vzbid0IHN1cHBvcnQgRGF0YS1VUkkgc3BlY1xuICAgIGZ1bmN0aW9uIF9nZXRBbmRyb2lkKCkge1xuICAgICAgICB2YXIgYW5kcm9pZCA9IGZhbHNlO1xuICAgICAgICB2YXIgc0FnZW50ID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcblxuICAgICAgICBpZiAoL2FuZHJvaWQvaS50ZXN0KHNBZ2VudCkpIHsgLy8gYW5kcm9pZFxuICAgICAgICAgICAgYW5kcm9pZCA9IHRydWU7XG4gICAgICAgICAgICBhTWF0ID0gc0FnZW50LnRvU3RyaW5nKCkubWF0Y2goL2FuZHJvaWQgKFswLTldXFwuWzAtOV0pL2kpO1xuXG4gICAgICAgICAgICBpZiAoYU1hdCAmJiBhTWF0WzFdKSB7XG4gICAgICAgICAgICAgICAgYW5kcm9pZCA9IHBhcnNlRmxvYXQoYU1hdFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYW5kcm9pZDtcbiAgICB9XG5cbiAgICB2YXIgc3ZnRHJhd2VyID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBEcmF3aW5nID0gZnVuY3Rpb24gKGVsLCBodE9wdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fZWwgPSBlbDtcbiAgICAgICAgICAgIHRoaXMuX2h0T3B0aW9uID0gaHRPcHRpb247XG4gICAgICAgIH07XG5cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChvUVJDb2RlKSB7XG4gICAgICAgICAgICB2YXIgX2h0T3B0aW9uID0gdGhpcy5faHRPcHRpb247XG4gICAgICAgICAgICB2YXIgX2VsID0gdGhpcy5fZWw7XG4gICAgICAgICAgICB2YXIgbkNvdW50ID0gb1FSQ29kZS5nZXRNb2R1bGVDb3VudCgpO1xuICAgICAgICAgICAgdmFyIG5XaWR0aCA9IE1hdGguZmxvb3IoX2h0T3B0aW9uLndpZHRoIC8gbkNvdW50KTtcbiAgICAgICAgICAgIHZhciBuSGVpZ2h0ID0gTWF0aC5mbG9vcihfaHRPcHRpb24uaGVpZ2h0IC8gbkNvdW50KTtcblxuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBtYWtlU1ZHKHRhZywgYXR0cnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgdGFnKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrIGluIGF0dHJzKVxuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMuaGFzT3duUHJvcGVydHkoaykpIGVsLnNldEF0dHJpYnV0ZShrLCBhdHRyc1trXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ZnID0gbWFrZVNWRyhcInN2Z1wiICwgeyd2aWV3Qm94JzogJzAgMCAnICsgU3RyaW5nKG5Db3VudCkgKyBcIiBcIiArIFN0cmluZyhuQ291bnQpLCAnd2lkdGgnOiAnMTAwJScsICdoZWlnaHQnOiAnMTAwJScsICdmaWxsJzogX2h0T3B0aW9uLmNvbG9yTGlnaHR9KTtcbiAgICAgICAgICAgIHN2Zy5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCIsIFwieG1sbnM6eGxpbmtcIiwgXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIpO1xuICAgICAgICAgICAgX2VsLmFwcGVuZENoaWxkKHN2Zyk7XG5cbiAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChtYWtlU1ZHKFwicmVjdFwiLCB7XCJmaWxsXCI6IF9odE9wdGlvbi5jb2xvckRhcmssIFwid2lkdGhcIjogXCIxXCIsIFwiaGVpZ2h0XCI6IFwiMVwiLCBcImlkXCI6IFwidGVtcGxhdGVcIn0pKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbkNvdW50OyByb3crKykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG5Db3VudDsgY29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9RUkNvZGUuaXNEYXJrKHJvdywgY29sKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gbWFrZVNWRyhcInVzZVwiLCB7XCJ4XCI6IFN0cmluZyhyb3cpLCBcInlcIjogU3RyaW5nKGNvbCl9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgXCIjdGVtcGxhdGVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgd2hpbGUgKHRoaXMuX2VsLmhhc0NoaWxkTm9kZXMoKSlcbiAgICAgICAgICAgICAgICB0aGlzLl9lbC5yZW1vdmVDaGlsZCh0aGlzLl9lbC5sYXN0Q2hpbGQpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gRHJhd2luZztcbiAgICB9KSgpO1xuXG4gICAgdmFyIHVzZVNWRyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwic3ZnXCI7XG5cbiAgICAvLyBEcmF3aW5nIGluIERPTSBieSB1c2luZyBUYWJsZSB0YWdcbiAgICB2YXIgRHJhd2luZyA9IHVzZVNWRyA/IHN2Z0RyYXdlciA6ICFfaXNTdXBwb3J0Q2FudmFzKCkgPyAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgRHJhd2luZyA9IGZ1bmN0aW9uIChlbCwgaHRPcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuX2VsID0gZWw7XG4gICAgICAgICAgICB0aGlzLl9odE9wdGlvbiA9IGh0T3B0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEcmF3IHRoZSBRUkNvZGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtRUkNvZGV9IG9RUkNvZGVcbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAob1FSQ29kZSkge1xuICAgICAgICAgICAgdmFyIF9odE9wdGlvbiA9IHRoaXMuX2h0T3B0aW9uO1xuICAgICAgICAgICAgdmFyIF9lbCA9IHRoaXMuX2VsO1xuICAgICAgICAgICAgdmFyIG5Db3VudCA9IG9RUkNvZGUuZ2V0TW9kdWxlQ291bnQoKTtcbiAgICAgICAgICAgIHZhciBuV2lkdGggPSBNYXRoLmZsb29yKF9odE9wdGlvbi53aWR0aCAvIG5Db3VudCk7XG4gICAgICAgICAgICB2YXIgbkhlaWdodCA9IE1hdGguZmxvb3IoX2h0T3B0aW9uLmhlaWdodCAvIG5Db3VudCk7XG4gICAgICAgICAgICB2YXIgYUhUTUwgPSBbJzx0YWJsZSBzdHlsZT1cImJvcmRlcjowO2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtcIj4nXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbkNvdW50OyByb3crKykge1xuICAgICAgICAgICAgICAgIGFIVE1MLnB1c2goJzx0cj4nKTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG5Db3VudDsgY29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYUhUTUwucHVzaCgnPHRkIHN0eWxlPVwiYm9yZGVyOjA7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO3BhZGRpbmc6MDttYXJnaW46MDt3aWR0aDonICsgbldpZHRoICsgJ3B4O2hlaWdodDonICsgbkhlaWdodCArICdweDtiYWNrZ3JvdW5kLWNvbG9yOicgKyAob1FSQ29kZS5pc0Rhcmsocm93LCBjb2wpID8gX2h0T3B0aW9uLmNvbG9yRGFyayA6IF9odE9wdGlvbi5jb2xvckxpZ2h0KSArICc7XCI+PC90ZD4nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhSFRNTC5wdXNoKCc8L3RyPicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhSFRNTC5wdXNoKCc8L3RhYmxlPicpO1xuICAgICAgICAgICAgX2VsLmlubmVySFRNTCA9IGFIVE1MLmpvaW4oJycpO1xuXG4gICAgICAgICAgICAvLyBGaXggdGhlIG1hcmdpbiB2YWx1ZXMgYXMgcmVhbCBzaXplLlxuICAgICAgICAgICAgdmFyIGVsVGFibGUgPSBfZWwuY2hpbGROb2Rlc1swXTtcbiAgICAgICAgICAgIHZhciBuTGVmdE1hcmdpblRhYmxlID0gKF9odE9wdGlvbi53aWR0aCAtIGVsVGFibGUub2Zmc2V0V2lkdGgpIC8gMjtcbiAgICAgICAgICAgIHZhciBuVG9wTWFyZ2luVGFibGUgPSAoX2h0T3B0aW9uLmhlaWdodCAtIGVsVGFibGUub2Zmc2V0SGVpZ2h0KSAvIDI7XG5cbiAgICAgICAgICAgIGlmIChuTGVmdE1hcmdpblRhYmxlID4gMCAmJiBuVG9wTWFyZ2luVGFibGUgPiAwKSB7XG4gICAgICAgICAgICAgICAgZWxUYWJsZS5zdHlsZS5tYXJnaW4gPSBuVG9wTWFyZ2luVGFibGUgKyBcInB4IFwiICsgbkxlZnRNYXJnaW5UYWJsZSArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYXIgdGhlIFFSQ29kZVxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9lbC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gRHJhd2luZztcbiAgICB9KSgpIDogKGZ1bmN0aW9uICgpIHsgLy8gRHJhd2luZyBpbiBDYW52YXNcbiAgICAgICAgZnVuY3Rpb24gX29uTWFrZUltYWdlKCkge1xuICAgICAgICAgICAgdGhpcy5fZWxJbWFnZS5zcmMgPSB0aGlzLl9lbENhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7XG4gICAgICAgICAgICB0aGlzLl9lbEltYWdlLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gICAgICAgICAgICB0aGlzLl9lbENhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbmRyb2lkIDIuMSBidWcgd29ya2Fyb3VuZFxuICAgICAgICAvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvYW5kcm9pZC9pc3N1ZXMvZGV0YWlsP2lkPTUxNDFcbiAgICAgICAgaWYgKHRoaXMuX2FuZHJvaWQgJiYgdGhpcy5fYW5kcm9pZCA8PSAyLjEpIHtcbiAgICAgICAgICAgIHZhciBmYWN0b3IgPSAxIC8gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4gICAgICAgICAgICB2YXIgZHJhd0ltYWdlID0gQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5kcmF3SW1hZ2U7XG4gICAgICAgICAgICBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQucHJvdG90eXBlLmRyYXdJbWFnZSA9IGZ1bmN0aW9uIChpbWFnZSwgc3gsIHN5LCBzdywgc2gsIGR4LCBkeSwgZHcsIGRoKSB7XG4gICAgICAgICAgICAgICAgaWYgKChcIm5vZGVOYW1lXCIgaW4gaW1hZ2UpICYmIC9pbWcvaS50ZXN0KGltYWdlLm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gMTsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbaV0gPSBhcmd1bWVudHNbaV0gKiBmYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkdyA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1sxXSAqPSBmYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1syXSAqPSBmYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1szXSAqPSBmYWN0b3I7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1s0XSAqPSBmYWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZHJhd0ltYWdlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIHdoZXRoZXIgdGhlIHVzZXIncyBicm93c2VyIHN1cHBvcnRzIERhdGEgVVJJIG9yIG5vdFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmU3VjY2VzcyBPY2N1cnMgaWYgaXQgc3VwcG9ydHMgRGF0YSBVUklcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZkZhaWwgT2NjdXJzIGlmIGl0IGRvZXNuJ3Qgc3VwcG9ydCBEYXRhIFVSSVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gX3NhZmVTZXREYXRhVVJJKGZTdWNjZXNzLCBmRmFpbCkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc2VsZi5fZkZhaWwgPSBmRmFpbDtcbiAgICAgICAgICAgIHNlbGYuX2ZTdWNjZXNzID0gZlN1Y2Nlc3M7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGl0IGp1c3Qgb25jZVxuICAgICAgICAgICAgaWYgKHNlbGYuX2JTdXBwb3J0RGF0YVVSSSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG4gICAgICAgICAgICAgICAgdmFyIGZPbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2JTdXBwb3J0RGF0YVVSSSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9mRmFpbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2ZGYWlsLmNhbGwoc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBmT25TdWNjZXNzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2JTdXBwb3J0RGF0YVVSSSA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuX2ZTdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9mU3VjY2Vzcy5jYWxsKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGVsLm9uYWJvcnQgPSBmT25FcnJvcjtcbiAgICAgICAgICAgICAgICBlbC5vbmVycm9yID0gZk9uRXJyb3I7XG4gICAgICAgICAgICAgICAgZWwub25sb2FkID0gZk9uU3VjY2VzcztcbiAgICAgICAgICAgICAgICBlbC5zcmMgPSBcImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQVVBQUFBRkNBWUFBQUNOYnlibEFBQUFIRWxFUVZRSTEyUDQvLzgvdzM4R0lBWERJQktFMERIeGdsak5CQUFPOVRYTDBZNE9Id0FBQUFCSlJVNUVya0pnZ2c9PVwiOyAvLyB0aGUgSW1hZ2UgY29udGFpbnMgMXB4IGRhdGEuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxmLl9iU3VwcG9ydERhdGFVUkkgPT09IHRydWUgJiYgc2VsZi5fZlN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9mU3VjY2Vzcy5jYWxsKHNlbGYpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzZWxmLl9iU3VwcG9ydERhdGFVUkkgPT09IGZhbHNlICYmIHNlbGYuX2ZGYWlsKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZkZhaWwuY2FsbChzZWxmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRHJhd2luZyBRUkNvZGUgYnkgdXNpbmcgY2FudmFzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gaHRPcHRpb24gUVJDb2RlIE9wdGlvbnNcbiAgICAgICAgICovXG4gICAgICAgIHZhciBEcmF3aW5nID0gZnVuY3Rpb24gKGVsLCBodE9wdGlvbikge1xuICAgICAgICAgICAgdGhpcy5fYklzUGFpbnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fYW5kcm9pZCA9IF9nZXRBbmRyb2lkKCk7XG5cbiAgICAgICAgICAgIHRoaXMuX2h0T3B0aW9uID0gaHRPcHRpb247XG4gICAgICAgICAgICB0aGlzLl9lbENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG4gICAgICAgICAgICB0aGlzLl9lbENhbnZhcy53aWR0aCA9IGh0T3B0aW9uLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5fZWxDYW52YXMuaGVpZ2h0ID0gaHRPcHRpb24uaGVpZ2h0O1xuICAgICAgICAgICAgZWwuYXBwZW5kQ2hpbGQodGhpcy5fZWxDYW52YXMpO1xuICAgICAgICAgICAgdGhpcy5fZWwgPSBlbDtcbiAgICAgICAgICAgIHRoaXMuX29Db250ZXh0ID0gdGhpcy5fZWxDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgICAgICAgICAgdGhpcy5fYklzUGFpbnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5fZWxJbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG4gICAgICAgICAgICB0aGlzLl9lbEltYWdlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIHRoaXMuX2VsLmFwcGVuZENoaWxkKHRoaXMuX2VsSW1hZ2UpO1xuICAgICAgICAgICAgdGhpcy5fYlN1cHBvcnREYXRhVVJJID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRHJhdyB0aGUgUVJDb2RlXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7UVJDb2RlfSBvUVJDb2RlXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKG9RUkNvZGUpIHtcbiAgICAgICAgICAgIHZhciBfZWxJbWFnZSA9IHRoaXMuX2VsSW1hZ2U7XG4gICAgICAgICAgICB2YXIgX29Db250ZXh0ID0gdGhpcy5fb0NvbnRleHQ7XG4gICAgICAgICAgICB2YXIgX2h0T3B0aW9uID0gdGhpcy5faHRPcHRpb247XG5cbiAgICAgICAgICAgIHZhciBuQ291bnQgPSBvUVJDb2RlLmdldE1vZHVsZUNvdW50KCk7XG4gICAgICAgICAgICB2YXIgbldpZHRoID0gX2h0T3B0aW9uLndpZHRoIC8gbkNvdW50O1xuICAgICAgICAgICAgdmFyIG5IZWlnaHQgPSBfaHRPcHRpb24uaGVpZ2h0IC8gbkNvdW50O1xuICAgICAgICAgICAgdmFyIG5Sb3VuZGVkV2lkdGggPSBNYXRoLnJvdW5kKG5XaWR0aCk7XG4gICAgICAgICAgICB2YXIgblJvdW5kZWRIZWlnaHQgPSBNYXRoLnJvdW5kKG5IZWlnaHQpO1xuXG4gICAgICAgICAgICBfZWxJbWFnZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IG5Db3VudDsgcm93KyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBuQ291bnQ7IGNvbCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiSXNEYXJrID0gb1FSQ29kZS5pc0Rhcmsocm93LCBjb2wpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbkxlZnQgPSBjb2wgKiBuV2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuVG9wID0gcm93ICogbkhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LnN0cm9rZVN0eWxlID0gYklzRGFyayA/IF9odE9wdGlvbi5jb2xvckRhcmsgOiBfaHRPcHRpb24uY29sb3JMaWdodDtcbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5maWxsU3R5bGUgPSBiSXNEYXJrID8gX2h0T3B0aW9uLmNvbG9yRGFyayA6IF9odE9wdGlvbi5jb2xvckxpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQuZmlsbFJlY3QobkxlZnQsIG5Ub3AsIG5XaWR0aCwgbkhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8g7JWI7YuwIOyVqOumrOyWtOyLsSDrsKnsp4Ag7LKY66asXG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5zdHJva2VSZWN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcihuTGVmdCkgKyAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKG5Ub3ApICsgMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgblJvdW5kZWRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Sb3VuZGVkSGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LnN0cm9rZVJlY3QoXG4gICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmNlaWwobkxlZnQpIC0gMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jZWlsKG5Ub3ApIC0gMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgblJvdW5kZWRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Sb3VuZGVkSGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9iSXNQYWludGVkID0gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTWFrZSB0aGUgaW1hZ2UgZnJvbSBDYW52YXMgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgRGF0YSBVUkkuXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5tYWtlSW1hZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fYklzUGFpbnRlZCkge1xuICAgICAgICAgICAgICAgIF9zYWZlU2V0RGF0YVVSSS5jYWxsKHRoaXMsIF9vbk1ha2VJbWFnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybiB3aGV0aGVyIHRoZSBRUkNvZGUgaXMgcGFpbnRlZCBvciBub3RcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmlzUGFpbnRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9iSXNQYWludGVkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDbGVhciB0aGUgUVJDb2RlXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX29Db250ZXh0LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl9lbENhbnZhcy53aWR0aCwgdGhpcy5fZWxDYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgICAgIHRoaXMuX2JJc1BhaW50ZWQgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG5OdW1iZXJcbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLnJvdW5kID0gZnVuY3Rpb24gKG5OdW1iZXIpIHtcbiAgICAgICAgICAgIGlmICghbk51bWJlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBuTnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihuTnVtYmVyICogMTAwMCkgLyAxMDAwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBEcmF3aW5nO1xuICAgIH0pKCk7XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIHR5cGUgYnkgc3RyaW5nIGxlbmd0aFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gc1RleHRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gbkNvcnJlY3RMZXZlbFxuICAgICAqIEByZXR1cm4ge051bWJlcn0gdHlwZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9nZXRUeXBlTnVtYmVyKHNUZXh0LCBuQ29ycmVjdExldmVsKSB7XG4gICAgICAgIHZhciBuVHlwZSA9IDE7XG4gICAgICAgIHZhciBsZW5ndGggPSBfZ2V0VVRGOExlbmd0aChzVGV4dCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IFFSQ29kZUxpbWl0TGVuZ3RoLmxlbmd0aDsgaSA8PSBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIG5MaW1pdCA9IDA7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobkNvcnJlY3RMZXZlbCkge1xuICAgICAgICAgICAgICAgIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5MIDpcbiAgICAgICAgICAgICAgICAgICAgbkxpbWl0ID0gUVJDb2RlTGltaXRMZW5ndGhbaV1bMF07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5NIDpcbiAgICAgICAgICAgICAgICAgICAgbkxpbWl0ID0gUVJDb2RlTGltaXRMZW5ndGhbaV1bMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5RIDpcbiAgICAgICAgICAgICAgICAgICAgbkxpbWl0ID0gUVJDb2RlTGltaXRMZW5ndGhbaV1bMl07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5IIDpcbiAgICAgICAgICAgICAgICAgICAgbkxpbWl0ID0gUVJDb2RlTGltaXRMZW5ndGhbaV1bM107XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobGVuZ3RoIDw9IG5MaW1pdCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuVHlwZSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5UeXBlID4gUVJDb2RlTGltaXRMZW5ndGgubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbG9uZyBkYXRhXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5UeXBlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9nZXRVVEY4TGVuZ3RoKHNUZXh0KSB7XG4gICAgICAgIHZhciByZXBsYWNlZFRleHQgPSBlbmNvZGVVUkkoc1RleHQpLnRvU3RyaW5nKCkucmVwbGFjZSgvXFwlWzAtOWEtZkEtRl17Mn0vZywgJ2EnKTtcbiAgICAgICAgcmV0dXJuIHJlcGxhY2VkVGV4dC5sZW5ndGggKyAocmVwbGFjZWRUZXh0Lmxlbmd0aCAhPSBzVGV4dCA/IDMgOiAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAY2xhc3MgUVJDb2RlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBuZXcgUVJDb2RlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGVzdFwiKSwgXCJodHRwOi8vamluZG8uZGV2Lm5hdmVyLmNvbS9jb2xsaWVcIik7XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHZhciBvUVJDb2RlID0gbmV3IFFSQ29kZShcInRlc3RcIiwge1xuICAgICAqICAgIHRleHQgOiBcImh0dHA6Ly9uYXZlci5jb21cIixcbiAgICAgKiAgICB3aWR0aCA6IDEyOCxcbiAgICAgKiAgICBoZWlnaHQgOiAxMjhcbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIG9RUkNvZGUuY2xlYXIoKTsgLy8gQ2xlYXIgdGhlIFFSQ29kZS5cbiAgICAgKiBvUVJDb2RlLm1ha2VDb2RlKFwiaHR0cDovL21hcC5uYXZlci5jb21cIik7IC8vIFJlLWNyZWF0ZSB0aGUgUVJDb2RlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudHxTdHJpbmd9IGVsIHRhcmdldCBlbGVtZW50IG9yICdpZCcgYXR0cmlidXRlIG9mIGVsZW1lbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSB2T3B0aW9uXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHZPcHRpb24udGV4dCBRUkNvZGUgbGluayBkYXRhXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFt2T3B0aW9uLndpZHRoPTI1Nl1cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ZPcHRpb24uaGVpZ2h0PTI1Nl1cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3ZPcHRpb24uY29sb3JEYXJrPVwiIzAwMDAwMFwiXVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbdk9wdGlvbi5jb2xvckxpZ2h0PVwiI2ZmZmZmZlwiXVxuICAgICAqIEBwYXJhbSB7UVJDb2RlLkNvcnJlY3RMZXZlbH0gW3ZPcHRpb24uY29ycmVjdExldmVsPVFSQ29kZS5Db3JyZWN0TGV2ZWwuSF0gW0x8TXxRfEhdXG4gICAgICovXG4gICAgUVJDb2RlID0gZnVuY3Rpb24gKGVsLCB2T3B0aW9uKSB7XG4gICAgICAgIHRoaXMuX2h0T3B0aW9uID0ge1xuICAgICAgICAgICAgd2lkdGggOiAyNTYsXG4gICAgICAgICAgICBoZWlnaHQgOiAyNTYsXG4gICAgICAgICAgICB0eXBlTnVtYmVyIDogNCxcbiAgICAgICAgICAgIGNvbG9yRGFyayA6IFwiIzAwMDAwMFwiLFxuICAgICAgICAgICAgY29sb3JMaWdodCA6IFwiI2ZmZmZmZlwiLFxuICAgICAgICAgICAgY29ycmVjdExldmVsIDogUVJFcnJvckNvcnJlY3RMZXZlbC5IXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiB2T3B0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdk9wdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB0ZXh0IDogdk9wdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE92ZXJ3cml0ZXMgb3B0aW9uc1xuICAgICAgICBpZiAodk9wdGlvbikge1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB2T3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faHRPcHRpb25baV0gPSB2T3B0aW9uW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBlbCA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX2FuZHJvaWQgPSBfZ2V0QW5kcm9pZCgpO1xuICAgICAgICB0aGlzLl9lbCA9IGVsO1xuICAgICAgICB0aGlzLl9vUVJDb2RlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb0RyYXdpbmcgPSBuZXcgRHJhd2luZyh0aGlzLl9lbCwgdGhpcy5faHRPcHRpb24pO1xuXG4gICAgICAgIGlmICh0aGlzLl9odE9wdGlvbi50ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLm1ha2VDb2RlKHRoaXMuX2h0T3B0aW9uLnRleHQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE1ha2UgdGhlIFFSQ29kZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNUZXh0IGxpbmsgZGF0YVxuICAgICAqL1xuICAgIFFSQ29kZS5wcm90b3R5cGUubWFrZUNvZGUgPSBmdW5jdGlvbiAoc1RleHQpIHtcbiAgICAgICAgdGhpcy5fb1FSQ29kZSA9IG5ldyBRUkNvZGVNb2RlbChfZ2V0VHlwZU51bWJlcihzVGV4dCwgdGhpcy5faHRPcHRpb24uY29ycmVjdExldmVsKSwgdGhpcy5faHRPcHRpb24uY29ycmVjdExldmVsKTtcbiAgICAgICAgdGhpcy5fb1FSQ29kZS5hZGREYXRhKHNUZXh0KTtcbiAgICAgICAgdGhpcy5fb1FSQ29kZS5tYWtlKCk7XG4gICAgICAgIHRoaXMuX2VsLnRpdGxlID0gc1RleHQ7XG4gICAgICAgIHRoaXMuX29EcmF3aW5nLmRyYXcodGhpcy5fb1FSQ29kZSk7XG4gICAgICAgIHRoaXMubWFrZUltYWdlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE1ha2UgdGhlIEltYWdlIGZyb20gQ2FudmFzIGVsZW1lbnRcbiAgICAgKiAtIEl0IG9jY3VycyBhdXRvbWF0aWNhbGx5XG4gICAgICogLSBBbmRyb2lkIGJlbG93IDMgZG9lc24ndCBzdXBwb3J0IERhdGEtVVJJIHNwZWMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIFFSQ29kZS5wcm90b3R5cGUubWFrZUltYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX29EcmF3aW5nLm1ha2VJbWFnZSA9PSBcImZ1bmN0aW9uXCIgJiYgKCF0aGlzLl9hbmRyb2lkIHx8IHRoaXMuX2FuZHJvaWQgPj0gMykpIHtcbiAgICAgICAgICAgIHRoaXMuX29EcmF3aW5nLm1ha2VJbWFnZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENsZWFyIHRoZSBRUkNvZGVcbiAgICAgKi9cbiAgICBRUkNvZGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9vRHJhd2luZy5jbGVhcigpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBRUkNvZGUuQ29ycmVjdExldmVsXG4gICAgICovXG4gICAgUVJDb2RlLkNvcnJlY3RMZXZlbCA9IFFSRXJyb3JDb3JyZWN0TGV2ZWw7XG59KSgpO1xuXG5leHBvcnRzLlFSQ29kZSA9IFFSQ29kZTtcblxuIl19
(1)
});
