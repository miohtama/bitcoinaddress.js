.. contents:: :local:

Introduction
---------------

**bitcoinaddress.js** is a a JavaScript component library for making easy bitcoin payments, sending bitcoins and presenting bitcoin addresses on HTML pages.

.. image:: https://ci.testling.com/miohtama/bitcoinaddress.js.png
    :target: http://ci.testling.com/miohtama/bitcoinaddress.js

Features
---------

* Use `bitcoin: URI protocol <https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki>`_ to make payments from your desktop, web or mobile bitcoin wallet

* Generate QR codes in-fly with JavaScript to make payments from mobile applications

* Copy bitcoin address to the clipboard

* Customize and extend easily with custom DOM templates and JavaScript hooks

Demos
------

`Demo <http://miohtama.github.com/bitcoinaddress/index.html>`_.

Installation
-------------

No server-side components needed.

You must have `jQuery <http://jquery.com>`_ (version 1.9 or later) installed.

Put ``bitcoinaddress.js`` in your application.

How it works
-----------------

* Include ``bitcoinaddress.js`` on your HTML page

* Configure and initialize it with a ``<script>`` tag

* Supply a client-side template in a hidden `<div>` on your page

* When the HTML page has been loaded, ``bitcoinaddress.init()`` scans for ``.bitcoin-address`` CSS classes,
  applies template on them and sets up UI event handlers

Setting up ``<script>`` tag::

    <script src="bitcoinaddress-bundle.min.js"></script>
    <script>
        $(document).ready(function() {
            bitcoinaddress.init({

                // jQuery selector defining bitcon addresses on the page
                // needing the boost
                selector: ".bitcoin-address",

                // Id of the DOM template element we use to decorate the addresses.
                // This must contain placefolder .bitcoin-address
                template: "bitcoin-address-template",

                // Passed directly to QRCode.js
                // https://github.com/davidshimjs/qrcodejs
                qr : {
                    width: 128,
                    height: 128,
                    colorDark : "#000000",
                    colorLight : "#ffffff"
                }
            });
        });
    </script>

Supported data attributes
+++++++++++++++++++++++++++

The following HTML5 data attributes are supported on ``.bitcoin-address`` elements

* ``data-bc-address`` - bitcoin address for programmatical manipulation, **required**

* ``data-bc-amount`` - suggestion how much to send

* ``data-bc-label`` - address label in the wallet

* ``data-bc-message`` - transaction message

Other
------

`See also bitcoin-prices.js JavaScript project for presenting Bitcoin prices in human-friendly manner and alternative currencies like USD and EUR <https://github.com/miohtama/bitcoin-prices>`_.

`Bitcoin URL scheme explained <http://bitcoin.stackexchange.com/questions/4987/bitcoin-url-scheme>`_.

`Bitcoin URIs in Electrum <https://electrum.org/bitcoin_URIs.html>`_.

`QRCode.js - generate QR codes in JavaScript <https://github.com/davidshimjs/qrcodejs>`_ by `Shim Sangmin <https://github.com/davidshimjs>`_.

Development
-------------

NPM + Node required.

`browserify <https://github.com/substack/node-browserify>`_ used for client-side module imports.
`testling <http://testling.com/>`_ provides continuous integration services for various browsers.

Install dependencies locally::

    make setup

Run the development server with auto-reload (save ``bitcoinaddress.js`` in your text editor and the browser will reload ``index.html``)::

    make dev-server

Run unit tests locally::

    make test-server

Make a release::

    ---

Internals and the development toolchain
-------------------------------------------

jQuery is used for DOM interaction. jQuery is not bundled and there are not `require` dependencies to it, so that it is easier to load from CDN.

This package uses NPM, `browserify for JavaScript dependencies <http://browserify.org/>`_, `beefy development server <https://github.com/chrisdickinson/beefy>`_,
`uglify-fs <http://lisperator.net/uglifyjs/>`_ JavaScript minimizer.

`tape <https://github.com/substack/tape>`_ unit testing framework is used.

Check out ``Makefile`` if you want to learn how to use these tools.

Author
------

Mikko Ohtamaa (`blog <https://opensourcehacker.com>`_, `Facebook <https://www.facebook.com/?q=#/pages/Open-Source-Hacker/181710458567630>`_, `Twitter <https://twitter.com/moo9000>`_, `Google+ <https://plus.google.com/u/0/103323677227728078543/>`_)

Contact for work and consulting offers.



