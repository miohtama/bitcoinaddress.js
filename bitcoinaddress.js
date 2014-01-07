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
            tmpl = tmpl.concat(["amount=", amount, "&"]);
        }

        if(label) {
            tmpl = tmpl.concat(["label=", label, "&"]);
        }

        if(message) {
            tmpl = tmpl.concat(["message=", message, "&"]);
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

        var $this = $(this);
        var elem = template.clone();

        this.buildControls(elem, target);
        target.replaceWith(elem);

        // Make sure we are visible
        // (HTML5 way, CSS way)
        elem.removeAttr("hidden id");
        elem.show();

    },

    /**
     * Create user interface for all bitcoin addresses on the page.
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
            self.applyTemplate($(this), template);
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
