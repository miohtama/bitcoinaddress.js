BIN=node_modules/.bin

# Which files (.js, .min.js. debug.js) browserify generates
BUNDLE_BASE=dist/bitcoinaddress-bundle

all: clean test distribution site

# What we need to test and build distro
setup:
	npm install .

clean:
	rm dist/* > /dev/nul

# Build QRCode + bitcoinaddress combo to UMD boilerplate.
# Debug version comes with source maps.
# https://github.com/umdjs/umd
bundle:
	$(BIN)/browserify --standalone bitcoinaddress --debug bitcoinaddress.js --outfile $(BUNDLE_BASE).debug.js
	$(BIN)/browserify --standalone bitcoinaddress --debug bitcoinaddress.js --outfile $(BUNDLE_BASE).js

# Run a development server which automatically rebuilds bundle when .js files are changed
dev-server:
	$(BIN)/beefy --live demo.js:dist/demo.js 8000 -- --debug

# Run a development server for unit tests
# Generates new test bundle js file,
# serves dummy HTML wrapper test-local.html which can be opened
# locally in a browser.
# We also pass in brfs transformation which allows reading
# local files on the compilation time.
test-server:
	echo "Visit http://localhost:8000/test-local.html"
	$(BIN)/beefy --live test.js:dist/test-bundle.js 8000 -- --debug -t brfs

# XXX: Broken
test:
	$(BIN)/tape test.js

# Builds bundle and builds minified version
distribution: bundle
	$(BIN)/uglifyjs $(BUNDLE_BASE).js > $(BUNDLE_BASE).min.js
	$(BIN)/browserify demo.js --outfile dist/demo.js


# Publish an NPM package
publish:
	echo "Just run $(BIN)/npm-release <newversion>"

# Update the Github website
# Make sure you don't have uncommited changes
site: distribution
	git add dist/*
	git commit -m "Updating the demo site"
	git push origin master:gh-pages