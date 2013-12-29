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
         * Create HTML for address actions.
         */
        createAddressActions : function() {
            $(config.selector)
        },

        /**
         * Call to initialize the detault bitcoinprices UI.
         */
        init : function(_config) {

            var self = this;
            this.config = _config;
            this.createAddressActions();
        }
    };

    // export
    window.bitcoinaddress = bitcoinaddress;

})(jQuery);