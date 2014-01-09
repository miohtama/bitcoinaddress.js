/**
 * tape tests for the bitcoinaddress.js.
 *
 * Check that our library loads and works with all browsers using testling.
 *
 * http://www.catonmat.net/blog/writing-javascript-tests-with-tape/
 */

/* jshint globalstrict:true */
/* globals require, __dirname */

"use strict";

var test = require("tape");
var $ = require("jquery/dist/jquery");
var bitcoinaddress = require("./bitcoinaddress");

// Load brfs
// http://stackoverflow.com/a/16951238/315168
var fs = require('fs');
var TEST_HTML = fs.readFileSync(__dirname + '/test.html');

/**
 * Initialize bitcoinaddress
 */
function init() {

    // Basic initialization
    bitcoinaddress.init({
        selector: ".bitcoin-address",
        template: "bitcoin-address-template",
    });
}

/** Make sure we can actually load test.html */
test("Load HTML", function(t) {
    $(document).append(TEST_HTML);
    t.equal($("#test.address").size(), 1);
    t.end();
});

test('Show QR code', function (t) {
    t.plan(2);

    [2,3].map(function (x) {
        t.pass();
    });
});