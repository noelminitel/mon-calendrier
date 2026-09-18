//////////////////////////////////////////////////////////////////////

function AuthAccount()
{
    // initialise
    this.authClientID = typeof g_client_id !== 'undefined' ? g_client_id : undefined;
    this.authScope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata';

    // public
    this.onSignIn = function(){};
    this.onSignOut = function(){};
    this.onError = function(msg){};

    // private
    this.tokenClient = null;
    this.access_token = null;
    this.userEmail = null;
}

AuthAccount.prototype.Connect = function()
{
    if (this.tokenClient)
        return;

    // Si le client_id n'est pas encore défini globalement, on réessaie plus tard
    if (!this.authClientID && typeof g_client_id !== 'undefined') {
        this.authClientID = g_client_id;
    }

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2 || !this.authClientID) {
        setTimeout(this.Connect.bind(this), 500);
        return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.authClientID,
        scope: this.authScope,
        callback: (response) => {
            if (response.error) {
                this.Fail(response);
                return;
            }
            this.access_token = response.access_token;
            
            // Injecte le token directement dans gapi.client pour que gapi.client.request fonctionne
            if (typeof gapi !== 'undefined' && gapi.client) {
                gapi.client.setToken({ access_token: this.access_token });
            }
            
            // Récupère l'email de l'utilisateur via l'API UserInfo
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: 'Bearer ' + this.access_token }
            })
            .then(res => res.json())
            .then(data => {
                this.userEmail = data.email;
                this.onSignIn();
            })
            .catch(() => {
                this.onSignIn();
            });
        },
    });

    // Déclenche l'état déconnecté au départ
    this.onSignOut();
}

AuthAccount.prototype.SignIn = function()
{
    if (this.tokenClient) {
        // Demande un token (ouvre la popup de connexion Google)
        this.tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        console.error("AuthAccount : tokenClient n'est pas initialisé (client_id manquant ?)");
    }
}

AuthAccount.prototype.SignOut = function()
{
    if (this.access_token) {
        google.accounts.oauth2.revoke(this.access_token, () => {});
    }
    this.access_token = null;
    this.userEmail = null;
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(null);
    }
    this.onSignOut();
}

AuthAccount.prototype.isSignedIn = function()
{
    return (this.access_token !== null && this.access_token !== undefined);
}

AuthAccount.prototype.getEmail = function()
{
    return this.userEmail;
}

AuthAccount.prototype.Fail = function(reason)
{
    var msg = "";
    if (reason.error)
    {
        msg = "[" + reason.error + "]";
        if (reason.message)
            msg += " " + reason.message;
    }
    else {
        msg = JSON.stringify(reason);
    }

    console.error("AuthAccount : " + msg);
    this.onError(msg);
}
