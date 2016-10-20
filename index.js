/*global console, require, process */
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

function googleOauthManager(mainSpecs) {
    "use strict";
    var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
    var scopes;
    var secretsFile;
    var credentialsFile;

    function storeToken(token) {

        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_DIR + credentialsFile, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_DIR + credentialsFile);
    }

    function getNewToken(credentials) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });

        return new Promise(function (resolve, reject) {
            console.log('Authorize this app by visiting this url: ', authUrl);
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter the code from that page here: ', function (code) {
                rl.close();
                oauth2Client.getToken(code, function (err, token) {
                    if (err) {
                        reject("Error while trying to retrieve access token", err);
                        return;
                    }
                    oauth2Client.credentials = token;
                    storeToken(token);
                    resolve(oauth2Client);
                });
            });
        });
    }

    function getTokenFromFile(credentialsFile) {
        return new Promise(function (resolve) {
            fs.readFile(TOKEN_DIR + credentialsFile, function (err, token) {
                if (err) {
                    resolve();
                } else {
                    resolve(JSON.parse(token));
                }
            });
        });
    }

    function loadSecretsFromFile(secretsFile) {
        return new Promise(function (resolve, reject) {
            try {
                fs.readFile(secretsFile, function (err, content) {
                    if (err) {
                        reject("Error loading client secret file: " + err);
                        return;
                    }
                    resolve(JSON.parse(content));
                    return;
                });
            } catch (e) {
                reject("Error loading client secret file: " + e);
            }
        });
    }

    function getAuthorisation() {
        return new Promise(function (resolve, reject) {
            getTokenFromFile(credentialsFile)
                .then(function (response) {
                    if (response) {
                        console.log("found file");
                        resolve(response);
                    }
                    loadSecretsFromFile(secretsFile)
                        .then(getNewToken);
                })
                .catch(reject);
        });
    }

    secretsFile = mainSpecs.secretsFile;
    credentialsFile = mainSpecs.credentialsFile;
    scopes = mainSpecs.scopes;

    return {
        getAuthorisation: getAuthorisation
    };
}

module.exports = googleOauthManager;