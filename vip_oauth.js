//////////////////////////////////////////////////////////////////////
// AuthAccount - Version 100% Google Identity Services (GIS)
//////////////////////////////////////////////////////////////////////

function AuthAccount() {
    this.authClientID = undefined;
    this.authScope = undefined;

    this.onSignIn = function(){};
    this.onSignOut = function(){};
    this.onError = function(msg){};

    this.tokenClient = null;
    this.access_token = null;
    this.userEmail = null;
    this._isSignedIn = false;
}

AuthAccount.prototype.Connect = function() {
    var self = this;

    // 1. Charger uniquement le client gapi (sans auth2)
    gapi.load('client', function() {
        gapi.client.init({}).then(function() {
            // 2. Initialiser le Token Client Google Identity Services
            if (typeof google !== 'undefined' && google.accounts) {
                self.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: self.authClientID,
                    scope: self.authScope,
                    callback: function(tokenResponse) {
                        if (tokenResponse.error !== undefined) {
                            self.Fail(tokenResponse);
                            return;
                        }
                        self.access_token = tokenResponse.access_token;
                        gapi.client.setToken({ access_token: self.access_token });
                        self._isSignedIn = true;
                        
                        self.fetchUserEmail();
                    }
                });
            } else {
                self.onError("Google Identity Services script non chargé.");
            }
        }).catch(function(err) {
            self.Fail(err);
        });
    });
}

AuthAccount.prototype.fetchUserEmail = function() {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.googleapis.com/oauth2/v3/userinfo');
    xhr.setRequestHeader('Authorization', 'Bearer ' + this.access_token);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var userInfo = JSON.parse(xhr.responseText);
            self.userEmail = userInfo.email;
        }
        self.onSignIn();
    };
    xhr.onerror = function() {
        self.onSignIn();
    };
    xhr.send();
}

AuthAccount.prototype.SignIn = function() {
    if (this.tokenClient) {
        // Déclenche la fenêtre pop-up de connexion Google
        this.tokenClient.requestAccessToken({prompt: 'select_account'});
    } else {
        this.onError("Le client d'authentification n'est pas initialisé.");
    }
}

AuthAccount.prototype.SignOut = function() {
    if (this.access_token && typeof google !== 'undefined') {
        google.accounts.oauth2.revoke(this.access_token, function() {
            console.log('Token révoqué');
        });
    }
    this.access_token = null;
    this.userEmail = null;
    this._isSignedIn = false;
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(null);
    }
    this.onSignOut();
}

AuthAccount.prototype.isSignedIn = function() {
    return this._isSignedIn && (this.access_token !== null);
}

AuthAccount.prototype.getEmail = function() {
    return this.userEmail || "Compte Google Connecté";
}

AuthAccount.prototype.Fail = function(reason) {
    var msg = "";
    if (reason && reason.error) {
        msg = "[" + reason.error + "]";
        if (reason.message) msg += " " + reason.message;
        else if (reason.details) msg += " " + reason.details;
    } else if (typeof reason === 'string') {
        msg = reason;
    } else {
        msg = "Erreur d'authentification";
    }
    console.error("AuthAccount Error : ", reason);
    this.onError(msg);
}


//////////////////////////////////////////////////////////////////////
// AuthAppData & AuthCal (Inchangés)
//////////////////////////////////////////////////////////////////////
// (Conserve le reste de ton fichier d'origine pour AuthAppData et AuthCal)
