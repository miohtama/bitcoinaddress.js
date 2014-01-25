var sauceUser = "miohtama";
var sauceKey = "66876d39-aa00-4ddb-9e94-1a8a9f464532";

var Runner = require('sauce-tap-runner'),
    browserify = require('browserify'),
    async = require('async');


//var b = browserify();
//b.add("./test.js");

var tests = new Runner(sauceUser, sauceKey),
    // Browserify is not required, can use either a string or stream of JS code
    src = browserify().add('./test.js').bundle();

async.series([run('chrome'), run('firefox')], closeTests);

function run(browser) {
    // Return a function that when called will run tests in the specified
    // browser

    return function(callback) {
        tests.run(src, { browserName: browser }, function(err, results) {
            if (err) {
                return callback(err);
            }

            console.log(results);
            callback();
        });
    };
}

function closeTests(err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Tests completed');
    }

    tests.close(function() {
        // Runner is closed
    });
}