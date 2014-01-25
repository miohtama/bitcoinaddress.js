/**
 * tape tests for the bitcoinaddress.js.
 *
 * Check that our library loads and works with all browsers using testling.
 *
 * http://www.catonmat.net/blog/writing-javascript-tests-with-tape/
 */

/* jshint globalstrict:true */
/* globals require, __dirname, window, console */

"use strict";

var test = require("tape");
var $ = require("jquery1-browser");
var bitcoinaddress = require("./bitcoinaddress");

// Load test payload HTML from an external file using brfs complile
// time transformation
// http://stackoverflow.com/a/16951238/315168
var fs = require('fs');
var TEST_HTML = fs.readFileSync(__dirname + '/test-payload.html');

/**
 * Initialize bitcoinaddress
 */
function init() {

    // Basic initialization
    bitcoinaddress.init({
        selector: ".bitcoin-address",
        template: "bitcoin-address-template",
        jQuery: $
    });
}

// Don't execute tests until we have document ready
$(function() {

    /** Make sure we can actually load test.html */
    test("Load HTML", function(t) {
        $(document.body).append(TEST_HTML);

        // Check that the test payload is loaded
        t.equal($("#test-address").size(), 1);
        t.equal($("#bitcoin-address-template").size(), 1);

        // Initialize bitcoinaddress module
        init();

        // Now #test-address should be transformed
        var actions = $("#test-address .bitcoin-address-action");
        t.equal(actions.size(), 3);

        t.end();
    });

});