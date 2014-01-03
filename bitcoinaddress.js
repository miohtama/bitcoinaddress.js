/**
 * bitcoinaddress.js
 *
 * Bitcoin address and payment helper.
 *
 * Copyright 2013 Mikko Ohtamaa http://opensourcehacker.com
 *
 * Licensed under MIT license.
 */

(function($) {

    "use strict";

    var bitcoinaddress = {

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
            elem.find(".bitcoin-address").text(source.attr("data-bc-address"));

            // Build BTC URL
            var url = this.buildBitcoinURI(source.attr("data-bc-address"),
                source.attr("data-bc-amount"),
                source.attr("data-bc-label"),
                source.attr("data-bc-message"));

            elem.find(".bitcoin-address-action-send").attr("href", url);
        },

        /**
         * Create HTML for address actions.
         */
        applyTemplate : function(templateId) {
            var self = this;
            var template = document.getElementById(templateId);

            if(!template) {
                throw new Error("Bitcoin address template element missing:" + templateId);
            }

            template = $(template);

            $(this.config.selector).each(function() {
                var $this = $(this);
                var elem = template.clone();
                elem.removeAttr("hidden id");
                self.buildControls(elem, $this);
                $this.replaceWith(elem);
            });
        },

        /**
         * Prepare selection in .bitcoin-address-container for copy paste
         */
        prepareCopySelection : function(elem) {
            var addy = elem.find(".bitcoin-address");
            window.getSelection().selectAllChildren(addy.get(0));
            elem.find(".bitcoin-address-copy-hint").slideDown();
        },

        /**
         * Copy action handler.
         */
        onActionCopy : function(e) {
            var elem = $(e.target).parent(".bitcoin-address-container");
            this.prepareCopySelection(elem);
        },

        onClick : function(e) {
            var elem = $(e.target).parent(".bitcoin-address-container");
            this.prepareCopySelection(elem);
        },

        initUX : function() {
            var self = this;

            $(document.body).on("click", ".bitcoin-address-action-copy", $.proxy(this.onActionCopy, this));
            $(document.body).on("click", ".bitcoin-address", $.proxy(this.onClick, this));

            // Hide any copy hints when user presses CTRL+C
            // on any part of the page
            $(document.body).on("copy", function() {
                $(".bitcoin-address-copy-hint").slideUp();
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
            this.applyTemplate(this.config.template);
            this.initUX();
        }
    };

    // export
    window.bitcoinaddress = bitcoinaddress;

})(jQuery);